const fs = require('fs');
const path = require('path');
const app = require('./app');
const env = require('./config/env');
const { pingDb } = require('./config/db');

async function start() {
  const dbUp = await pingDb();
  if (!dbUp) {
    // eslint-disable-next-line no-console
    console.warn(
      `[startup] Could not reach MySQL at ${env.db.host}:${env.db.port}/${env.db.database}. ` +
      'The server will still start, but every DB-backed route will fail until the connection is fixed — check backend/.env.'
    );
  }

  app.listen(env.port, () => {
    const base = env.publicUrl || `http://localhost:${env.port}`;
    const adminBuilt = fs.existsSync(path.join(__dirname, '..', '..', 'chatbot-admin', 'dist', 'index.html'));
    const widgetPresent = fs.existsSync(path.join(__dirname, '..', '..', 'chatbot', 'src', 'widget.js'));

    // eslint-disable-next-line no-console
    console.log([
      '',
      '========================================================',
      ` Disha backend is RUNNING  —  mode: ${env.nodeEnv}  —  port: ${env.port}`,
      ` modules: ${[...env.enabledModules].join(', ') || 'none'}`,
      ` CORS allowed : ${env.corsAllowedOrigins.join(', ')}`,
      ` MySQL: ${dbUp ? 'connected' : 'NOT CONNECTED (see warning above)'} (${env.db.host}:${env.db.port}/${env.db.database})`,
      '========================================================',
      ` API health   :  ${base}/api/v1/health`,
      ` Admin portal :  ${base}/admin${adminBuilt ? '' : '   <-- NOT FOUND: run `npm run build` in chatbot-admin/ and re-deploy its dist/ folder'}`,
      ` Widget script:  ${base}/widget.js${widgetPresent ? '' : '   <-- NOT FOUND: chatbot/src/widget.js is missing on this server'}`,
      ` Widget demo  :  ${base}/widget-demo`,
      '========================================================',
      '',
    ].join('\n'));
  });
}

start();
