'use strict';

const { readCsvFile } = require('../utils/csv');
const { normalizeAsset } = require('../utils/assets');
const { normalizeType } = require('../utils/types');
const { Transaction } = require('../models');
const logger = require('../utils/logger');

function parseRow(row, source, sourceFile, rowNumber) {
  const issues = [];

  const transactionId = (row.transaction_id || '').trim() || null;
  if (!transactionId) {
    issues.push({ field: 'transaction_id', code: 'missing', message: 'Missing transaction_id' });
  }

  let timestamp = null;
  const rawTs = (row.timestamp || '').trim();
  if (!rawTs) {
    issues.push({ field: 'timestamp', code: 'missing', message: 'Missing timestamp' });
  } else {
    const d = new Date(rawTs);
    if (Number.isNaN(d.getTime())) {
      issues.push({
        field: 'timestamp',
        code: 'invalid',
        message: `Unparseable timestamp: "${rawTs}"`,
      });
    } else {
      timestamp = d;
    }
  }

  const type = normalizeType(row.type);
  if (!type) {
    issues.push({
      field: 'type',
      code: 'invalid',
      message: `Missing or unknown type: "${row.type ?? ''}"`,
    });
  }

  const asset = normalizeAsset(row.asset);
  if (!asset) {
    issues.push({ field: 'asset', code: 'missing', message: 'Missing asset' });
  }

  let quantity = null;
  const rawQty = (row.quantity || '').toString().trim();
  if (!rawQty) {
    issues.push({ field: 'quantity', code: 'missing', message: 'Missing quantity' });
  } else {
    const q = Number(rawQty);
    if (!Number.isFinite(q)) {
      issues.push({
        field: 'quantity',
        code: 'invalid',
        message: `Non-numeric quantity: "${rawQty}"`,
      });
    } else if (q <= 0) {
      issues.push({
        field: 'quantity',
        code: 'non_positive',
        message: `Quantity must be > 0, got ${q}`,
      });
    } else {
      quantity = q;
    }
  }

  let priceUsd = null;
  const rawPrice = (row.price_usd || '').toString().trim();
  if (rawPrice) {
    const p = Number(rawPrice);
    if (!Number.isFinite(p) || p < 0) {
      issues.push({
        field: 'price_usd',
        code: 'invalid',
        message: `Invalid price_usd: "${rawPrice}"`,
      });
    } else {
      priceUsd = p;
    }
  } else if (type === 'BUY' || type === 'SELL') {
    issues.push({
      field: 'price_usd',
      code: 'missing',
      message: 'price_usd required for BUY/SELL',
    });
  }

  let fee = null;
  const rawFee = (row.fee || '').toString().trim();
  if (rawFee) {
    const f = Number(rawFee);
    if (!Number.isFinite(f) || f < 0) {
      issues.push({ field: 'fee', code: 'invalid', message: `Invalid fee: "${rawFee}"` });
    } else {
      fee = f;
    }
  }

  return {
    source,
    sourceFile,
    rowNumber,
    transactionId,
    timestamp,
    type,
    asset,
    quantity,
    priceUsd,
    fee,
    note: (row.note || '').trim() || null,
    raw: row,
    valid: issues.length === 0,
    issues,
    importedAt: new Date(),
  };
}

async function ingestCsv(filePath, source) {
  logger.info('Starting ingestion', { filePath, source });

  await Transaction.deleteBySource(source);

  const rawRows = await readCsvFile(filePath);
  const rows = rawRows.map((row, index) => parseRow(row, source, filePath, index + 2));

  const seen = new Map();
  for (const row of rows) {
    if (!row.transactionId) continue;
    if (seen.has(row.transactionId)) {
      row.valid = false;
      row.issues.push({
        field: 'transaction_id',
        code: 'duplicate',
        message: `Duplicate transaction_id within ${source} file (first seen at row ${seen.get(row.transactionId)})`,
      });
    } else {
      seen.set(row.transactionId, row.rowNumber);
    }
  }

  await Transaction.insertMany(rows);

  const invalid = rows.filter((row) => !row.valid).length;
  logger.info('Ingestion complete', {
    source,
    total: rows.length,
    valid: rows.length - invalid,
    invalid,
  });

  return { total: rows.length, invalid };
}

module.exports = { ingestCsv, parseRow };
