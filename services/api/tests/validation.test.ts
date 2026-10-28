import { Router } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  buildMeta,
  csvEnum,
  paginationSchema,
  parseSort,
  pickDefined,
  toSkipTake,
} from '../src/lib/pagination';
import { sendData } from '../src/lib/response';
import { getQuery, validate } from '../src/middleware/validate';
import { makeApp } from './helpers';

const bodySchema = z.object({
  crop: z.string().min(1),
  quantityGrams: z.number().int().positive(),
});
const listQuery = paginationSchema.extend({ status: csvEnum(['ACTIVE', 'CONSUMED']).optional() });

const r = Router();
r.post('/echo', validate({ body: bodySchema }), (req, res) => {
  sendData(res, req.body, 201);
});
r.get('/list', validate({ query: listQuery }), (req, res) => {
  const q = getQuery<z.infer<typeof listQuery>>(req);
  sendData(res, { q, ...toSkipTake(q) }, 200, buildMeta(q, 45));
});
const app = makeApp({ routers: [r] });

describe('request validation', () => {
  it('rejects invalid bodies with field paths and without echoing values', async () => {
    const res = await request(app).post('/api/v1/echo').send({ crop: '', quantityGrams: -5 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const paths = res.body.error.details.map((d: { path: string }) => d.path).sort();
    expect(paths).toEqual(['crop', 'quantityGrams']);
    expect(JSON.stringify(res.body)).not.toContain('-5');
  });

  it('rejects fractional grams (integer-only quantities)', async () => {
    const res = await request(app)
      .post('/api/v1/echo')
      .send({ crop: 'Tomato', quantityGrams: 10.5 });
    expect(res.status).toBe(400);
  });

  it('accepts a valid body with 201', async () => {
    const res = await request(app)
      .post('/api/v1/echo')
      .send({ crop: 'Tomato', quantityGrams: 1000 });
    expect(res.status).toBe(201);
    expect(res.body.data.quantityGrams).toBe(1000);
  });

  it('applies pagination defaults and returns meta', async () => {
    const res = await request(app).get('/api/v1/list');
    expect(res.status).toBe(200);
    expect(res.body.data.q).toMatchObject({ page: 1, pageSize: 20 });
    expect(res.body.meta).toEqual({ page: 1, pageSize: 20, total: 45, totalPages: 3 });
  });

  it('rejects out-of-range page size and unknown filter values', async () => {
    expect((await request(app).get('/api/v1/list?pageSize=1000')).status).toBe(400);
    expect((await request(app).get('/api/v1/list?status=HACKED')).status).toBe(400);
  });

  it('parses comma-separated filters', async () => {
    const res = await request(app).get('/api/v1/list?status=ACTIVE,CONSUMED');
    expect(res.body.data.q.status).toEqual(['ACTIVE', 'CONSUMED']);
  });
});

describe('pagination utilities', () => {
  it('computes skip/take and total pages', () => {
    expect(toSkipTake({ page: 3, pageSize: 20 })).toEqual({ skip: 40, take: 20 });
    expect(buildMeta({ page: 1, pageSize: 20 }, 0).totalPages).toBe(1);
  });
  it('only allows sorting on allow-listed fields', () => {
    const allowed = ['createdAt', 'cropType'] as const;
    const fb = { field: 'createdAt', direction: 'desc' } as const;
    expect(parseSort(undefined, allowed, fb)).toEqual(fb);
    expect(parseSort('cropType:asc', allowed, fb)).toEqual({ field: 'cropType', direction: 'asc' });
    expect(() => parseSort('passwordHash', allowed, fb)).toThrow();
    expect(() => parseSort('cropType:sideways', allowed, fb)).toThrow();
  });
  it('pickDefined drops undefined filters', () => {
    expect(pickDefined({ a: 1, b: undefined })).toEqual({ a: 1 });
  });
});
