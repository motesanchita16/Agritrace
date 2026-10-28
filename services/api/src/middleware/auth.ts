import type { Request, RequestHandler } from 'express';
import type { PrismaClient, Role } from '@prisma/client';
import type { Env } from '../config/env';
import { Errors } from '../lib/errors';
import { verifyAccessToken } from '../services/auth.service';

/**
 * Authentication middleware. Verifies the Bearer access token, validates the
 * account status, and populates `req.user`.
 */
export function authenticate(config: Env, _prisma?: PrismaClient): RequestHandler {
  return (req, _res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(Errors.unauthorized('Authentication required: missing or malformed Bearer token'));
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return next(Errors.unauthorized('Authentication required: empty token provided'));
    }

    try {
      const payload = verifyAccessToken(token, config.JWT_ACCESS_SECRET);

      // Account status check: suspended or unapproved users cannot access protected APIs
      if (payload.status === 'SUSPENDED') {
        return next(Errors.forbidden('Account is suspended. Please contact an administrator.'));
      }
      if (payload.status === 'PENDING') {
        return next(Errors.forbidden('Account is pending approval.'));
      }

      req.user = {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        status: payload.status,
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Role-based authorization middleware. Rejects requests from authenticated users
 * whose role is not included in the allowed roles list.
 */
export function requireRole(...allowedRoles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      return next(Errors.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        Errors.forbidden(
          `Forbidden: your role (${req.user.role}) does not have permission to perform this action. Required: ${allowedRoles.join(', ')}`,
        ),
      );
    }

    next();
  };
}

/**
 * Record-level authorization middleware. Ensures a user can only access their
 * own private records, unless the requester is an ADMIN or an AUDITOR.
 */
export function requireSelfOrAdmin(getTargetUserId: (req: Request) => string): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      return next(Errors.unauthorized('Authentication required'));
    }

    const targetUserId = getTargetUserId(req);
    const isSelf = req.user.id === targetUserId;
    const isElevated = req.user.role === 'ADMIN' || req.user.role === 'AUDITOR';

    if (!isSelf && !isElevated) {
      return next(
        Errors.forbidden(
          "Forbidden: you cannot access another user's private records without permission.",
        ),
      );
    }

    next();
  };
}
