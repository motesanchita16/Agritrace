import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError, Errors } from '../lib/errors';
import type { Logger } from '../lib/logger';

interface HttpError {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

const hasProp = (e: unknown, k: string): e is Record<string, unknown> =>
  typeof e === 'object' && e !== null && k in e;

function toHttpError(err: unknown): HttpError {
  if (err instanceof ZodError) {
    // Report paths and messages only; never echo submitted values.
    const details = err.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
      code: i.code,
    }));
    return { status: 400, code: 'VALIDATION_ERROR', message: 'Request validation failed', details };
  }
  if (err instanceof AppError)
    return { status: err.status, code: err.code, message: err.message, details: err.details };

  if (hasProp(err, 'type')) {
    if (err.type === 'entity.parse.failed')
      return { status: 400, code: 'INVALID_JSON', message: 'Request body is not valid JSON' };
    if (err.type === 'entity.too.large')
      return { status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' };
  }
  if (hasProp(err, 'name')) {
    if (err.name === 'PrismaClientKnownRequestError') {
      if (err.code === 'P2002')
        return {
          status: 409,
          code: 'CONFLICT',
          message: 'A record with these values already exists',
        };
      if (err.code === 'P2025')
        return { status: 404, code: 'NOT_FOUND', message: 'Resource not found' };
      if (err.code === 'P2003')
        return {
          status: 409,
          code: 'CONFLICT',
          message: 'The request conflicts with related records',
        };
    }
    if (err.name === 'PrismaClientInitializationError') {
      return {
        status: 503,
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database is temporarily unavailable',
      };
    }
  }
  return { status: 500, code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' };
}

export const notFoundHandler: RequestHandler = (_req, _res, next) =>
  next(Errors.notFound('Route not found'));

export const errorHandler =
  (logger: Logger): ErrorRequestHandler =>
  (err, req, res, next) => {
    if (res.headersSent) return next(err);
    const http = toHttpError(err);
    if (http.status >= 500)
      logger.error({ err, correlationId: req.correlationId }, 'unhandled error');
    res.status(http.status).json({
      error: {
        code: http.code,
        message: http.message,
        ...(http.details !== undefined && { details: http.details }),
        correlationId: req.correlationId,
      },
    });
  };
