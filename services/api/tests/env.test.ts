import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/config/env';

describe('environment validation', () => {
  it('applies defaults', () => {
    const env = loadEnv({ DATABASE_URL: 'postgresql://u:p@localhost:5432/db' });
    expect(env.API_PORT).toBe(4000);
    expect(env.BLOCKCHAIN_MODE).toBe('disabled');
    expect(env.TRUST_PROXY).toBe(false);
  });
  it('fails when DATABASE_URL is missing, naming the variable but not leaking values', () => {
    expect(() => loadEnv({ API_PORT: '99999', JWT: 'super-secret' })).toThrow(/DATABASE_URL/);
    expect(() => loadEnv({ API_PORT: '99999', JWT: 'super-secret' })).not.toThrow(/super-secret/);
  });
});
