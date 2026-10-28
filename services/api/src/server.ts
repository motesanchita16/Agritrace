import { PrismaClient } from '@prisma/client';
import { createApp } from './app';
import { loadDotenvFiles, loadEnv } from './config/env';
import { createLogger } from './lib/logger';
import { createPrismaDatabase } from './services/database';

loadDotenvFiles();
const config = loadEnv();
const logger = createLogger(config);
const prisma = new PrismaClient();
const app = createApp({ config, db: createPrismaDatabase(prisma), prisma, logger });

const server = app.listen(config.API_PORT, () => {
  logger.info(
    { port: config.API_PORT, env: config.NODE_ENV, blockchain: config.BLOCKCHAIN_MODE },
    'AgriTrace API listening',
  );
});

function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down');
  const force = setTimeout(() => process.exit(1), 10_000);
  force.unref();
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
