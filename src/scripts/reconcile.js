'use strict';

const fs = require('fs');
const path = require('path');
const { connect, disconnect } = require('../db/connection');
const { reconcile } = require('../services/reconciler');
const { entriesToCsv } = require('../services/reportWriter');
const { ReconciliationEntry } = require('../models');
const logger = require('../utils/logger');

async function main() {
  await connect();
  const { runId, counts } = await reconcile();
  const reportEntries = await ReconciliationEntry.find({ runId });
  const outDir = path.resolve(__dirname, '../../out');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `reconciliation-${runId}.csv`);
  fs.writeFileSync(outPath, entriesToCsv(reportEntries));
  logger.info('Report written', { runId, counts, outPath });
  await disconnect();
}

main().catch((err) => {
  logger.error('Reconciliation script failed', { message: err.message });
  process.exit(1);
});
