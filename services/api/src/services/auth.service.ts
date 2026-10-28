import { createHash, randomBytes } from 'node:crypto';
import type { AccountStatus, PrismaClient, Role, User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Errors } from '../lib/errors';
import type { AuthUser } from '../types/express';

export interface AccessTokenPayload {
  sub: string;
  name: string;
  email: string;
  role: Role;
  status: AccountStatus;
}

const BCRYPT_ROUNDS = 10;

/** Hashes a plaintext password using bcrypt. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/** Securely verifies a plaintext password against a stored bcrypt hash. */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Signs a short-lived access token with the given secret. */
export function createAccessToken(
  user: AuthUser,
  secret: string,
  expiresIn: string | number = '15m',
): string {
  const payload: AccessTokenPayload = {
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
  return jwt.sign(payload, secret, { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] });
}

/** Verifies and decodes a short-lived access token. */
export function verifyAccessToken(token: string, secret: string): AccessTokenPayload {
  try {
    return jwt.verify(token, secret) as AccessTokenPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw Errors.unauthorized('Access token has expired');
    }
    throw Errors.unauthorized('Invalid access token');
  }
}

/** Generates a cryptographically strong random refresh token string. */
export function generateRefreshToken(): string {
  return randomBytes(40).toString('hex');
}

/** Computes a deterministic SHA-256 hash of a refresh token to store in the database. */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Stores a hashed refresh token in PostgreSQL. */
export async function storeRefreshToken(
  prisma: PrismaClient,
  opts: {
    token: string;
    userId: string;
    expiresInDays: number;
    userAgent?: string;
    ipAddress?: string;
  },
): Promise<void> {
  const expiresAt = new Date(Date.now() + opts.expiresInDays * 24 * 60 * 60 * 1000);
  const tokenHash = hashRefreshToken(opts.token);

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId: opts.userId,
      expiresAt,
      userAgent: opts.userAgent?.slice(0, 255),
      ipAddress: opts.ipAddress?.slice(0, 45),
    },
  });
}

/**
 * Validates the presented refresh token, checks the user account status,
 * revokes the presented token, and creates a rotated new refresh token.
 */
export async function rotateRefreshToken(
  prisma: PrismaClient,
  opts: {
    rawToken: string;
    expiresInDays: number;
    userAgent?: string;
    ipAddress?: string;
  },
): Promise<{ user: User; newRefreshToken: string }> {
  const tokenHash = hashRefreshToken(opts.rawToken);
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!existing) {
    throw Errors.unauthorized('Invalid refresh token');
  }

  // Token reuse detection: if already revoked, invalidate all sessions for safety
  if (existing.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw Errors.unauthorized('Refresh token has already been revoked. Please sign in again.');
  }

  if (existing.expiresAt.getTime() <= Date.now()) {
    throw Errors.unauthorized('Refresh token has expired. Please sign in again.');
  }

  // Account status check: only ACTIVE users can refresh tokens
  if (existing.user.status === 'SUSPENDED') {
    throw Errors.forbidden('Account is suspended. Please contact an administrator.');
  }
  if (existing.user.status === 'PENDING') {
    throw Errors.forbidden('Account is pending approval.');
  }

  // Invalidate old token
  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });

  // Issue new refresh token
  const newRefreshToken = generateRefreshToken();
  await storeRefreshToken(prisma, {
    token: newRefreshToken,
    userId: existing.user.id,
    expiresInDays: opts.expiresInDays,
    userAgent: opts.userAgent,
    ipAddress: opts.ipAddress,
  });

  return { user: existing.user, newRefreshToken };
}

/** Revokes a single refresh token upon logout. */
export async function revokeRefreshToken(prisma: PrismaClient, rawToken: string): Promise<void> {
  const tokenHash = hashRefreshToken(rawToken);
  await prisma.refreshToken
    .update({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    })
    .catch(() => undefined);
}

/** Revokes all active refresh tokens for a user (session invalidation). */
export async function revokeAllUserTokens(prisma: PrismaClient, userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
