export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const Errors = {
  badRequest: (message: string, details?: unknown) =>
    new AppError(400, 'BAD_REQUEST', message, details),
  unauthorized: (message = 'Authentication required') => new AppError(401, 'UNAUTHORIZED', message),
  forbidden: (message = 'You do not have permission to perform this action') =>
    new AppError(403, 'FORBIDDEN', message),
  notFound: (message = 'Resource not found') => new AppError(404, 'NOT_FOUND', message),
  conflict: (message: string, details?: unknown) => new AppError(409, 'CONFLICT', message, details),
  tooManyRequests: (message = 'Too many requests. Please retry later.') =>
    new AppError(429, 'RATE_LIMITED', message),
  unavailable: (message = 'Service temporarily unavailable') =>
    new AppError(503, 'SERVICE_UNAVAILABLE', message),
};
