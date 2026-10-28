import { Router } from 'express';
import type { AccountStatus, PrismaClient, Role } from '@prisma/client';
import { z } from 'zod';
import type { Env } from '../../config/env';
import { Errors } from '../../lib/errors';
import { buildMeta, paginationSchema, toSkipTake } from '../../lib/pagination';
import { sendData } from '../../lib/response';
import { authenticate, requireRole } from '../../middleware/auth';
import { getQuery, validate } from '../../middleware/validate';
import { revokeAllUserTokens } from '../../services/auth.service';

const listUsersQuery = paginationSchema.extend({
  role: z
    .enum(['FARMER', 'DISTRIBUTOR', 'WHOLESALER', 'PROCESSOR', 'RETAILER', 'AUDITOR', 'ADMIN', 'CONSUMER'])
    .optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED']).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED']),
});

export function adminRouter(deps: { config: Env; prisma?: PrismaClient }): Router {
  const router = Router();
  // Administrative endpoints are strictly protected: valid JWT + ADMIN role required
  router.use(authenticate(deps.config, deps.prisma));
  router.use(requireRole('ADMIN'));

  // GET /api/v1/admin/users
  router.get('/users', validate({ query: listUsersQuery }), async (req, res, next) => {
    try {
      if (!deps.prisma) {
        throw Errors.unavailable('Database is unavailable');
      }

      const query = getQuery<z.infer<typeof listUsersQuery>>(req);
      const { skip, take } = toSkipTake(query);

      const where = {
        ...(query.role ? { role: query.role as Role } : {}),
        ...(query.status ? { status: query.status as AccountStatus } : {}),
      };

      const [users, total] = await Promise.all([
        deps.prisma.user.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        deps.prisma.user.count({ where }),
      ]);

      return sendData(res, users, 200, buildMeta(query, total));
    } catch (err) {
      next(err);
    }
  });

  // PATCH /api/v1/admin/users/:id/status
  router.patch('/users/:id/status', validate({ body: updateStatusSchema }), async (req, res, next) => {
    try {
      if (!deps.prisma) {
        throw Errors.unavailable('Database is unavailable');
      }

      const id = req.params['id'] ?? '';
      const { status } = req.body as z.infer<typeof updateStatusSchema>;

      const user = await deps.prisma.user.findUnique({ where: { id } });
      if (!user) {
        throw Errors.notFound('User not found');
      }

      const updated = await deps.prisma.user.update({
        where: { id },
        data: { status: status as AccountStatus },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          updatedAt: true,
        },
      });

      // If suspended, invalidate all active sessions immediately
      if (status === 'SUSPENDED') {
        await revokeAllUserTokens(deps.prisma, id);
      }

      return sendData(res, { user: updated }, 200);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/v1/admin/overview
  router.get('/overview', async (_req, res, next) => {
    try {
      if (!deps.prisma) {
        throw Errors.unavailable('Database is unavailable');
      }

      const [totalUsers, activeUsers, pendingUsers, suspendedUsers] = await Promise.all([
        deps.prisma.user.count(),
        deps.prisma.user.count({ where: { status: 'ACTIVE' } }),
        deps.prisma.user.count({ where: { status: 'PENDING' } }),
        deps.prisma.user.count({ where: { status: 'SUSPENDED' } }),
      ]);

      return sendData(res, { totalUsers, activeUsers, pendingUsers, suspendedUsers }, 200);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
