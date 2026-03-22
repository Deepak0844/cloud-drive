import { useInfiniteScroll } from "@hooks/useInfiniteScroll";
import { QUERY_PARAMS_KEYS } from "@shared-constants/constants";

export function useInfinitePaging({ hasNext, isLoading, page, setPage, updateParams }) {
  const { loaderRef } = useInfiniteScroll({
    hasNext: hasNext || false,
    isLoading,
    onLoadMore: () => {
      const nextPage = page + 1;
      setPage(nextPage);
      updateParams({ [QUERY_PARAMS_KEYS.PAGE_NO]: nextPage });
    },
  });

  return { loaderRef };
}
