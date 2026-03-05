import { Skeleton, Table } from "antd";

// Page Constant
const KEY = "key";

// Helpers
function constructDataSource(rowCount = 0) {
  return [...Array(rowCount)].map((_, index) => ({
    key: `${KEY}${index}`,
  }));
}

function constructColumns(columnCount = 0) {
  return Array.from({ length: columnCount }, (_, i) => ({
    title: <Skeleton.Input active={true} />,
    width: 100,
    key: `${i}`,
    dataIndex: `${i}`,
    render: () => <Skeleton title={true} paragraph={false} active={true} />,
  }));
}

/**
 * Skeleton Table
 * @param {Number} rowCount
 * @param {Number} columnCount
 * @returns
 */
export default function SkeletonTable({ rowCount = 0, columnCount = 0 }) {
  return (
    <Table
      rowKey={KEY}
      pagination={false}
      dataSource={constructDataSource(rowCount)}
      columns={constructColumns(columnCount)}
    />
  );
}
