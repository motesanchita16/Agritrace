import type { PrismaClient } from '@prisma/client';
import { Errors } from '../lib/errors';

/** Narrow interface so routes and tests depend on behaviour, not on Prisma. */
export interface Database {
  ping(): Promise<void>;
}

export function createPrismaDatabase(client: PrismaClient, timeoutMs = 3000): Database {
  return {
    async ping() {
      let timer: NodeJS.Timeout | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(Errors.unavailable('Database ping timed out')), timeoutMs);
      });
      try {
        await Promise.race([client.$queryRaw`SELECT 1`, timeout]);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
