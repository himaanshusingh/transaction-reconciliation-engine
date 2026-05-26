'use strict';

const { toCsv } = require('../utils/csv');

const COLUMNS = [
  'category',
  'reason',
  'match_strategy',
  'user_transaction_id',
  'user_timestamp',
  'user_type',
  'user_asset',
  'user_quantity',
  'user_price_usd',
  'user_fee',
  'user_note',
  'exchange_transaction_id',
  'exchange_timestamp',
  'exchange_type',
  'exchange_asset',
  'exchange_quantity',
  'exchange_price_usd',
  'exchange_fee',
  'exchange_note',
  'diffs',
];

function entriesToCsv(entries) {
  const records = entries.map((entry) => ({
    category: entry.category,
    reason: entry.reason || '',
    match_strategy: entry.matchStrategy || '',
    user_transaction_id: entry.userTxn?.transactionId ?? '',
    user_timestamp: entry.userTxn?.timestamp ? new Date(entry.userTxn.timestamp).toISOString() : '',
    user_type: entry.userTxn?.type ?? '',
    user_asset: entry.userTxn?.asset ?? '',
    user_quantity: entry.userTxn?.quantity ?? '',
    user_price_usd: entry.userTxn?.priceUsd ?? '',
    user_fee: entry.userTxn?.fee ?? '',
    user_note: entry.userTxn?.note ?? '',
    exchange_transaction_id: entry.exchangeTxn?.transactionId ?? '',
    exchange_timestamp: entry.exchangeTxn?.timestamp
      ? new Date(entry.exchangeTxn.timestamp).toISOString()
      : '',
    exchange_type: entry.exchangeTxn?.type ?? '',
    exchange_asset: entry.exchangeTxn?.asset ?? '',
    exchange_quantity: entry.exchangeTxn?.quantity ?? '',
    exchange_price_usd: entry.exchangeTxn?.priceUsd ?? '',
    exchange_fee: entry.exchangeTxn?.fee ?? '',
    exchange_note: entry.exchangeTxn?.note ?? '',
    diffs: entry.diffs ? JSON.stringify(entry.diffs) : '',
  }));

  return toCsv(records, COLUMNS);
}

module.exports = { entriesToCsv };
