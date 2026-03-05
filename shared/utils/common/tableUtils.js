// Constants
import { DefaultPagination } from "./constants/webConstants";

/**
 * Table Serial Number Function
 * @param {Number} index : Index from map
 * @param {Number} pageNumber : Current page number
 * @param {Number} pageSize : Current page size
 */
function tableSerialNumber({
  index = 0,
  pageNumber = DefaultPagination.pageNumber,
  pageSize = DefaultPagination.pageSize,
}) {
  return (pageNumber - 1) * pageSize + (index + 1);
}

const TableUtils = {
  tableSerialNumber,
};

export default TableUtils;
