'use strict';

const path = require('path');
const { connect, disconnect } = require('../db/connection');
const { ingestCsv } = require('../ingestion/csvIngestor');
const logger = require('../utils/logger');

async function main() {
  const userPath = process.argv[2] || path.resolve(__dirname, '../../data/user_transactions.csv');
  const exchangePath =
    process.argv[3] || path.resolve(__dirname, '../../data/exchange_transactions.csv');

  await connect();
  const userRes = await ingestCsv(userPath, 'user');
  const exchangeRes = await ingestCsv(exchangePath, 'exchange');
  logger.info('Ingestion finished', { userRes, exchangeRes });
  await disconnect();
}

main().catch((err) => {
  logger.error('Ingestion failed', { message: err.message });
  process.exit(1);
});
