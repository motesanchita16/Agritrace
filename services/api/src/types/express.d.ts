import type { AccountStatus, Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: AccountStatus;
}

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      validatedQuery?: unknown;
      user?: AuthUser;
    }
  }
}
export {};

