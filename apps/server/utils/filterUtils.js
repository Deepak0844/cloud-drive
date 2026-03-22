/**
 * Escape a string for safe use in a MongoDB $regex query.
 * Prevents ReDoS by neutralising regex metacharacters supplied by user input.
 * @param {string} str
 * @returns {string}
 */
export function escapeRegex(str) {
  return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

export const applyAdvancedFilters = (queryObj, queryParams, isFolder = false) => {
  const { category, minSize, maxSize, startDate, endDate, tag } = queryParams;

  const sanitize = (val) => (val === "null" || val === "undefined" || !val ? undefined : val);

  const sCategory = sanitize(category);
  const sMinSize = sanitize(minSize);
  const sMaxSize = sanitize(maxSize);
  const sStartDate = sanitize(startDate);
  const sEndDate = sanitize(endDate);
  const sTag = sanitize(tag);

  if (sCategory) {
    if (isFolder) {
      queryObj._id = null; // force empty
    } else {
      queryObj.category = sCategory;
    }
  }

  if (sMinSize || sMaxSize) {
    if (isFolder) {
      queryObj._id = null;
    } else {
      queryObj.size_bytes = {};
      if (sMinSize) {
        queryObj.size_bytes.$gte = parseInt(sMinSize);
      }
      if (sMaxSize) {
        queryObj.size_bytes.$lte = parseInt(sMaxSize);
      }
    }
  }

  if (sStartDate || sEndDate) {
    const dateQuery = {};
    if (sStartDate) {
      dateQuery.$gte = new Date(sStartDate);
    }
    if (sEndDate) {
      dateQuery.$lte = new Date(sEndDate);
    }
    queryObj.createdAt = dateQuery;
  }

  if (sTag) {
    queryObj.tags = sTag;
  }

  return queryObj;
};
