/**
 * Shared helpers for paginated RTK Query endpoints (ported from the web app's
 * services/api/apiUtils.js).
 */

/**
 * Strips 'pg' from the cache key so all pages of the same query update the
 * same cache entry.
 */
function serializePaginatedQueryArgs({ endpointName, queryArgs }) {
  const { pg: _pg, ...rest } = queryArgs || {};
  return `${endpointName}-${JSON.stringify(rest)}`;
}

/**
 * Merge algorithm for infinite scrolling: appends any array found on the new
 * page onto the corresponding array in the cache. Page 1 (or no pg arg)
 * replaces the cache so pull-to-refresh resets the list.
 */
function mergePaginatedArrays() {
  return (currentCache, newItems, { arg }) => {
    if (!arg?.pg || arg.pg === 1) return newItems;

    if (Array.isArray(newItems)) {
      const currentData = Array.isArray(currentCache) ? currentCache : [];
      return [...currentData, ...newItems];
    }

    const merged = { ...newItems };
    const cacheObj = currentCache || {};

    Object.keys(newItems).forEach((key) => {
      if (Array.isArray(newItems[key])) {
        merged[key] = [...(cacheObj[key] || []), ...newItems[key]];
      }
    });

    return merged;
  };
}

const ApiUtils = {
  serializePaginatedQueryArgs,
  mergePaginatedArrays,
};

export default ApiUtils;
