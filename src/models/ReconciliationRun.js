'use strict';

const { runs } = require('./collections');

const COLLECTION = 'reconciliation_runs';

const EMPTY_COUNTS = {
  matched: 0,
  conflicting: 0,
  unmatchedUser: 0,
  unmatchedExchange: 0,
  invalidUser: 0,
  invalidExchange: 0,
};

async function create(runId, tolerances) {
  const doc = {
    runId,
    status: 'running',
    tolerances,
    counts: { ...EMPTY_COUNTS },
    startedAt: new Date(),
  };
  await runs().insertOne(doc);
  return doc;
}

async function update(runId, patch) {
  await runs().updateOne({ runId }, { $set: patch });
}

async function findByRunId(runId) {
  return runs().findOne({ runId });
}

module.exports = {
  COLLECTION,
  create,
  update,
  findByRunId,
};
