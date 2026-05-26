'use strict';

const fs = require('fs/promises');

function escapeCell(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];

  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = lines[i].split(',');
    const row = {};
    for (let j = 0; j < headers.length; j += 1) {
      row[headers[j]] = (values[j] ?? '').trim();
    }
    rows.push(row);
  }

  return rows;
}

async function readCsvFile(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  return parseCsv(text);
}

function toCsv(records, columns) {
  const header = columns.join(',');
  const body = records.map((record) =>
    columns.map((col) => escapeCell(record[col])).join(',')
  );
  return [header, ...body].join('\n');
}

module.exports = { parseCsv, readCsvFile, toCsv, escapeCell };
