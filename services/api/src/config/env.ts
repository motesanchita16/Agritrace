import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

const bool = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1, 'is required'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  BLOCKCHAIN_MODE: z.enum(['disabled', 'local', 'testnet']).default('disabled'),
  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  TRUST_PROXY: bool,
  JWT_ACCESS_SECRET: z.string().min(16).default('development-only-access-secret-32-chars-long!'),
  JWT_REFRESH_SECRET: z.string().min(16).default('development-only-refresh-secret-32-chars-long!'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_DAYS: z.coerce.number().int().positive().default(7),
});

export type Env = z.infer<typeof schema>;

/** Validates configuration. Error text lists variable names only, never values. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration — ${problems}`);
  }
  return result.data;
}

/** Loads .env from the service folder or the repository root (first value wins). */
export function loadDotenvFiles(): void {
  loadDotenv();
  loadDotenv({ path: resolve(process.cwd(), '../../.env') });
}
