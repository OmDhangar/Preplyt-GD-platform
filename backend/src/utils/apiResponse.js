/**
 * Standard API response envelope.
 * Every response from the API follows this shape so the frontend
 * can rely on a consistent structure.
 *
 * Success: { success: true,  data: {...},     message: '...',  meta: {...} }
 * Fail:    { success: false, error: '...',    details: [...] }
 */

const success = (res, data, message = 'Success', statusCode = 200, meta = null) => {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
};

const created = (res, data, message = 'Created') =>
  success(res, data, message, 201);

const fail = (res, message, statusCode = 400, details = null) => {
  const body = { success: false, message };
  if (details) body.details = details;
  return res.status(statusCode).json(body);
};

const paginated = (res, data, page, limit, total, message = 'Success') =>
  success(res, data, message, 200, {
    page:       Number(page),
    limit:      Number(limit),
    total,
    totalPages: Math.ceil(total / limit),
    hasNext:    page * limit < total,
    hasPrev:    page > 1,
  });

module.exports = { success, created, fail, paginated };
