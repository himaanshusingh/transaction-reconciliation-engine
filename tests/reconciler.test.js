'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  quantityWithinTolerance,
  timestampWithinTolerance,
  priceWithinTolerance,
  compareFields,
} = require('../src/services/reconciler');
const { normalizeAsset } = require('../src/utils/assets');
const { normalizeType, typesEquivalent } = require('../src/utils/types');
const { parseRow } = require('../src/ingestion/csvIngestor');

test('asset aliases normalize', () => {
  assert.equal(normalizeAsset('bitcoin'), 'BTC');
  assert.equal(normalizeAsset('BTC'), 'BTC');
  assert.equal(normalizeAsset(' eth '), 'ETH');
  assert.equal(normalizeAsset('XYZ'), 'XYZ');
});

test('type normalization rejects garbage', () => {
  assert.equal(normalizeType('buy'), 'BUY');
  assert.equal(normalizeType('whatever'), null);
});

test('TRANSFER_IN and TRANSFER_OUT are equivalent across sources', () => {
  assert.ok(typesEquivalent('TRANSFER_OUT', 'TRANSFER_IN'));
  assert.ok(typesEquivalent('TRANSFER_IN', 'TRANSFER_OUT'));
  assert.ok(typesEquivalent('BUY', 'BUY'));
  assert.ok(!typesEquivalent('BUY', 'SELL'));
});

test('quantity tolerance respects percent', () => {
  assert.ok(quantityWithinTolerance(1.0, 1.0001, 0.01));
  assert.ok(!quantityWithinTolerance(1.0, 1.01, 0.01));
});

test('timestamp tolerance respects window', () => {
  const a = new Date('2024-03-01T09:00:00Z');
  const b = new Date('2024-03-01T09:04:59Z');
  const c = new Date('2024-03-01T09:06:00Z');
  assert.ok(timestampWithinTolerance(a, b, 300));
  assert.ok(!timestampWithinTolerance(a, c, 300));
});

test('price tolerance treats missing-both as ok', () => {
  assert.ok(priceWithinTolerance(null, null, 1));
  assert.ok(!priceWithinTolerance(null, 10, 1));
});

test('compareFields returns no diff on a clean match', () => {
  const u = {
    type: 'BUY',
    asset: 'BTC',
    quantity: 0.5,
    priceUsd: 62000,
    timestamp: new Date('2024-03-01T09:00:00Z'),
  };
  const e = {
    type: 'BUY',
    asset: 'BTC',
    quantity: 0.5,
    priceUsd: 62000,
    timestamp: new Date('2024-03-01T09:00:32Z'),
  };
  const diffs = compareFields(u, e, { timestampSeconds: 300, quantityPct: 0.01, pricePct: 1 });
  assert.deepEqual(diffs, {});
});

test('parseRow flags negative quantity and bad timestamp', () => {
  const bad = parseRow(
    {
      transaction_id: 'USR-019',
      timestamp: '2024-03-10T08:00:00Z',
      type: 'BUY',
      asset: 'BTC',
      quantity: '-0.1',
      price_usd: '62000',
      fee: '0.0001',
    },
    'user',
    'x',
    2
  );
  assert.equal(bad.valid, false);
  assert.ok(bad.issues.some((i) => i.field === 'quantity'));

  const bad2 = parseRow(
    {
      transaction_id: 'USR-018',
      timestamp: '2024-03-09T',
      type: 'SELL',
      asset: 'ETH',
      quantity: '0.3',
      price_usd: '3510',
    },
    'user',
    'x',
    3
  );
  assert.equal(bad2.valid, false);
  assert.ok(bad2.issues.some((i) => i.field === 'timestamp'));
});
