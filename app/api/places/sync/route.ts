/**
 * /api/places/sync — separate layer that refreshes place data from Google Places API.
 *
 * GET  /api/places/sync            → cache stats (total, fresh, stale)
 * POST /api/places/sync            → re-sync stale (or all) places already in the DB
 * POST /api/places/sync { names }  → seed/refresh specific place names from the API
 *
 * Protect with SYNC_SECRET env var:
 *   Authorization: Bearer <SYNC_SECRET>
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchPlacesFromGoogle } from "@/lib/google-places";
import {
  getCacheStats,
  getAllPlaces,
  getStalePlaces,
  upsertPlace,
} from "@/lib/places-db";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.SYNC_SECRET;
  if (!secret) return true; // no secret configured → open
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET() {
  const stats = await getCacheStats();
  return NextResponse.json(stats);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as {
    names?: string[];
    staleOnly?: boolean;
  };

  const { names, staleOnly = true } = body;
  const results = { synced: 0, failed: 0, skipped: 0 };

  if (names && names.length > 0) {
    // Seed / refresh a specific list of place names
    for (const name of names) {
      try {
        const places = await fetchPlacesFromGoogle(name);
        if (places.length === 0) {
          results.skipped++;
          continue;
        }
        for (const place of places) {
          await upsertPlace(place, name);
          results.synced++;
        }
      } catch (err) {
        console.error(`Sync failed for "${name}":`, err);
        results.failed++;
      }
    }
  } else {
    // Re-sync places already in the DB (stale ones by default, all if staleOnly=false)
    const toSync = staleOnly ? await getStalePlaces() : await getAllPlaces();

    if (toSync.length === 0) {
      return NextResponse.json({ message: "Nothing to sync", ...results });
    }

    for (const cached of toSync) {
      try {
        const places = await fetchPlacesFromGoogle(cached.name);
        if (places.length === 0) {
          results.skipped++;
          continue;
        }
        for (const place of places) {
          await upsertPlace(place, cached.name);
          results.synced++;
        }
      } catch (err) {
        console.error(`Sync failed for "${cached.name}":`, err);
        results.failed++;
      }
    }
  }

  return NextResponse.json({ success: true, ...results });
}
