import { NextRequest, NextResponse } from "next/server";
import { PlacesResult } from "@/lib/types";

const GALLE_SW = { lat: 5.98, lng: 80.18 };
const GALLE_NE = { lat: 6.10, lng: 80.28 };

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query?.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ places: [] });
    }

    const textSearchUrl = new URL(
      "https://maps.googleapis.com/maps/api/place/textsearch/json"
    );
    textSearchUrl.searchParams.set("query", `${query} Galle Sri Lanka`);
    textSearchUrl.searchParams.set("type", "establishment");
    textSearchUrl.searchParams.set(
      "locationbias",
      `rectangle:${GALLE_SW.lat},${GALLE_SW.lng}|${GALLE_NE.lat},${GALLE_NE.lng}`
    );
    textSearchUrl.searchParams.set("key", apiKey);

    const res = await fetch(textSearchUrl.toString());
    const data = await res.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Places API error:", data.status, data.error_message);
      return NextResponse.json({ places: [] });
    }

    const places: PlacesResult[] = (data.results || [])
      .slice(0, 10)
      .map((p: Record<string, unknown>) => {
        const geometry = p.geometry as { location?: { lat: number; lng: number } } | undefined;
        const photos = p.photos as Array<{ photo_reference: string }> | undefined;
        const photoRef = photos?.[0]?.photo_reference;
        const photoUrl = photoRef
          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoRef}&key=${apiKey}`
          : undefined;

        return {
          placeId: p.place_id as string,
          name: p.name as string,
          rating: p.rating as number | undefined,
          totalRatings: p.user_ratings_total as number | undefined,
          priceLevel: p.price_level as number | undefined,
          address: p.formatted_address as string | undefined,
          openNow: (p.opening_hours as { open_now?: boolean } | undefined)?.open_now,
          photoUrl,
          lat: geometry?.location?.lat,
          lng: geometry?.location?.lng,
          types: p.types as string[] | undefined,
        };
      });

    return NextResponse.json({ places });
  } catch (err) {
    console.error("Places API error:", err);
    return NextResponse.json(
      { error: "Ayyo! Couldn't fetch places right now." },
      { status: 500 }
    );
  }
}
