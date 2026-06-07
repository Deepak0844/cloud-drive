// React core & third-party libraries
import PropTypes from "prop-types";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Custom Table component that mirrors the antd Table API surface used within this app.
 * Supported props: columns, dataSource, rowKey, className, loading, pagination, scroll.
 *
 * CSS class names intentionally match antd's output so that the `.admin-premium-table`
 * overrides in globals.css continue to work without modification.
 */
export default function Table({
  columns = [],
  dataSource = [],
  rowKey = "id",
  className = "",
  loading = false,
  pagination,
  scroll,
}) {
  // ── helpers ──────────────────────────────────────────────────────────────
  function getKey(record) {
    return typeof rowKey === "function" ? rowKey(record) : record[rowKey];
  }

  function getCellValue(col, record) {
    return col.dataIndex ? record[col.dataIndex] : undefined;
  }

  // ── scroll styles ─────────────────────────────────────────────────────────
  const wrapperStyle = {};
  if (scroll?.y) wrapperStyle.maxHeight = scroll.y;
  const tableStyle = {};
  if (scroll?.x) tableStyle.minWidth = scroll.x;

  // ── pagination ────────────────────────────────────────────────────────────
  const hasPagination = pagination && typeof pagination === "object";
  const { current = 1, pageSize = 10, total = 0, onChange } = hasPagination ? pagination : {};
  const totalPages = hasPagination ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  function pageNumbers() {
    const pages = [];
    const delta = 2;
    const left = Math.max(1, current - delta);
    const right = Math.min(totalPages, current + delta);
    if (left > 1) {
      pages.push(1);
      if (left > 2) pages.push("…");
    }
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages) {
      if (right < totalPages - 1) pages.push("…");
      pages.push(totalPages);
    }
    return pages;
  }

  // ── empty state ───────────────────────────────────────────────────────────
  function EmptyState() {
    return (
      <tr>
        <td colSpan={columns.length} className="text-center py-12">
          <div className="ant-empty">
            <p className="ant-empty-description text-label-tertiary font-bold">No data</p>
          </div>
        </td>
      </tr>
    );
  }

  // ── loading skeleton ──────────────────────────────────────────────────────
  function SkeletonRows() {
    return Array.from({ length: pageSize || 5 }).map((_, i) => (
      <tr key={i} className="ant-table-row">
        {columns.map((col) => (
          <td key={col.key || col.dataIndex} className="ant-table-cell px-6 py-4">
            <div className="h-4 bg-white/10 rounded animate-pulse" />
          </td>
        ))}
      </tr>
    ));
  }

  return (
    <div className={className}>
      {/* Table */}
      <div className="ant-table-wrapper overflow-auto" style={scroll?.y ? wrapperStyle : {}}>
        <div className="ant-spin-nested-loading">
          <div className="ant-table ant-table-scroll-horizontal">
            <div className="ant-table-container">
              <div className="ant-table-content overflow-x-auto">
                <table style={tableStyle} className="w-full border-collapse">
                  <thead className="ant-table-thead">
                    <tr>
                      {columns.map((col) => (
                        <th
                          key={col.key || col.dataIndex}
                          className="ant-table-cell"
                          style={col.width ? { width: col.width } : {}}
                        >
                          {col.title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="ant-table-tbody">
                    {loading ? (
                      <SkeletonRows />
                    ) : dataSource.length === 0 ? (
                      <EmptyState />
                    ) : (
                      dataSource.map((record, rowIndex) => (
                        <tr key={getKey(record)} className="ant-table-row ant-table-row-level-0">
                          {columns.map((col) => (
                            <td
                              key={col.key || col.dataIndex}
                              className="ant-table-cell"
                              style={col.align ? { textAlign: col.align } : {}}
                            >
                              {col.render
                                ? col.render(getCellValue(col, record), record, rowIndex)
                                : getCellValue(col, record)}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {hasPagination && totalPages > 1 && (
        <div className="ant-pagination flex items-center justify-end gap-1.5 px-6 py-4 border-t border-white/10">
          {/* Prev */}
          <button
            className="ant-pagination-prev ant-pagination-item h-8 w-8 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-label-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            disabled={current <= 1}
            onClick={() => onChange?.(current - 1)}
            aria-label="Previous page"
          >
            <span className="ant-pagination-item-link flex items-center justify-center">
              <ChevronLeft size={14} />
            </span>
          </button>

          {/* Page numbers */}
          {pageNumbers().map((p, i) =>
            p === "…" ? (
              <span key={`ellipsis-${i}`} className="px-1 text-label-tertiary text-sm select-none">
                …
              </span>
            ) : (
              <button
                key={p}
                className={`ant-pagination-item h-8 w-8 rounded-lg border text-sm font-bold transition-all${
                  p === current ? " ant-pagination-item-active" : " border-white/10 bg-white/5 text-label-secondary"
                }`}
                onClick={() => p !== current && onChange?.(p)}
              >
                <span>{p}</span>
              </button>
            )
          )}

          {/* Next */}
          <button
            className="ant-pagination-next ant-pagination-item h-8 w-8 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-label-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            disabled={current >= totalPages}
            onClick={() => onChange?.(current + 1)}
            aria-label="Next page"
          >
            <span className="ant-pagination-item-link flex items-center justify-center">
              <ChevronRight size={14} />
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

const columnShape = PropTypes.shape({
  key: PropTypes.string,
  title: PropTypes.node,
  dataIndex: PropTypes.string,
  render: PropTypes.func,
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  align: PropTypes.string,
});

Table.propTypes = {
  columns: PropTypes.arrayOf(columnShape),
  dataSource: PropTypes.array,
  rowKey: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  className: PropTypes.string,
  loading: PropTypes.bool,
  pagination: PropTypes.object,
  scroll: PropTypes.object,
};
