'use strict';

function parseTolerances(body = {}) {
  const tolerances = body.tolerances;
  if (!tolerances) return {};

  const allowed = ['timestampSeconds', 'quantityPct', 'pricePct'];
  const parsed = {};

  for (const key of allowed) {
    if (tolerances[key] === undefined) continue;
    const value = tolerances[key];
    if (typeof value !== 'number' || value < 0 || !Number.isFinite(value)) {
      const err = new Error(`Invalid tolerance value for ${key}`);
      err.status = 400;
      throw err;
    }
    parsed[key] = value;
  }

  return parsed;
}

module.exports = { parseTolerances };
