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
    // eslint-disable-next-line no-console
    console.log(`Disha backend listening on :${env.port} (${env.nodeEnv}) — modules: ${[...env.enabledModules].join(', ') || 'none'}`);
  });
}

start();
