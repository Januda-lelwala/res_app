# Database Integration — Places Caching Layer

## Overview

Previously, every time a user searched for a place the app made a live call to the Google Places API. Now there is a SQLite database sitting between the app and Google. Requests are served from the database when the data is fresh, and Google is only called when the cache is stale or the place hasn't been seen before.

```
User Request
     │
     ▼
/api/places
     │
     ├─── Place in DB and fresh? ──► Return from DB  (no Google call)
     │
     └─── Missing or stale? ──────► Call Google Places API
                                          │
                                          ▼
                                     Store in DB
                                          │
                                          ▼
                                     Return to user
```

---

## Files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Defines the `Place` table schema |
| `prisma/migrations/` | SQL migration history |
| `prisma/dev.db` | The SQLite database file |
| `lib/db.ts` | Prisma client singleton (one instance shared across requests) |
| `lib/google-places.ts` | Raw Google Places API fetcher — isolated, no DB logic |
| `lib/places-db.ts` | All DB read/write helpers |
| `app/api/places/route.ts` | Cache-first endpoint used by the frontend |
| `app/api/places/sync/route.ts` | Separate layer for refreshing DB data from Google |

---

## The Database Schema

```prisma
model Place {
  id            String   @id @default(cuid())
  placeId       String   @unique   // Google's place_id
  name          String
  rating        Float?
  totalRatings  Int?
  priceLevel    Int?               // Google's 0–4 scale
  address       String?
  openNow       Boolean?
  photoUrl      String?
  lat           Float?
  lng           Float?
  types         String             // JSON array, e.g. ["restaurant","food"]
  searchAliases String             // JSON array of search queries that matched this place
  lastSyncedAt  DateTime           // When data was last fetched from Google
  createdAt     DateTime
  updatedAt     DateTime
}
```

`searchAliases` is the key field for name matching. When Claude recommends "Fort Printers" and Google returns a place named "The Fort Printers", both strings are stored. The next time either name is searched, the cached result is found without touching Google.

---

## How a Request Flows

### 1. Frontend calls `/api/places`

```
POST /api/places
{ "query": "The Fort Printers" }
```

### 2. Cache check in `lib/places-db.ts`

`findCachedPlace("The Fort Printers")` loads all rows and runs in-memory name matching:

```
Does any row match where:
  - row.name === query (case-insensitive), OR
  - row.name contains query, OR
  - query contains row.name, OR
  - any alias in row.searchAliases matches similarly?
```

### 3a. Cache hit and fresh → return immediately

If a match is found and `lastSyncedAt` is within the TTL window (default 24 hours), the place is returned straight from the DB. No Google API call is made.

```json
{ "places": [{ "placeId": "...", "name": "The Fort Printers", ... }], "source": "cache" }
```

### 3b. Cache miss or stale → call Google

`fetchPlacesFromGoogle("The Fort Printers")` is called. It hits:

```
GET https://maps.googleapis.com/maps/api/place/textsearch/json
  ?query=The Fort Printers Galle Sri Lanka
  &type=establishment
  &locationbias=rectangle:5.98,80.18|6.10,80.28
  &key=...
```

The location bias keeps results within the Galle bounding box.

### 4. Store results in DB

Each result from Google is upserted into the `Place` table via `upsertPlace()`. The original search query is appended to `searchAliases` if not already there. `lastSyncedAt` is set to now.

### 5. Return to frontend

Same response shape as before — the frontend doesn't know or care whether data came from cache or Google.

---

## The Sync Layer

`/api/places/sync` is a separate admin endpoint for refreshing data. It has no role in the normal request flow — it exists purely for database maintenance.

### GET `/api/places/sync` — check cache health

Returns counts and timestamps:

```json
{
  "total": 61,
  "fresh": 61,
  "stale": 0,
  "ttlHours": 24,
  "oldestSync": "2026-04-01T10:59:15.176Z",
  "newestSync": "2026-04-01T11:00:08.111Z"
}
```

### POST `/api/places/sync` — re-sync stale places

Reads all places in the DB whose `lastSyncedAt` is older than the TTL, calls Google for each, and updates the DB.

```bash
curl -X POST http://localhost:3000/api/places/sync \
  -H "Authorization: Bearer your-secret"
```

Response:

```json
{ "success": true, "synced": 12, "failed": 0, "skipped": 1 }
```

### POST `/api/places/sync` with `names` — seed new places

Useful for pre-populating the DB with known places before users search for them.

```bash
curl -X POST http://localhost:3000/api/places/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret" \
  -d '{ "names": ["Amangalla", "The Fort Printers", "Ropewalk"] }'
```

### POST with `staleOnly: false` — force full refresh

Re-syncs every place in the DB regardless of age:

```bash
curl -X POST http://localhost:3000/api/places/sync \
  -H "Content-Type: application/json" \
  -d '{ "staleOnly": false }'
```

---

## Configuration

All config lives in `.env.local`:

```bash
# Path to the SQLite database file
DATABASE_URL="file:./dev.db"

# How long cached place data is considered fresh (default: 24)
PLACES_CACHE_TTL_HOURS=24

# Protect the sync endpoint (optional — leave unset to keep it open)
SYNC_SECRET=your-secret-here
```

---

## Prisma + SQLite Setup

The project uses **Prisma 7** with the `@prisma/adapter-better-sqlite3` driver adapter. Prisma 7 no longer supports direct SQLite connections — it requires an adapter.

`lib/db.ts` wires this up:

```typescript
const url = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url: url.replace(/^file:/, "") });
const prisma = new PrismaClient({ adapter });
```

The singleton pattern (`globalForPrisma`) prevents creating a new DB connection on every hot-reload in development.

### Commands

```bash
# After cloning — generate the Prisma client
npx prisma generate

# Apply migrations to create/update the DB schema
npx prisma migrate dev

# Inspect the DB directly
npx prisma studio
```

---

## Production Note

SQLite doesn't work on **Vercel** (no persistent filesystem between serverless invocations). To deploy to production, switch to a hosted database:

1. Change `provider` in `prisma/schema.prisma` from `"sqlite"` to `"postgresql"`
2. Update `DATABASE_URL` in your Vercel environment variables to a Postgres connection string (e.g. from Supabase or Neon)
3. Remove the `better-sqlite3` adapter and install `@prisma/adapter-pg` instead
4. Run `npx prisma migrate deploy` to apply the schema

All application code in `lib/places-db.ts`, `lib/google-places.ts`, and the API routes stays the same.

---

## Current DB State

As of the initial population, the DB holds **61 places** across Galle — restaurants, cafes, bars, and beachside spots. All data is sourced from real Google Places API results and cached for 24 hours.
