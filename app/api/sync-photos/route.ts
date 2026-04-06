import { NextRequest, NextResponse } from "next/server";
import { syncPlacePhotos } from "@/lib/places-db";

export async function GET() {
  return NextResponse.json({ message: "POST to this endpoint to trigger photo sync", endpoint: "/api/sync-photos" });
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret");
  if (process.env.PHOTOS_SYNC_SECRET && secret !== process.env.PHOTOS_SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_PLACES_API_KEY not set" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const result = await syncPlacePhotos(apiKey, {
    placeIds: body.placeIds,
    maxPhotosPerPlace: body.max ?? 10,
    concurrency: 3,
    delayMs: 200,
  });

  return NextResponse.json({ success: true, ...result });
}
