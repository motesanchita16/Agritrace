import rateLimit, { type RateLimitExceededEventHandler } from 'express-rate-limit';
import type { Env } from '../config/env';
import { Errors } from '../lib/errors';

const handler: RateLimitExceededEventHandler = (_req, _res, next) => next(Errors.tooManyRequests());

export const createRateLimiter = (c: Pick<Env, 'RATE_LIMIT_WINDOW_MS' | 'RATE_LIMIT_MAX'>) =>
  rateLimit({
    windowMs: c.RATE_LIMIT_WINDOW_MS,
    limit: c.RATE_LIMIT_MAX,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler,
  });

/** Tighter limiter for credential and public-lookup endpoints (applied when those modules are added). */
export const createStrictLimiter = (windowMs = 15 * 60 * 1000, limit = 10) =>
  rateLimit({ windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false, handler });
