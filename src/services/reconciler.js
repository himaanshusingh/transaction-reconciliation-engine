'use strict';

const crypto = require('crypto');
const { Transaction, ReconciliationRun, ReconciliationEntry } = require('../models');
const { typesEquivalent } = require('../utils/types');
const config = require('../config');
const logger = require('../utils/logger');

function quantityWithinTolerance(a, b, pct) {
  if (a == null || b == null) return false;
  const denom = Math.max(Math.abs(a), Math.abs(b), 1e-12);
  return (Math.abs(a - b) / denom) * 100 <= pct;
}

function timestampWithinTolerance(a, b, seconds) {
  if (!a || !b) return false;
  return Math.abs(a.getTime() - b.getTime()) / 1000 <= seconds;
}

function priceWithinTolerance(a, b, pct) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  const denom = Math.max(Math.abs(a), Math.abs(b), 1e-12);
  return (Math.abs(a - b) / denom) * 100 <= pct;
}

function compareFields(userTxn, exchangeTxn, tolerances) {
  const diffs = {};
  if (!typesEquivalent(userTxn.type, exchangeTxn.type)) {
    diffs.type = { user: userTxn.type, exchange: exchangeTxn.type };
  }
  if (userTxn.asset !== exchangeTxn.asset) {
    diffs.asset = { user: userTxn.asset, exchange: exchangeTxn.asset };
  }
  if (!quantityWithinTolerance(userTxn.quantity, exchangeTxn.quantity, tolerances.quantityPct)) {
    diffs.quantity = {
      user: userTxn.quantity,
      exchange: exchangeTxn.quantity,
      tolerancePct: tolerances.quantityPct,
    };
  }
  if (
    !timestampWithinTolerance(userTxn.timestamp, exchangeTxn.timestamp, tolerances.timestampSeconds)
  ) {
    diffs.timestamp = {
      user: userTxn.timestamp,
      exchange: exchangeTxn.timestamp,
      toleranceSeconds: tolerances.timestampSeconds,
    };
  }
  if (!priceWithinTolerance(userTxn.priceUsd, exchangeTxn.priceUsd, tolerances.pricePct)) {
    diffs.priceUsd = {
      user: userTxn.priceUsd,
      exchange: exchangeTxn.priceUsd,
      tolerancePct: tolerances.pricePct,
    };
  }
  return diffs;
}

function proximityScore(userTxn, exchangeTxn) {
  const dt =
    userTxn.timestamp && exchangeTxn.timestamp
      ? Math.abs(userTxn.timestamp.getTime() - exchangeTxn.timestamp.getTime())
      : Number.MAX_SAFE_INTEGER;
  const dq =
    userTxn.quantity != null && exchangeTxn.quantity != null
      ? Math.abs(userTxn.quantity - exchangeTxn.quantity)
      : Number.MAX_SAFE_INTEGER;
  return dt + dq * 1000;
}

function txnKey(txn) {
  return String(txn._id);
}

async function reconcile(toleranceOverrides = {}) {
  const tolerances = { ...config.tolerances, ...toleranceOverrides };
  const runId = crypto.randomUUID();

  await ReconciliationRun.create(runId, tolerances);
  logger.info('Reconciliation run started', { runId, tolerances });

  try {
    const [userValid, exchangeValid, userInvalid, exchangeInvalid] = await Promise.all([
      Transaction.find({ source: 'user', valid: true }),
      Transaction.find({ source: 'exchange', valid: true }),
      Transaction.find({ source: 'user', valid: false }),
      Transaction.find({ source: 'exchange', valid: false }),
    ]);

    const exchangeByAsset = new Map();
    for (const row of exchangeValid) {
      if (!exchangeByAsset.has(row.asset)) exchangeByAsset.set(row.asset, []);
      exchangeByAsset.get(row.asset).push(row);
    }

    const consumed = new Set();
    const reportEntries = [];

    for (const userTxn of userValid) {
      const pool = exchangeByAsset.get(userTxn.asset) || [];
      let best = null;
      let bestScore = Infinity;
      let bestStrategy = null;

      for (const exchangeTxn of pool) {
        if (consumed.has(txnKey(exchangeTxn))) continue;
        if (
          exchangeTxn.transactionId &&
          userTxn.transactionId &&
          exchangeTxn.transactionId === userTxn.transactionId
        ) {
          best = exchangeTxn;
          bestStrategy = 'id';
          break;
        }
      }

      if (!best) {
        for (const exchangeTxn of pool) {
          if (consumed.has(txnKey(exchangeTxn))) continue;
          if (!typesEquivalent(userTxn.type, exchangeTxn.type)) continue;
          if (
            !timestampWithinTolerance(
              userTxn.timestamp,
              exchangeTxn.timestamp,
              tolerances.timestampSeconds
            )
          ) {
            continue;
          }
          const score = proximityScore(userTxn, exchangeTxn);
          if (score < bestScore) {
            best = exchangeTxn;
            bestScore = score;
            bestStrategy = 'proximity';
          }
        }
      }

      if (!best) {
        reportEntries.push({
          runId,
          category: 'unmatched_user',
          reason: 'No exchange transaction within tolerance window',
          userTxn,
        });
        continue;
      }

      consumed.add(txnKey(best));
      const diffs = compareFields(userTxn, best, tolerances);
      const isMatched = Object.keys(diffs).length === 0;

      reportEntries.push({
        runId,
        category: isMatched ? 'matched' : 'conflicting',
        matchStrategy: bestStrategy,
        reason: isMatched
          ? `Matched via ${bestStrategy} within tolerance`
          : `Paired via ${bestStrategy} but fields differ beyond tolerance: ${Object.keys(diffs).join(', ')}`,
        userTxn,
        exchangeTxn: best,
        diffs: isMatched ? undefined : diffs,
      });
    }

    for (const exchangeTxn of exchangeValid) {
      if (consumed.has(txnKey(exchangeTxn))) continue;
      reportEntries.push({
        runId,
        category: 'unmatched_exchange',
        reason: 'No user transaction within tolerance window',
        exchangeTxn,
      });
    }

    for (const userTxn of userInvalid) {
      reportEntries.push({
        runId,
        category: 'invalid_user',
        reason: userTxn.issues.map((issue) => `${issue.field}: ${issue.message}`).join('; ') || 'Invalid row',
        userTxn,
      });
    }

    for (const exchangeTxn of exchangeInvalid) {
      reportEntries.push({
        runId,
        category: 'invalid_exchange',
        reason:
          exchangeTxn.issues.map((issue) => `${issue.field}: ${issue.message}`).join('; ') ||
          'Invalid row',
        exchangeTxn,
      });
    }

    await ReconciliationEntry.insertMany(reportEntries);

    const counts = {
      matched: reportEntries.filter((entry) => entry.category === 'matched').length,
      conflicting: reportEntries.filter((entry) => entry.category === 'conflicting').length,
      unmatchedUser: reportEntries.filter((entry) => entry.category === 'unmatched_user').length,
      unmatchedExchange: reportEntries.filter((entry) => entry.category === 'unmatched_exchange')
        .length,
      invalidUser: reportEntries.filter((entry) => entry.category === 'invalid_user').length,
      invalidExchange: reportEntries.filter((entry) => entry.category === 'invalid_exchange')
        .length,
    };

    await ReconciliationRun.update(runId, {
      counts,
      status: 'completed',
      completedAt: new Date(),
    });

    logger.info('Reconciliation run completed', { runId, counts });
    return { runId, counts, tolerances };
  } catch (err) {
    await ReconciliationRun.update(runId, {
      status: 'failed',
      error: err.message,
      completedAt: new Date(),
    });
    logger.error('Reconciliation run failed', { runId, err: err.message });
    throw err;
  }
}

module.exports = {
  reconcile,
  quantityWithinTolerance,
  timestampWithinTolerance,
  priceWithinTolerance,
  compareFields,
};
