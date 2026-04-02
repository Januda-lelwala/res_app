import { NextResponse } from "next/server";
import { readPlacesDb, writePlacesDb, mapGooglePlaceToRecord } from "@/lib/places-db";

const GALLE_FORT = { lat: 6.0328, lng: 80.217 };
const SEARCH_RADIUS = 3000;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function fetchNearbyPage(
  apiKey: string,
  type: string,
  pageToken?: string
): Promise<{ results: Record<string, unknown>[]; nextPageToken?: string }> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("location", `${GALLE_FORT.lat},${GALLE_FORT.lng}`);
  url.searchParams.set("radius", String(SEARCH_RADIUS));
  url.searchParams.set("type", type);
  url.searchParams.set("key", apiKey);
  if (pageToken) url.searchParams.set("pagetoken", pageToken);

  const res = await fetch(url.toString());
  const data = await res.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error("Nearby Search error:", data.status, data.error_message);
  }

  return {
    results: data.results ?? [],
    nextPageToken: data.next_page_token,
  };
}

export async function GET() {
  const db = await readPlacesDb();
  return NextResponse.json({ lastSynced: db.lastSynced, count: db.places.length });
}

export async function POST() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_PLACES_API_KEY not set" }, { status: 500 });
  }

  const types = ["restaurant", "cafe", "bar"];
  const seen = new Map<string, Record<string, unknown>>();

  for (const type of types) {
    let pageToken: string | undefined;
    let page = 0;

    do {
      if (page > 0) await sleep(2500); // Google requires a delay before using pagetoken
      const { results, nextPageToken } = await fetchNearbyPage(apiKey, type, pageToken);
      for (const place of results) {
        const id = place.place_id as string;
        if (id && !seen.has(id)) seen.set(id, place);
      }
      pageToken = nextPageToken;
      page++;
    } while (pageToken && page < 3);
  }

  const places = Array.from(seen.values()).map(mapGooglePlaceToRecord);
  const db = { lastSynced: new Date().toISOString(), places };
  await writePlacesDb(db);

  return NextResponse.json({ success: true, count: places.length, lastSynced: db.lastSynced });
}
