import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import type { Env } from '../config/env';
import type { Database } from '../services/database';
import { adminRouter } from './admin/admin.routes';
import { authRouter } from './auth/auth.routes';
import { healthRouter } from './health/health.routes';
import { usersRouter } from './users/users.routes';

export interface V1RouterDeps {
  config: Env;
  db: Database;
  prisma?: PrismaClient;
}

/** Mounts all v1 sub-routers. */
export function buildV1Router(deps: V1RouterDeps): Router {
  const router = Router();
  router.use('/health', healthRouter({ config: deps.config, db: deps.db }));
  router.use('/auth', authRouter({ config: deps.config, prisma: deps.prisma }));
  router.use('/users', usersRouter({ config: deps.config, prisma: deps.prisma }));
  router.use('/admin', adminRouter({ config: deps.config, prisma: deps.prisma }));
  return router;
}
