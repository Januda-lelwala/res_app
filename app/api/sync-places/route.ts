import { NextResponse } from "next/server";
import { readPlacesDb, syncPlaces } from "@/lib/places-db";

export async function GET() {
  const db = await readPlacesDb();
  return NextResponse.json({ lastSynced: db.lastSynced, count: db.places.length });
}

export async function POST() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_PLACES_API_KEY not set" }, { status: 500 });
  }

  try {
    const result = await syncPlaces(apiKey);
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Sync failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
