// Constants
import { QUERY_PARAMS_KEYS } from "@shared-constants/constants";

// Hooks
import { useInfiniteScroll } from "@shared-hooks/hooks";

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
