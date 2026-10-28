import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { verifyConsistency } from './verify';

const prisma = new PrismaClient();
verifyConsistency(prisma)
  .then((errs) => {
    if (errs.length) { console.error(`FAILED:\n- ${errs.join('\n- ')}`); process.exitCode = 1; }
    else console.log('Consistency check passed.');
  })
  .catch((e: unknown) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
