const { fail, ApiError } = require('../utils/apiResponse');

// Central error handler (blueprint §13) — never leaks stack traces, DB errors or
// secrets to the client; every error still lands in server logs for diagnosis.
function notFoundHandler(req, res) {
  return fail(res, new ApiError(404, 'NOT_FOUND', `No route: ${req.method} ${req.originalUrl}`));
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (!(err instanceof ApiError)) {
    // eslint-disable-next-line no-console
    console.error('[unhandled]', err);
  }
  return fail(res, err);
}

module.exports = { notFoundHandler, errorHandler };
