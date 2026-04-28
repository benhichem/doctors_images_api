# Doctors API

A data pipeline and REST API that ingests the federal NPI (National Provider Identifier) dataset, matches each provider to their WebMD profile, and exposes the enriched data via HTTP.

---

## How it works

```
NPI CSV  →  seed script  →  WebMD search  →  validate match  →  PostgreSQL  →  REST API
```

1. The seed script streams the NPI CSV and fans out to N concurrent workers.
2. Each worker geocodes the doctor's practice address via the US Census API, builds a WebMD search query, and paginates through results.
3. Each result is compared against the NPI record using name similarity (≥80%) + state match.
4. The outcome is saved to PostgreSQL with a `match_confidence` flag: `matched`, `multiple`, or `unmatched`.
5. The REST API serves lookups by NPI.

---

## Prerequisites

- [Bun](https://bun.sh) v1.3+
- PostgreSQL database
- A display available for Puppeteer — on a headless server use `xvfb-run bun run seed`

---

## Setup

### 1. Install dependencies

```sh
bun install
```

### 2. Configure environment

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
PORT=3001

# WebMD API auth — leave these empty. The seed script captures and writes them automatically.
WEBMD_CLIENT_ID=
WEBMD_ENC_DATA=
WEBMD_TIMESTAMP=
```

Once the seed runs for the first time, these will be populated automatically and look something like:

```env
WEBMD_CLIENT_ID=ffd1790e-63c1-4c47-a6b9-e78fddd2de60
WEBMD_ENC_DATA=jBGJJGu9M0CysgYDBHx5Nd4z8CEk7M0Klu5YVWTODtI=
WEBMD_TIMESTAMP=1776804365
```

These tokens expire periodically. The seed handles rotation automatically — if WebMD returns a `400`, it launches a browser, captures fresh tokens, writes them back to `.env`, and continues without any manual intervention.

### 3. Run migrations

```sh
bun run migrate
```

This runs all `.sql` files in `src/db/migrations/` in order.

### 4. Add the NPI data file

Go to [https://download.cms.gov/nppes/NPI_Files.html](https://download.cms.gov/nppes/NPI_Files.html) and download the appropriate file depending on whether this is your first run or a recurring update:

**First run — Full Replacement Monthly NPI File (~1GB)**
Download the **Full Replacement Monthly NPI File**. This contains all 7M+ active providers and is the file you need to do the initial database population. This is a large download — expect it to take a while to seed.

**Subsequent runs — Weekly Update File (~40MB)**
Once the database is populated, you can keep it up to date by downloading the weekly update file (`npidata_pfile_<week-range>.csv`) and running the seed against it. The seed uses upsert logic, so it will add new providers and update changed ones without touching existing records. Just swap the file and re-run.

Once downloaded, extract the zip and place the CSV at:

```
src/db/seed/db_source/npidata_pfile_<date-range>.csv
```

Update the `FILE_PATH` constant in `src/db/seed/index.ts` to match the filename.

### 5. Run the seed

```sh
bun run seed
```

Optional flags:

| Flag | Default | Description |
|------|---------|-------------|
| `--concurrency=N` | `3` | Number of parallel workers |
| `--limit=N` | `0` (no limit) | Stop after N records |

Example — run 5 workers, process first 1000 records:

```sh
bun run seed --concurrency=5 --limit=1000
```

---

## Running the API

```sh
bun run start
```

Server starts on the port defined by `PORT` in `.env` (default `3000`).

---

## Docker

Two images are used: `Dockerfile` for the API (lean, no browser) and `Dockerfile.seed` for the seed (includes Google Chrome + Xvfb for the Puppeteer header refresh).

> If using Podman, replace `docker compose` with `podman compose`.

### Common commands

```sh
# Start API + database
docker compose up --build api postgres

# Start in the background
docker compose up --build -d api postgres

# Run the seed (starts Postgres automatically, place CSV in src/db/seed/db_source/ first)
docker compose run --rm seed

# Stop everything
docker compose down

# Stop and wipe the database
docker compose down -v
```

### Useful extras

```sh
# Stream logs
docker compose logs -f api

# Run migrations manually
docker compose exec api bun run migrate

# Shell into the API container
docker compose exec api sh

# Connect to Postgres directly
docker compose exec postgres psql -U admin -d mydb
```

---

## API Reference

### `GET /doctors/:npi`

Look up a single doctor by NPI.

**NPI rules:** must be exactly 10 digits, numeric.

```sh
curl http://localhost:3001/doctors/1811777683
```

**Response:**

```json
{
  "data": {
    "id": 1,
    "npi": "1811777683",
    "name": "JOHN SMITH",
    "firstname": null,
    "lastname": null,
    "specialty": "Family Medicine",
    "city": "New York",
    "state": "NY",
    "rating": 4.2,
    "about": "...",
    "image_url": "https://...",
    "webmd_url": "https://doctor.webmd.com/...",
    "match_confidence": "matched"
  }
}
```

`data` is `null` if no doctor exists for that NPI.

**Errors:**

| Code | Status | Meaning |
|------|--------|---------|
| `INVALID_NPI` | 400 | NPI is not a 10-digit numeric string |

---

### `GET /doctors?npis=`

Batch lookup — up to 10 NPIs in a single request.

```sh
curl "http://localhost:3001/doctors?npis=1811777683,1972444339"
```

**Response:**

```json
{
  "data": [
    { "npi": "1811777683", "data": { ... } },
    { "npi": "1972444339", "data": null }
  ]
}
```

- Results are returned in the same order as the input NPIs.
- Invalid NPIs (non-10-digit) are silently dropped; if all are invalid a `400` is returned.
- If more than 10 are provided, only the first 10 are processed.

**Errors:**

| Code | Status | Meaning |
|------|--------|---------|
| `MISSING_NPIS` | 400 | `npis` query param not provided |
| `INVALID_NPIS` | 400 | All provided NPIs failed validation |

---

## Match confidence flags

Every doctor record in the database carries a `match_confidence` value set during the seed:

| Value | Meaning |
|-------|---------|
| `matched` | Exactly one WebMD result passed name + state validation. High confidence. |
| `multiple` | More than one result passed validation (e.g. common name). First match is saved. Flag for manual review before relying on the data. |
| `unmatched` | No results returned, or none passed validation. `webmd_url` and profile fields will be `null`. |

---

## Project structure

```
src/
├── index.ts                   # Hono app + server entry point
├── config/                    # Env config (DATABASE_URL, PORT)
├── routes/                    # HTTP route definitions
├── controllers/               # Request validation and response shaping
├── services/                  # Database query logic
├── models/                    # TypeScript types for DB rows
├── db/
│   ├── index.ts               # Bun.sql connection
│   ├── migrate.ts             # Migration runner
│   ├── migrations/            # SQL migration files (run in order)
│   └── seed/
│       ├── index.ts           # Seed entry point (streaming CSV + worker pool)
│       ├── npi.types.ts       # TypeScript types for all 370+ NPI CSV fields
│       └── db_source/         # Place NPI CSV files here
├── search/
│   └── webmd.ts               # Builds WebMD search queries + geocodes addresses
└── scraper/
    ├── browser.ts             # Puppeteer browser launcher (real browser, anti-bot)
    ├── refresh_headers.ts     # Captures fresh WebMD auth headers via browser interception
    ├── extractor.ts           # Paginates WebMD search API results
    ├── validator.ts           # Name similarity + state match logic
    ├── worker.ts              # Per-record pipeline: search → validate → save
    ├── pool.ts                # Re-exports streamNPIRecords for worker use
    └── test_search.ts         # Manual test script for a single search query
```

---

## Testing

```sh
bun test
```

Tests use Hono's `app.fetch()` directly — no live server or network calls needed. A live database is required since queries hit PostgreSQL (no mocks).

---

## Key technical notes

- **Streaming CSV parser** — the NPI dataset contains 7M+ records. The seed never loads the full file into memory; it streams line-by-line and feeds a shared async iterator consumed by N concurrent workers.
- **Geocoding** — the US Census Geocoder API converts a doctor's practice address to lat/lng coordinates, which WebMD uses for location-based ranking. If geocoding fails, the search falls back to state-only.
- **Header rotation** — WebMD's internal search API (`kapi/secure/search/care/allresults`) uses short-lived encrypted auth tokens. The refresh script uses `puppeteer-real-browser` (which bypasses Turnstile bot detection) to intercept a live request and extract fresh tokens. Workers share a single refresh lock so only one browser runs at a time.
- **Upsert on conflict** — re-running the seed on the same NPI updates the existing row rather than inserting a duplicate, so partial runs are safe to resume.
