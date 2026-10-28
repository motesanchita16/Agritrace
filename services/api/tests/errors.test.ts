import { Router } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { Errors } from '../src/lib/errors';
import { makeApp } from './helpers';

const boom = Router();
boom.get('/boom', () => {
  throw new Error('secret db password leaked');
});
boom.get('/forbidden', (_req, _res, next) => next(Errors.forbidden()));
boom.get('/prisma-dup', (_req, _res, next) =>
  next(
    Object.assign(new Error('Unique constraint failed on the fields: (`email`)'), {
      name: 'PrismaClientKnownRequestError',
      code: 'P2002',
    }),
  ),
);

describe('error handling', () => {
  const app = makeApp({ routers: [boom] });

  it('returns a structured 404 for unknown routes, matching the correlation header', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.correlationId).toBe(res.headers['x-correlation-id']);
  });

  it('returns 400 INVALID_JSON for malformed bodies', async () => {
    const res = await request(app)
      .post('/api/v1/anything')
      .set('Content-Type', 'application/json')
      .send('{"a":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('returns 413 for oversized bodies', async () => {
    const res = await request(app)
      .post('/api/v1/anything')
      .send({ blob: 'x'.repeat(200_000) });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('hides internal error details behind a generic 500', async () => {
    const res = await request(app).get('/api/v1/boom');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toContain('secret');
  });

  it('maps AppError to its status and code', async () => {
    const res = await request(app).get('/api/v1/forbidden');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('maps Prisma unique violations to 409 without leaking field names', async () => {
    const res = await request(app).get('/api/v1/prisma-dup');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(JSON.stringify(res.body)).not.toContain('email');
  });
});

describe('request context and security', () => {
  const app = makeApp();

  it('echoes a well-formed client correlation id and replaces a malformed one', async () => {
    const ok = await request(app).get('/api/v1/health').set('X-Correlation-Id', 'client-id-12345');
    expect(ok.headers['x-correlation-id']).toBe('client-id-12345');
    const bad = await request(app)
      .get('/api/v1/health')
      .set('X-Correlation-Id', 'bad id with spaces <script>');
    expect(bad.headers['x-correlation-id']).not.toContain('script');
  });

  it('sets safe headers and hides x-powered-by', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('allows the configured CORS origin only', async () => {
    const allowed = await request(app).get('/api/v1/health').set('Origin', 'http://localhost:5173');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const denied = await request(app).get('/api/v1/health').set('Origin', 'https://evil.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('rate-limits with a structured 429', async () => {
    const limited = makeApp({ config: { RATE_LIMIT_MAX: 2 } });
    await request(limited).get('/api/v1/health');
    await request(limited).get('/api/v1/health');
    const res = await request(limited).get('/api/v1/health');
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });
});
