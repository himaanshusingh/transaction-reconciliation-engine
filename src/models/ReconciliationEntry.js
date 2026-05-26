'use strict';

const { entries } = require('./collections');

const COLLECTION = 'reconciliation_entries';

const CATEGORIES = [
  'matched',
  'conflicting',
  'unmatched_user',
  'unmatched_exchange',
  'invalid_user',
  'invalid_exchange',
];

async function insertMany(docs) {
  if (!docs.length) return;
  await entries().insertMany(docs);
}

async function find(filter) {
  return entries().find(filter).toArray();
}

module.exports = {
  COLLECTION,
  CATEGORIES,
  insertMany,
  find,
};
