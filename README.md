# Transaction Reconciliation Engine

Node.js service that ingests user and exchange transaction CSVs, matches rows with configurable tolerances, and exposes reconciliation reports over a REST API.

## Setup

```bash
cp .env.example .env
npm install
npm run ingest
npm run reconcile
npm start
npm test
```

Requires MongoDB running locally (or set `MONGODB_URI` in `.env`).

## API

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/reconcile` | Run reconciliation. Optional body: `{ "tolerances": { ... } }` |
| GET | `/report/:runId` | Full report as JSON. Add `?format=csv` for CSV. |
| GET | `/report/:runId/summary` | Run counts and metadata |
| GET | `/report/:runId/unmatched` | Unmatched rows only |
| GET | `/health` | Health check |

```bash
curl -X POST http://localhost:3000/reconcile \
  -H 'content-type: application/json' \
  -d '{ "tolerances": { "timestampSeconds": 120, "quantityPct": 0.05 } }'
```

## Config

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `MONGODB_URI` | `mongodb://localhost:27017/recon` | Mongo connection string |
| `PORT` | `3000` | API port |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, or `error` |
| `TIMESTAMP_TOLERANCE_SECONDS` | `300` | Max timestamp drift |
| `QUANTITY_TOLERANCE_PCT` | `0.01` | Max quantity drift (percent) |
| `PRICE_TOLERANCE_PCT` | `1.0` | Max price drift (percent) |

Tolerances can also be overridden per request on `POST /reconcile`.

## How matching works

1. Group exchange rows by asset.
2. For each valid user row, try an exact `transaction_id` match first.
3. Otherwise pick the closest exchange row with an equivalent type and timestamp inside the window.
4. Compare fields under tolerance — matched or conflicting.
5. Leftover rows become unmatched. Invalid ingestion rows are reported separately.

`TRANSFER_OUT` (user) and `TRANSFER_IN` (exchange) are treated as the same event.

## Project layout

```
src/
  config/       env config
  db/           Mongo connection
  models/       per-collection data access
  ingestion/    CSV parsing and validation
  services/     reconciliation logic and report export
  routes/       Express routes
  scripts/      CLI helpers
  utils/        asset/type helpers, csv, logging, validation
tests/
data/           sample CSVs
```
