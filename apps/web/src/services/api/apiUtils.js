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

const ApiUtils = {
  paginatedTags,
  entityTags,
  listTags,
  serializeParams,
};

export default ApiUtils;
