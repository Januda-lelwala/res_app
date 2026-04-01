import { NextRequest, NextResponse } from "next/server";
import { fetchPlacesFromGoogle } from "@/lib/google-places";
import { findCachedPlace, isFresh, upsertPlace } from "@/lib/places-db";

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query?.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // 1. Check DB cache first
    const cached = await findCachedPlace(query);
    if (cached && isFresh(cached.lastSyncedAt)) {
      const { lastSyncedAt, ...place } = cached;
      return NextResponse.json({ places: [place], source: "cache" });
    }

    // 2. Cache miss or stale — hit Google Places API
    const places = await fetchPlacesFromGoogle(query);

    // 3. Persist results so future requests are served from cache
    for (const place of places) {
      await upsertPlace(place, query);
    }

    return NextResponse.json({ places, source: "api" });
  } catch (err) {
    console.error("Places route error:", err);
    return NextResponse.json(
      { error: "Ayyo! Couldn't fetch places right now." },
      { status: 500 }
    );
  }
}
