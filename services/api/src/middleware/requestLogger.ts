import type { Request, RequestHandler } from 'express';
import pinoHttp from 'pino-http';
import type { Logger } from '../lib/logger';

export function requestLogger(logger: Logger): RequestHandler {
  return pinoHttp({
    logger,
    genReqId: (req) => (req as Request).correlationId,
    customProps: (req) => ({ correlationId: (req as Request).correlationId }),
    customLogLevel: (_req, res, err) =>
      err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
  });
}
