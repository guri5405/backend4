import { PaginationParams } from '../types';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export function parsePagination(query: Record<string, unknown>): PaginationParams {
  let page = parseInt(String(query.page ?? DEFAULT_PAGE), 10);
  let limit = parseInt(String(query.limit ?? DEFAULT_LIMIT), 10);

  if (!Number.isFinite(page) || page < 1) page = DEFAULT_PAGE;
  if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  return { page, limit };
}

/**
 * Converts page/limit into Supabase/Postgres `range()` offsets: [from, to] inclusive.
 */
export function toRange({ page, limit }: PaginationParams): { from: number; to: number } {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return { from, to };
}

export function buildPaginationMeta(
  { page, limit }: PaginationParams,
  total: number
) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
