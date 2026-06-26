import { useState, useMemo } from 'react';

export function usePagination<T>(items: T[], pageSize = 10) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Reset to page 1 when items change (e.g. after filtering)
  const safePage = Math.min(currentPage, totalPages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  function goTo(page: number) {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }

  return {
    currentPage: safePage,
    totalPages,
    paginated,
    goTo,
    setCurrentPage,
  };
}
