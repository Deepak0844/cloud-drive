/**
 * Standardized pagination helper for Mongoose queries
 *
 * @param {import('mongoose').Model} model - The Mongoose model to query
 * @param {object} query - The initial query object
 * @param {object} options - Pagination and sort options
 * @param {number} options.pg - Page number (1-indexed)
 * @param {number} options.ps - Page size (limit)
 * @param {string|object} options.sort - Sort criteria
 * @param {string|object} options.populate - Populate criteria
 * @returns {Promise<{data: Array, pagination: object}>}
 */
export const paginateQuery = async (model, query, options = {}) => {
  const pg = Math.max(1, parseInt(options.pg) || 1);
  const ps = Math.max(1, Math.min(100, parseInt(options.ps) || 20));
  const skip = (pg - 1) * ps;

  const countQuery = model.countDocuments(query);
  const dataQuery = model
    .find(query)
    .sort(options.sort || "-createdAt")
    .skip(skip)
    .limit(ps);

  if (options.populate) {
    dataQuery.populate(options.populate);
  }

  const [total, data] = await Promise.all([countQuery, dataQuery]);

  const pages = Math.ceil(total / ps);

  return {
    data,
    pagination: {
      total,
      page: pg,
      ps,
      pages,
      hasNext: pg < pages,
      hasPrev: pg > 1,
    },
  };
};

export default paginateQuery;
