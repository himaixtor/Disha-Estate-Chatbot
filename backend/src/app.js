const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { ApiError } = require('./utils/apiResponse');

const app = express();

app.use(express.json({ limit: '10mb' })); // request size limit, blueprint §41
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.use(cors({
  origin(origin, callback) {
    // Same-origin/non-browser requests (no Origin header) are always allowed.
    if (!origin || env.corsAllowedOrigins.includes(origin) || env.corsAllowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(new ApiError(403, 'CORS_REJECTED', 'This origin is not allowed to call this API.'));
  },
  credentials: true,
}));

app.use('/api/v1', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
