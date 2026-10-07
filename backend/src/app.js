const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
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
    if (!origin || env.corsAllowedOrigins.includes(origin.toLowerCase()) || env.corsAllowedOrigins.includes('*')) {
      return callback(null, true);
    }
    // Logged so a site that can't reach the API shows up in `pm2 logs` —
    // the browser itself only reports a generic CORS error.
    console.warn(`[CORS] Rejected origin "${origin}" — add it to CORS_ALLOWED_ORIGINS in backend/.env to allow it.`);
    return callback(new ApiError(403, 'CORS_REJECTED', 'This origin is not allowed to call this API.'));
  },
  credentials: true,
}));

app.use('/api/v1', routes);

// --- Admin Portal (built SPA) + embeddable widget, served from this same
// Node process/port. Lets a single assigned host:port (e.g.
// chat.dishaestate.com:3001) cover all three surfaces — API, admin, widget —
// with no reverse proxy required. See host.md for the full deployment guide.
// Each block is a no-op until its build output actually exists, so this is
// safe to leave in for local dev too.
const ADMIN_DIST = path.join(__dirname, '..', '..', 'chatbot-admin', 'dist');
if (fs.existsSync(ADMIN_DIST)) {
  app.use('/admin', express.static(ADMIN_DIST, {
    setHeaders(res, filePath) {
      if (path.basename(filePath) === 'index.html') res.setHeader('Cache-Control', 'no-cache');
    },
  }));
  // SPA fallback — anything under /admin that isn't a real static file is a
  // client-side route (React Router), so always hand back index.html for it.
  app.get('/admin/*', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(ADMIN_DIST, 'index.html'));
  });
}

const WIDGET_SRC = path.join(__dirname, '..', '..', 'chatbot', 'src', 'widget.js');
app.get('/widget.js', (req, res) => {
  if (!fs.existsSync(WIDGET_SRC)) return res.status(404).send('widget.js not found on this server.');
  res.sendFile(WIDGET_SRC);
});

const WIDGET_DEMO_DIR = path.join(__dirname, '..', '..', 'chatbot', 'demo');
if (fs.existsSync(WIDGET_DEMO_DIR)) {
  app.use('/widget-demo', express.static(WIDGET_DEMO_DIR));
}

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
