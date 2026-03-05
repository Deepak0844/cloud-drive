import { Table } from "antd";

// Helper
function getRowClassName(record = {}) {
  const { isActive = false } = record;

  return !isActive ? "row-disabled" : "";
}

/**
 * DataTable Component
 * @param {Array} rows
 * @param {Array} columns
 * @param {Object} scrollConfig
 * @param {String} className
 * @param {Boolean} applyTableBorder
 * @param {String} rowSelection
 * @param {String} emptyDataMessage
 * @param {Boolean} virtual
 * @returns
 */
export default function DataTable({
  rows = [],
  columns = [],
  scrollConfig = {},
  className = "",
  applyTableBorder = false,
  rowSelection = "",
  emptyDataMessage = "",
  rowClassName = getRowClassName,
  virtual = false,
  ...rest
}) {
  //
  const tableProps = {
    size: "large",
    showHeader: true,
    showSorterTooltip: false,
    pagination: false,
    scroll: scrollConfig,
    bordered: applyTableBorder,
    virtual: virtual,
  };

  //
  const emptyDataTextConfig = emptyDataMessage
    ? { emptyText: <span className="text-dark">{emptyDataMessage}</span> }
    : {};

  return (
    <div className={className}>
      <Table
        {...tableProps}
        rowSelection={rowSelection || null}
        rowClassName={rowClassName}
        columns={columns}
        dataSource={rows}
        locale={emptyDataTextConfig}
        {...rest}
      />
    </div>
  );
}
