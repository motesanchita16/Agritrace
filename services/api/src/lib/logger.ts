import pino, { type Logger } from 'pino';
import type { Env } from '../config/env';

export type { Logger };

export function createLogger(config: Pick<Env, 'LOG_LEVEL' | 'NODE_ENV'>): Logger {
  return pino({
    level: config.NODE_ENV === 'test' && config.LOG_LEVEL === 'info' ? 'silent' : config.LOG_LEVEL,
    redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
  });
}
