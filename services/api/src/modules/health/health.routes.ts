import { Router } from 'express';
import type { Env } from '../../config/env';
import { sendData } from '../../lib/response';
import type { Database } from '../../services/database';

export function healthRouter(deps: { config: Env; db: Database }): Router {
  const router = Router();

  // Liveness: process is up. Does not touch dependencies.
  router.get('/', (_req, res) => {
    sendData(res, {
      status: 'ok',
      service: 'agritrace-api',
      version: process.env.npm_package_version ?? 'unknown',
      uptimeSeconds: Math.round(process.uptime()),
      time: new Date().toISOString(),
    });
  });

  // Readiness: dependency checks. Blockchain is reported as configured mode only; no adapter exists yet.
  router.get('/ready', async (_req, res) => {
    let database: 'up' | 'down' = 'up';
    try {
      await deps.db.ping();
    } catch {
      database = 'down';
    }
    const ok = database === 'up';
    sendData(
      res,
      {
        status: ok ? 'ok' : 'degraded',
        checks: { database, blockchain: { mode: deps.config.BLOCKCHAIN_MODE, checked: false } },
      },
      ok ? 200 : 503,
    );
  });

  return router;
}
