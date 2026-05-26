'use strict';

const { getDb } = require('../db/connection');

module.exports = {
  transactions: () => getDb().collection('transactions'),
  runs: () => getDb().collection('reconciliation_runs'),
  entries: () => getDb().collection('reconciliation_entries'),
};
