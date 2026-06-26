import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface Props {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  itemLabel = 'registros',
}: Props) {
  if (totalItems === 0) return null;

  const from = (currentPage - 1) * pageSize + 1;
  const to   = Math.min(currentPage * pageSize, totalItems);

  // Build page numbers with ellipsis
  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
      {/* Left: count + page size */}
      <div className="flex items-center gap-3">
        <p className="text-xs text-gray-400">
          {from}–{to} de {totalItems} {itemLabel}
        </p>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
            className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>{n} por página</option>
            ))}
          </select>
        )}
      </div>

      {/* Right: page buttons */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors shadow-sm"
          >
            <ChevronLeftIcon className="w-3.5 h-3.5 text-gray-600" />
          </button>

          {pages.map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className="w-7 text-center text-xs text-gray-400">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                className="w-7 h-7 rounded-lg text-xs font-semibold transition-colors"
                style={
                  p === currentPage
                    ? { background: '#538f65', color: '#fff' }
                    : { background: '#fff', color: '#4a5568', border: '1px solid #e2e8f0' }
                }
              >
                {p}
              </button>
            )
          )}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors shadow-sm"
          >
            <ChevronRightIcon className="w-3.5 h-3.5 text-gray-600" />
          </button>
        </div>
      )}
    </div>
  );
}
