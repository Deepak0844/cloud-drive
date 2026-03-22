// React core & third-party libraries
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

// Constants
import { DefaultPagination, QUERY_PARAMS_KEYS } from "@shared-constants/constants";

export function useListPageParams(options = {}) {
  const { defaultPageSize = DefaultPagination.pageSize } = options;
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(() => {
    const pageParam = searchParams.get(QUERY_PARAMS_KEYS.PAGE_NO);
    return pageParam ? Number(pageParam) : DefaultPagination.pageNumber;
  });

  const pageSize = useMemo(() => {
    const pageSizeParam = searchParams.get(QUERY_PARAMS_KEYS.PAGE_SIZE);
    return pageSizeParam ? Number(pageSizeParam) : defaultPageSize;
  }, [searchParams, defaultPageSize]);

  const debouncedSearch = searchParams.get(QUERY_PARAMS_KEYS.SEARCH) || "";

  const advancedFilters = useMemo(() => {
    const filters = {};
    const category = searchParams.get(QUERY_PARAMS_KEYS.CATEGORY);
    const startDate = searchParams.get(QUERY_PARAMS_KEYS.START_DATE);
    const endDate = searchParams.get(QUERY_PARAMS_KEYS.END_DATE);
    const minSize = searchParams.get(QUERY_PARAMS_KEYS.MIN_SIZE);
    const maxSize = searchParams.get(QUERY_PARAMS_KEYS.MAX_SIZE);
    const tag = searchParams.get(QUERY_PARAMS_KEYS.TAG);

    if (category) filters.category = category;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (minSize) filters.minSize = Number(minSize);
    if (maxSize) filters.maxSize = Number(maxSize);
    if (tag) filters.tag = tag;
    return filters;
  }, [searchParams]);

  const updateParams = useCallback(
    (updates) => {
      const newParams = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
          newParams.delete(key);
        } else {
          newParams.set(key, String(value));
        }
      });
      setSearchParams(newParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    const pageParam = searchParams.get(QUERY_PARAMS_KEYS.PAGE_NO);
    const newPage = pageParam ? Number(pageParam) : DefaultPagination.pageNumber;
    if (newPage !== page) setPage(newPage);
  }, [searchParams, page]);

  return {
    advancedFilters,
    debouncedSearch,
    page,
    pageSize,
    searchParams,
    setPage,
    setSearchParams,
    updateParams,
  };
}
