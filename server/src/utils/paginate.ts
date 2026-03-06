export interface PaginationQuery {
  page?: string | number;
  limit?: string | number;
}

export interface PaginationResult {
  page: number;
  limit: number;
  skip: number;
}

export function buildPagination(query: PaginationQuery): PaginationResult {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
