import cors from 'cors';
import express, { type Express, type Router } from 'express';
import helmet from 'helmet';
import type { PrismaClient } from '@prisma/client';
import type { Env } from './config/env';
import { createLogger, type Logger } from './lib/logger';
import { correlationId } from './middleware/correlationId';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { createRateLimiter } from './middleware/rateLimit';
import { requestLogger } from './middleware/requestLogger';
import { buildV1Router } from './modules';
import type { Database } from './services/database';

export interface AppDeps {
  config: Env;
  db: Database;
  prisma?: PrismaClient;
  logger?: Logger;
  /** Extra routers mounted under /api/v1 (used by tests and future modules). */
  routers?: Router[];
}

export function createApp({
  config,
  db,
  prisma,
  logger = createLogger(config),
  routers = [],
}: AppDeps): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.TRUST_PROXY);

  app.use(correlationId);
  app.use(requestLogger(logger));
  app.use(helmet());
  app.use(
    cors({
      origin: config.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id', 'Idempotency-Key'],
      exposedHeaders: ['X-Correlation-Id'],
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  app.use(
    '/api/v1',
    createRateLimiter(config),
    buildV1Router({ config, db, prisma }),
    ...routers,
  );

  app.use(notFoundHandler);
  app.use(errorHandler(logger));
  return app;
}
