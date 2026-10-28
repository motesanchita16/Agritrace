import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

const SAFE_ID = /^[A-Za-z0-9_-]{8,64}$/;

/** Accepts a well-formed client X-Correlation-Id, otherwise generates one. Echoed on every response. */
export const correlationId: RequestHandler = (req, res, next) => {
  const incoming = req.header('x-correlation-id');
  req.correlationId = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader('X-Correlation-Id', req.correlationId);
  next();
};
