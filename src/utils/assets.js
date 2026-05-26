'use strict';

/**
 * Asset alias normalization. Maps human-friendly names ("bitcoin")
 * and case variants to a canonical ticker symbol.
 *
 * Extend the ALIASES map as new instruments appear. Anything not
 * found in the map is normalized via upper-casing + trimming, so
 * unknown but consistent tickers still reconcile.
 */
const ALIASES = {
  bitcoin: 'BTC',
  xbt: 'BTC',
  ether: 'ETH',
  ethereum: 'ETH',
  solana: 'SOL',
  tether: 'USDT',
  polygon: 'MATIC',
  matic: 'MATIC',
  chainlink: 'LINK',
};

function normalizeAsset(raw) {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (ALIASES[lower]) return ALIASES[lower];
  return trimmed.toUpperCase();
}

module.exports = { normalizeAsset, ALIASES };
