'use strict';

const { MongoClient } = require('mongodb');
const config = require('../config');
const logger = require('../utils/logger');

let client;
let db;

async function connect() {
  if (db) return db;
  client = new MongoClient(`${config.mongoUri}/transaction-reconciliation`, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  db = client.db();
  await ensureIndexes(db);
  logger.info('Connected to MongoDB');
  return db;
}

function getDb() {
  if (!db) {
    throw new Error('Database not connected. Call connect() first.');
  }
  return db;
}

async function disconnect() {
  if (!client) return;
  await client.close();
  client = undefined;
  db = undefined;
}

async function ensureIndexes(database) {
  await database.collection('transactions').createIndexes([
    { key: { source: 1 } },
    { key: { source: 1, valid: 1 } },
    { key: { source: 1, asset: 1, timestamp: 1 } },
  ]);
  await database.collection('reconciliation_runs').createIndex({ runId: 1 }, { unique: true });
  await database.collection('reconciliation_entries').createIndexes([
    { key: { runId: 1 } },
    { key: { runId: 1, category: 1 } },
  ]);
}

module.exports = { connect, getDb, disconnect };
