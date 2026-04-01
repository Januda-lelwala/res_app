import { PlacesResult } from "./types";

const GALLE_SW = { lat: 5.98, lng: 80.18 };
const GALLE_NE = { lat: 6.10, lng: 80.28 };

export async function fetchPlacesFromGoogle(query: string): Promise<PlacesResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.warn("GOOGLE_PLACES_API_KEY not set — skipping API call");
    return [];
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  url.searchParams.set("query", `${query} Galle Sri Lanka`);
  url.searchParams.set("type", "establishment");
  url.searchParams.set(
    "locationbias",
    `rectangle:${GALLE_SW.lat},${GALLE_SW.lng}|${GALLE_NE.lat},${GALLE_NE.lng}`
  );
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  const data = await res.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error("Google Places API error:", data.status, data.error_message);
    return [];
  }

  return (data.results || [])
    .slice(0, 10)
    .map((p: Record<string, unknown>): PlacesResult => {
      const geometry = p.geometry as { location?: { lat: number; lng: number } } | undefined;
      const photos = p.photos as Array<{ photo_reference: string }> | undefined;
      const photoRef = photos?.[0]?.photo_reference;
      return {
        placeId: p.place_id as string,
        name: p.name as string,
        rating: p.rating as number | undefined,
        totalRatings: p.user_ratings_total as number | undefined,
        priceLevel: p.price_level as number | undefined,
        address: p.formatted_address as string | undefined,
        openNow: (p.opening_hours as { open_now?: boolean } | undefined)?.open_now,
        photoUrl: photoRef
          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoRef}&key=${apiKey}`
          : undefined,
        lat: geometry?.location?.lat,
        lng: geometry?.location?.lng,
        types: p.types as string[] | undefined,
      };
    });
}
