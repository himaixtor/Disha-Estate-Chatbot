const { ApiError } = require('../utils/apiResponse');

// Wraps a zod schema as Express middleware — validates req.body and replaces it
// with the parsed (typed, defaulted) result.
function validateBody(schema) {
  return function (req, res, next) {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
      return next(new ApiError(422, 'VALIDATION_ERROR', 'Validation failed.', details));
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validateBody };
