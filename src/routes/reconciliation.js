'use strict';

const express = require('express');
const { reconcile } = require('../services/reconciler');
const { entriesToCsv } = require('../services/reportWriter');
const { ReconciliationRun, ReconciliationEntry } = require('../models');
const { parseTolerances } = require('../utils/validate');

const router = express.Router();

router.post('/reconcile', async (req, res, next) => {
  try {
    const tolerances = parseTolerances(req.body || {});
    const result = await reconcile(tolerances);
    res.status(202).json({
      runId: result.runId,
      counts: result.counts,
      tolerances: result.tolerances,
      links: {
        full: `/report/${result.runId}`,
        summary: `/report/${result.runId}/summary`,
        unmatched: `/report/${result.runId}/unmatched`,
      },
    });
  } catch (err) {
    next(err);
  }
});

async function loadRun(runId) {
  const run = await ReconciliationRun.findByRunId(runId);
  if (!run) {
    const err = new Error(`Run not found: ${runId}`);
    err.status = 404;
    throw err;
  }
  return run;
}

router.get('/report/:runId', async (req, res, next) => {
  try {
    const run = await loadRun(req.params.runId);
    const reportEntries = await ReconciliationEntry.find({ runId: run.runId });

    if ((req.query.format || '').toLowerCase() === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="report-${run.runId}.csv"`);
      return res.send(entriesToCsv(reportEntries));
    }

    res.json({ run, entries: reportEntries });
  } catch (err) {
    next(err);
  }
});

router.get('/report/:runId/summary', async (req, res, next) => {
  try {
    const run = await loadRun(req.params.runId);
    res.json({
      runId: run.runId,
      status: run.status,
      counts: run.counts,
      tolerances: run.tolerances,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/report/:runId/unmatched', async (req, res, next) => {
  try {
    const run = await loadRun(req.params.runId);
    const reportEntries = await ReconciliationEntry.find({
      runId: run.runId,
      category: { $in: ['unmatched_user', 'unmatched_exchange'] },
    });
    res.json({ runId: run.runId, count: reportEntries.length, entries: reportEntries });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
