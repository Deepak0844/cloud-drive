/**
 * API Utilities for parameter serialization and RTK Query cache tagging.
 */
import { TagIds } from "@constants/apiTags";

function convertFalseToString(params, key) {
  if (params[key] === false) {
    params[key] = "false";
  }
}

function convertStringToFalse(params, key) {
  if (params[key] === "false") {
    params[key] = false;
  }
}

function serializeParams(params) {
  if (!params) return "";

  let options = "";
  for (const key in params) {
    convertFalseToString(params, key);
    if ((typeof params[key] !== "object" || params[key] === null) && params[key] !== undefined) {
      if (params[key] === null) {
        options += `${key}=null&`;
      } else {
        convertStringToFalse(params, key);
        options += `${key}=${params[key]}&`;
      }
    } else if (typeof params[key] === "object" && params[key] && params[key].length) {
      params[key].forEach((el) => (options += `${key}=${el}&`));
    }
  }
  return options ? options.slice(0, -1) : options;
}

const stableStringify = (obj) => JSON.stringify(obj, Object.keys(obj).sort());

/**
 * Generates tags for paginated or list list queries.
 * Adapted to handle our generic `{ data: { files: [] } }` or `{ data: { folders: [] } }` responses.
 */
const paginatedTags = (type) => (result, error, args) => {
  const pageTag = {
    type,
    id: `PAGE-${args?.pageNumber || 1}-${args?.pageSize || 20}-${stableStringify(args?.filters || {})}`,
  };

  if (!result?.data) {
    return [{ type, id: TagIds.LIST }, pageTag];
  }

  let list = [];
  if (Array.isArray(result.data)) list = result.data;
  else if (result.data.files && Array.isArray(result.data.files)) list = result.data.files;
  else if (result.data.folders && Array.isArray(result.data.folders)) list = result.data.folders;

  if (!list.length) {
    return [{ type, id: TagIds.LIST }, pageTag];
  }

  return [{ type, id: TagIds.LIST }, pageTag, ...list.map((item) => ({ type, id: item.id || item._id }))];
};

/**
 * Generates tags for queries that return a single entity or mutations that affect a single entity.
 */
const entityTags = (type) => (_result, _error, args) => {
  if (!args) return [];

  const id =
    args.mediaId ?? // common case
    args.id ?? // fallback
    null;

  if (!id) return [];

  return [{ type, id }];
};

/**
 * Generates simple list tags (useful for mutations that invalidate all items of a type).
 * Can be used with custom IDs for specific lists (e.g. TagIds.RECENT, TagIds.CONTENTS).
 */
const listTags = (type, id = TagIds.LIST) => [{ type, id }];

/**
 * Shared sequence for paginated queries: strips 'pg' from the cache key
 * so all pages of the same query update the same cache entry.
 */
const serializePaginatedQueryArgs = ({ endpointName, queryArgs }) => {
  const { pg: _pg, ...rest } = queryArgs || {};
  return `${endpointName}-${JSON.stringify(rest)}`;
};

/**
 * Specifically for folder contents where folderId is the primary parameter.
 */
const serializeFolderContentsQueryArgs = ({ endpointName, queryArgs }) => {
  const id = typeof queryArgs === "string" ? queryArgs : queryArgs?.folderId || "root";
  const { pg: _pg, ...rest } = typeof queryArgs === "object" && queryArgs ? queryArgs : {};
  delete rest.folderId;
  return `${endpointName}-${id}-${JSON.stringify(rest)}`;
};

/**
 * Shared caching merge algorithm for infinite scrolling.
 * Automatically discovers any arrays on the new item and merges them with the corresponding arrays in the cache.
 */
const mergePaginatedArrays =
  () =>
  (currentCache, newItems, { arg }) => {
    if (!arg?.pg || arg.pg === 1) return newItems;

    // Array fallback (root level is an array)
    if (Array.isArray(newItems)) {
      const currentData = Array.isArray(currentCache) ? currentCache : [];
      return [...currentData, ...newItems];
    }

    // Object fallback: auto-detect arrays to merge
    const merged = { ...newItems };
    const cacheObj = currentCache || {};

    Object.keys(newItems).forEach((key) => {
      if (Array.isArray(newItems[key])) {
        merged[key] = [...(cacheObj[key] || []), ...newItems[key]];
      }
    });

    return merged;
  };

const ApiUtils = {
  paginatedTags,
  entityTags,
  listTags,
  serializeParams,
  serializePaginatedQueryArgs,
  serializeFolderContentsQueryArgs,
  mergePaginatedArrays,
};

export default ApiUtils;
