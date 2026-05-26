'use strict';

const express = require('express');
const { connect } = require('./db/connection');
const config = require('./config');
const logger = require('./utils/logger');
const reconciliationRoutes = require('./routes/reconciliation');

function createApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get("/", (req, res) => res.send("API is running..."));
  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use(reconciliationRoutes);

  app.use((err, req, res, _next) => {
    logger.error('Request failed', { path: req.path, message: err.message });
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Internal error' });
  });

  return app;
}

async function start() {
  await connect();
  const app = createApp();
  app.listen(config.port, () => {
    logger.info(`Reconciliation API listening on port ${config.port}`);
  });
}

if (require.main === module) {
  start().catch((err) => {
    logger.error('Failed to start server', { message: err.message });
    process.exit(1);
  });
}

module.exports = { createApp, start };
