import { z } from 'zod';
import { AppError } from './errors';
import type { PageMeta } from './response';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().max(40).optional(),
});
export type Pagination = z.infer<typeof paginationSchema>;

export const toSkipTake = (p: Pick<Pagination, 'page' | 'pageSize'>) => ({
  skip: (p.page - 1) * p.pageSize,
  take: p.pageSize,
});

export function buildMeta(p: Pick<Pagination, 'page' | 'pageSize'>, total: number): PageMeta {
  return {
    page: p.page,
    pageSize: p.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / p.pageSize)),
  };
}

export type SortDirection = 'asc' | 'desc';

/** Parses `field` or `field:asc|desc` against an allow-list so clients cannot sort on arbitrary columns. */
export function parseSort<F extends string>(
  sort: string | undefined,
  allowed: readonly F[],
  fallback: { field: F; direction: SortDirection },
): { field: F; direction: SortDirection } {
  if (!sort) return fallback;
  const [field = '', dir = 'asc'] = sort.split(':');
  if (!(allowed as readonly string[]).includes(field) || (dir !== 'asc' && dir !== 'desc')) {
    throw new AppError(
      400,
      'INVALID_SORT',
      `Sort must be one of: ${allowed.join(', ')} (optionally :asc or :desc)`,
    );
  }
  return { field: field as F, direction: dir };
}

/** Comma-separated filter, e.g. `status=ACTIVE,CONSUMED` -> validated array. */
export const csvEnum = <T extends [string, ...string[]]>(values: T) =>
  z
    .string()
    .transform((s) =>
      s
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.enum(values)).min(1).max(values.length));

/** Drops undefined entries so optional filters never produce `{ field: undefined }` conditions. */
export function pickDefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}
