import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import type { Env } from '../src/config/env';
import type { Database } from '../src/services/database';
import { createApp } from '../src/app';

let testPrisma: PrismaClient | undefined;
export function getTestPrisma(): PrismaClient {
  if (!testPrisma) {
    testPrisma = new PrismaClient();
  }
  return testPrisma;
}

export const testConfig = (over: Partial<Env> = {}): Env => ({
  NODE_ENV: 'test',
  API_PORT: 4000,
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  CORS_ORIGIN: 'http://localhost:5173',
  LOG_LEVEL: 'silent',
  BLOCKCHAIN_MODE: 'disabled',
  RATE_LIMIT_WINDOW_MS: 60_000,
  RATE_LIMIT_MAX: 1000,
  TRUST_PROXY: false,
  JWT_ACCESS_SECRET: 'test-secret-at-least-32-characters-long!',
  JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-32-characters-long!',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_DAYS: 7,
  ...over,
});

export const dbUp: Database = { ping: async () => undefined };
export const dbDown: Database = {
  ping: async () => {
    throw new Error('connection refused: secret-host');
  },
};

export function makeApp(
  opts: { config?: Partial<Env>; db?: Database; prisma?: PrismaClient; routers?: Router[] } = {},
) {
  return createApp({
    config: testConfig(opts.config),
    db: opts.db ?? dbUp,
    prisma: opts.prisma,
    routers: opts.routers,
  });
}
