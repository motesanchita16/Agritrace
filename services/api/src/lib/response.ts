import type { Response } from 'express';

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Success envelope: `{ data, meta? }`. Errors use `{ error: { code, message, details?, correlationId } }`. */
export function sendData<T>(res: Response, data: T, status = 200, meta?: PageMeta): Response {
  return res.status(status).json(meta ? { data, meta } : { data });
}
