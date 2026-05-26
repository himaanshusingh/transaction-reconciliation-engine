'use strict';

const { transactions } = require('./collections');

const COLLECTION = 'transactions';

async function deleteBySource(source) {
  await transactions().deleteMany({ source });
}

async function insertMany(docs) {
  if (!docs.length) return;
  await transactions().insertMany(docs);
}

async function find(filter) {
  return transactions().find(filter).toArray();
}

module.exports = {
  COLLECTION,
  deleteBySource,
  insertMany,
  find,
};
