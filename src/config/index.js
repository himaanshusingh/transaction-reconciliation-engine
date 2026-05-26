'use strict';

require('dotenv').config();

const num = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const config = {
  port: num(process.env.PORT, 3000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/recon',
  logLevel: process.env.LOG_LEVEL || 'info',
  tolerances: {
    timestampSeconds: num(process.env.TIMESTAMP_TOLERANCE_SECONDS, 300),
    quantityPct: num(process.env.QUANTITY_TOLERANCE_PCT, 0.01),
    pricePct: num(process.env.PRICE_TOLERANCE_PCT, 1.0),
  },
};

module.exports = config;
