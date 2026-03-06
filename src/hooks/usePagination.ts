import { useState, useMemo, useCallback } from 'react';

interface PaginationOptions {
  initialPage?: number;
  pageSize?: number;
}

interface PaginationResult<T> {
  /** The current page of items */
  currentItems: T[];
  /** Current page number (1-indexed) */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items */
  totalItems: number;
  /** Items per page */
  pageSize: number;
  /** Whether there is a next page */
  hasNext: boolean;
  /** Whether there is a previous page */
  hasPrev: boolean;
  /** Go to next page */
  nextPage: () => void;
  /** Go to previous page */
  prevPage: () => void;
  /** Go to a specific page */
  goToPage: (page: number) => void;
  /** Reset to first page */
  reset: () => void;
}

/**
 * Client-side pagination hook.
 * Pass in the full list and get back paginated results + controls.
 */
export function usePagination<T>(items: T[], options: PaginationOptions = {}): PaginationResult<T> {
  const { initialPage = 1, pageSize = 10 } = options;
  const [page, setPage] = useState(initialPage);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Clamp page to valid range
  const safePage = Math.min(Math.max(1, page), totalPages);

  const currentItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const hasNext = safePage < totalPages;
  const hasPrev = safePage > 1;

  const nextPage = useCallback(() => setPage((p) => Math.min(p + 1, totalPages)), [totalPages]);
  const prevPage = useCallback(() => setPage((p) => Math.max(p - 1, 1)), []);
  const goToPage = useCallback(
    (target: number) => setPage(Math.min(Math.max(1, target), totalPages)),
    [totalPages]
  );
  const reset = useCallback(() => setPage(initialPage), [initialPage]);

  return {
    currentItems,
    page: safePage,
    totalPages,
    totalItems,
    pageSize,
    hasNext,
    hasPrev,
    nextPage,
    prevPage,
    goToPage,
    reset,
  };
}
