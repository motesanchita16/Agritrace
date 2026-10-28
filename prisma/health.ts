import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

// Usage: npm run db:health   (exit code 0 = reachable, 1 = not reachable)
const prisma = new PrismaClient();

async function main() {
  const started = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = 'public'`;
  const count = rows[0]?.count ?? 0n;
  console.log(`database: reachable (${Date.now() - started} ms), public tables: ${count}`);
}

main()
  .catch((e: unknown) => {
    console.error('database: NOT reachable —', e instanceof Error ? e.message.split('\n')[0] : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
