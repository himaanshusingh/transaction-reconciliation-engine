'use strict';

/**
 * Transaction type normalization and cross-source equivalence.
 *
 * A transfer is the same physical event from two perspectives:
 *   - User says   TRANSFER_OUT  (money leaving their wallet)
 *   - Exchange says TRANSFER_IN (same money arriving at the exchange)
 * and vice versa. The matcher treats these as equivalent.
 */
const VALID_TYPES = new Set(['BUY', 'SELL', 'TRANSFER_IN', 'TRANSFER_OUT']);

function normalizeType(raw) {
  if (raw == null) return null;
  const t = String(raw).trim().toUpperCase();
  return VALID_TYPES.has(t) ? t : null;
}

/**
 * Returns true if a user-side type and an exchange-side type refer to
 * the same business event.
 */
function typesEquivalent(userType, exchangeType) {
  if (!userType || !exchangeType) return false;
  if (userType === exchangeType) return true;
  if (userType === 'TRANSFER_OUT' && exchangeType === 'TRANSFER_IN') return true;
  if (userType === 'TRANSFER_IN' && exchangeType === 'TRANSFER_OUT') return true;
  return false;
}

module.exports = { VALID_TYPES, normalizeType, typesEquivalent };
