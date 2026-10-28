import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import type { Env } from '../../config/env';
import { Errors } from '../../lib/errors';
import { sendData } from '../../lib/response';
import { authenticate, requireSelfOrAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
});

export function usersRouter(deps: { config: Env; prisma?: PrismaClient }): Router {
  const router = Router();
  const auth = authenticate(deps.config, deps.prisma);

  // GET /api/v1/users/:id - A user can only access their own private record unless ADMIN or AUDITOR
  router.get(
    '/:id',
    auth,
    requireSelfOrAdmin((req) => req.params['id'] ?? ''),
    async (req, res, next) => {
      try {
        if (!deps.prisma) {
          throw Errors.unavailable('Database is unavailable');
        }

        const id = req.params['id'] ?? '';
        const user = await deps.prisma.user.findUnique({
          where: { id },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (!user) {
          throw Errors.notFound('User not found');
        }

        return sendData(res, { user }, 200);
      } catch (err) {
        next(err);
      }
    },
  );

  // PATCH /api/v1/users/:id
  router.patch(
    '/:id',
    auth,
    requireSelfOrAdmin((req) => req.params['id'] ?? ''),
    validate({ body: updateProfileSchema }),
    async (req, res, next) => {
      try {
        if (!deps.prisma) {
          throw Errors.unavailable('Database is unavailable');
        }

        const id = req.params['id'] ?? '';
        const { name } = req.body as z.infer<typeof updateProfileSchema>;

        const updated = await deps.prisma.user.update({
          where: { id },
          data: { ...(name ? { name } : {}) },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            updatedAt: true,
          },
        });

        return sendData(res, { user: updated }, 200);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
