// Central response envelope (blueprint §11) — every route uses these two helpers
// so success/error shape never drifts route to route.

function ok(res, data = {}, message = 'Request successful', status = 200) {
  return res.status(status).json({ success: true, message, data, error: null });
}

class ApiError extends Error {
  constructor(status, code, message, details = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function fail(res, error) {
  const status = error.status || 500;
  const code = error.code || 'INTERNAL_ERROR';
  const message = error.status ? error.message : 'Something went wrong. Please try again.';
  return res.status(status).json({
    success: false,
    message,
    data: null,
    error: { code, details: error.details || [] },
  });
}

module.exports = { ok, fail, ApiError };
