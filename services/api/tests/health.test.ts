import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { dbDown, makeApp } from './helpers';

describe('health endpoints', () => {
  it('GET /api/v1/health returns liveness with a correlation id', async () => {
    const res = await request(makeApp()).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.service).toBe('agritrace-api');
    expect(res.headers['x-correlation-id']).toBeTruthy();
  });

  it('GET /api/v1/health/ready reports database up and blockchain as unchecked', async () => {
    const res = await request(makeApp()).get('/api/v1/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.data.checks.database).toBe('up');
    expect(res.body.data.checks.blockchain).toEqual({ mode: 'disabled', checked: false });
  });

  it('returns 503 and does not leak the underlying error when the database is down', async () => {
    const res = await request(makeApp({ db: dbDown })).get('/api/v1/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.data.status).toBe('degraded');
    expect(res.body.data.checks.database).toBe('down');
    expect(JSON.stringify(res.body)).not.toContain('secret-host');
  });
});
