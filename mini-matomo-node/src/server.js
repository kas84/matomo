const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { connect } = require('./db/mongo');
const collectRouter = require('./routes/collect');
const reportsRouter = require('./routes/reports');

async function bootstrap() {
  await connect();

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: config.bodyLimit }));

  if (config.allowedOrigins.length > 0) {
    app.use(cors({ origin: config.allowedOrigins }));
  }

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.get('/tracker.js', (_req, res) => {
    res.sendFile(path.join(__dirname, 'tracker', 'tracker.js'));
  });

  app.use(collectRouter);
  app.use(reportsRouter);

  app.use((err, _req, res, _next) => {
    // Catch-all simplificado
    return res.status(500).json({ error: 'Unexpected error', detail: err?.message });
  });

  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`mini-matomo listening on http://localhost:${config.port}`);
  });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', err);
  process.exit(1);
});
