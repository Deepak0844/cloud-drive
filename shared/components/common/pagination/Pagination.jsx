import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Constants
import { ICON_SIZE, QUERY_PARAMS_KEYS, DefaultPagination } from "@shared-constants/constants";

// Components
import Icon from "../icon/Icon";

// Styles
import "./Pagination.css";

/**
 * Pagination Component
 * @param {String} className
 * @param {Object} paginationObj
 * @returns
 */
export default function Pagination({ className = "", paginationObj = {} }) {
  // Pagination Data
  const {
    pageFirst = DefaultPagination.pageNumber,
    pageLast = DefaultPagination.pageSize,
    totalCount = DefaultPagination.totalCount,
  } = paginationObj;

  const [searchParams, setSearchParams] = useSearchParams();

  const urlPageNumber = searchParams.get(QUERY_PARAMS_KEYS.PAGE_NO);
  const pageNumber = urlPageNumber ? Number(urlPageNumber) : DefaultPagination.pageNumber;

  const isFirstPage = pageNumber <= 1;
  const isLastPage = pageLast >= totalCount;

  const leftContainerClassName = isFirstPage ? "pe-none" : "";
  const rightContainerClassName = isLastPage ? "pe-none" : "";

  const leftIconClassName = isFirstPage ? "icon-light" : "";
  const rightIconClassName = isLastPage ? "icon-light" : "";

  const handleChange = (isNext = false) => {
    if ((!isNext && isFirstPage) || (isNext && isLastPage)) return;

    const params = Object.fromEntries([...searchParams]);
    const newPage = isNext ? pageNumber + 1 : pageNumber - 1;

    setSearchParams({ ...params, [QUERY_PARAMS_KEYS.PAGE_NO]: newPage });
  };

  return (
    <div className={`d-flex align-items-center gap-2 ${className}`}>
      <div>
        <span className="fs-6">Showing</span>
      </div>

      <h6 className="m-0">
        <span className="fw-semibold">
          {pageFirst} - {pageLast}{" "}
        </span>
        / {totalCount}
      </h6>

      <div className="d-flex gap-1">
        <Icon
          icon={ChevronLeft}
          size={ICON_SIZE.medium}
          className={leftIconClassName}
          containerClassName={leftContainerClassName}
          onClick={() => handleChange(false)}
        />
        <Icon
          icon={ChevronRight}
          size={ICON_SIZE.medium}
          className={rightIconClassName}
          containerClassName={rightContainerClassName}
          onClick={() => handleChange(true)}
        />
      </div>
    </div>
  );
}
