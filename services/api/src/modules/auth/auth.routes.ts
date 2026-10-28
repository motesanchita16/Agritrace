import { Router } from 'express';
import type { PrismaClient, Role } from '@prisma/client';
import { z } from 'zod';
import type { Env } from '../../config/env';
import { Errors } from '../../lib/errors';
import { sendData } from '../../lib/response';
import { authenticate } from '../../middleware/auth';
import { createStrictLimiter } from '../../middleware/rateLimit';
import { validate } from '../../middleware/validate';
import {
  createAccessToken,
  generateRefreshToken,
  hashPassword,
  revokeRefreshToken,
  rotateRefreshToken,
  storeRefreshToken,
  verifyPassword,
} from '../../services/auth.service';

const publicRoles = [
  'FARMER',
  'DISTRIBUTOR',
  'WHOLESALER',
  'PROCESSOR',
  'RETAILER',
  'AUDITOR',
  'CONSUMER',
] as const;

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Valid email address required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  role: z.enum(publicRoles).default('CONSUMER'),
});

const loginSchema = z.object({
  email: z.string().email('Valid email address required'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});

export interface AuthDeps {
  config: Env;
  prisma?: PrismaClient;
}

export function authRouter(deps: AuthDeps): Router {
  const router = Router();
  const strictLimit = deps.config.NODE_ENV === 'test' ? 1000 : 15;
  const strictLimiter = createStrictLimiter(deps.config.RATE_LIMIT_WINDOW_MS, strictLimit);

  // POST /api/v1/auth/register
  router.post('/register', strictLimiter, validate({ body: registerSchema }), async (req, res, next) => {
    try {
      if (!deps.prisma) {
        throw Errors.unavailable('Database is not available for registration');
      }

      const { name, email, password, role } = req.body as z.infer<typeof registerSchema>;

      // Check for existing account
      const existing = await deps.prisma.user.findUnique({ where: { email } });
      if (existing) {
        throw Errors.conflict('An account with this email address already exists');
      }

      const passwordHash = await hashPassword(password);
      const user = await deps.prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: role as Role,
          status: 'ACTIVE',
        },
      });

      const authUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      };

      const accessToken = createAccessToken(authUser, deps.config.JWT_ACCESS_SECRET, deps.config.JWT_ACCESS_EXPIRES_IN);
      const refreshToken = generateRefreshToken();

      await storeRefreshToken(deps.prisma, {
        token: refreshToken,
        userId: user.id,
        expiresInDays: deps.config.JWT_REFRESH_EXPIRES_DAYS,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

      return sendData(res, { user: authUser, accessToken, refreshToken }, 201);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/v1/auth/login
  router.post('/login', strictLimiter, validate({ body: loginSchema }), async (req, res, next) => {
    try {
      if (!deps.prisma) {
        throw Errors.unavailable('Database is not available for login');
      }

      const { email, password } = req.body as z.infer<typeof loginSchema>;

      const user = await deps.prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw Errors.unauthorized('Invalid email or password');
      }

      const match = await verifyPassword(password, user.passwordHash);
      if (!match) {
        throw Errors.unauthorized('Invalid email or password');
      }

      // Check account status
      if (user.status === 'SUSPENDED') {
        throw Errors.forbidden('Account is suspended. Please contact an administrator.');
      }
      if (user.status === 'PENDING') {
        throw Errors.forbidden('Account is pending approval.');
      }

      const authUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      };

      const accessToken = createAccessToken(authUser, deps.config.JWT_ACCESS_SECRET, deps.config.JWT_ACCESS_EXPIRES_IN);
      const refreshToken = generateRefreshToken();

      await storeRefreshToken(deps.prisma, {
        token: refreshToken,
        userId: user.id,
        expiresInDays: deps.config.JWT_REFRESH_EXPIRES_DAYS,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

      return sendData(res, { user: authUser, accessToken, refreshToken }, 200);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/v1/auth/refresh
  router.post('/refresh', strictLimiter, validate({ body: refreshSchema }), async (req, res, next) => {
    try {
      if (!deps.prisma) {
        throw Errors.unavailable('Database is not available for token refresh');
      }

      const { refreshToken } = req.body as z.infer<typeof refreshSchema>;

      const { user, newRefreshToken } = await rotateRefreshToken(deps.prisma, {
        rawToken: refreshToken,
        expiresInDays: deps.config.JWT_REFRESH_EXPIRES_DAYS,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

      const authUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      };

      const accessToken = createAccessToken(authUser, deps.config.JWT_ACCESS_SECRET, deps.config.JWT_ACCESS_EXPIRES_IN);

      return sendData(res, { user: authUser, accessToken, refreshToken: newRefreshToken }, 200);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/v1/auth/logout
  router.post('/logout', validate({ body: logoutSchema }), async (req, res, next) => {
    try {
      const { refreshToken } = (req.body ?? {}) as z.infer<typeof logoutSchema>;
      if (deps.prisma && refreshToken) {
        await revokeRefreshToken(deps.prisma, refreshToken);
      }
      return sendData(res, { success: true, message: 'Logged out successfully' }, 200);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/v1/auth/me
  router.get('/me', authenticate(deps.config, deps.prisma), (req, res) => {
    return sendData(res, { user: req.user }, 200);
  });

  return router;
}
