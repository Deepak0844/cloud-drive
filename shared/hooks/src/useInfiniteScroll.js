import { useEffect, useRef, useState, useCallback } from "react";

/**
 * A reusable hook for implementing infinite scroll using IntersectionObserver.
 *
 * @param {object} options
 * @param {boolean} options.hasNext - Whether there are more pages to load
 * @param {boolean} options.isLoading - Whether a load operation is currently in progress
 * @param {Function} options.onLoadMore - Callback function to trigger the next page load
 * @param {number} options.threshold - Intersection threshold (0 to 1)
 * @param {string} options.rootMargin - Margin around the root
 * @returns {object} { loaderRef, isIntersecting }
 */
export const useInfiniteScroll = ({ hasNext, isLoading, onLoadMore, threshold = 0.1, rootMargin = "100px" }) => {
  const loaderRef = useRef(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  const handleObserver = useCallback(
    (entries) => {
      const target = entries[0];
      if (target.isIntersecting && hasNext && !isLoading) {
        setIsIntersecting(true);
        onLoadMore();
      } else {
        setIsIntersecting(false);
      }
    },
    [hasNext, isLoading, onLoadMore]
  );

  useEffect(() => {
    const option = {
      root: null,
      rootMargin,
      threshold,
    };

    const observer = new IntersectionObserver(handleObserver, option);
    const currentLoader = loaderRef.current;

    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [handleObserver, threshold, rootMargin]);

  return { loaderRef, isIntersecting };
};

export default useInfiniteScroll;
