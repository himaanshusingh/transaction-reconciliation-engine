'use strict';

const config = require('../config');

const ORDER = ['debug', 'info', 'warn', 'error'];

function shouldLog(level) {
  return ORDER.indexOf(level) >= ORDER.indexOf(config.logLevel);
}

function write(level, message, meta) {
  if (!shouldLog(level)) return;
  const fn = level === 'error' ? console.error : console.log;
  if (meta !== undefined) {
    fn(`[${level}] ${message}`, meta);
  } else {
    fn(`[${level}] ${message}`);
  }
}

module.exports = {
  debug: (msg, meta) => write('debug', msg, meta),
  info: (msg, meta) => write('info', msg, meta),
  warn: (msg, meta) => write('warn', msg, meta),
  error: (msg, meta) => write('error', msg, meta),
};
