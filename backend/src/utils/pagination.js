/**
 * Pagination helper — builds standard paginated response.
 * @param {Object} options
 * @param {number} options.page
 * @param {number} options.limit
 * @param {number} options.total
 * @param {Array} options.data
 * @returns {{ data: Array, pagination: { page: number, limit: number, total: number, totalPages: number } }}
 */
export function paginate({ page, limit, total, data }) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Parse pagination params from query string.
 * @param {Object} query - Express req.query
 * @returns {{ page: number, limit: number, offset: number }}
 */
export function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}
