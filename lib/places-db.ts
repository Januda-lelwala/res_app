import { distanceKm, walkingMinutes, priceLevelToLKR, categoryFromTypes } from "./utils";
import { getSupabase } from "./supabase";

// Centre used for the Nearby Search API call (500 m catches the whole fort)
const GALLE_FORT = { lat: 6.0285, lng: 80.2175 };
const SEARCH_RADIUS = 550;

// Approximate polygon of the Galle Fort walls (clockwise from the Land Gate)
const FORT_POLYGON: Array<{ lat: number; lng: number }> = [
  { lat: 6.0338, lng: 80.2165 }, // Star Bastion (north / Land Gate area)
  { lat: 6.0325, lng: 80.2230 }, // Sun Bastion (northeast)
  { lat: 6.0268, lng: 80.2233 }, // Point Utrecht (east)
  { lat: 6.0242, lng: 80.2210 }, // Aurora Bastion (southeast)
  { lat: 6.0237, lng: 80.2173 }, // Neptune Bastion (south)
  { lat: 6.0247, lng: 80.2138 }, // Triton Bastion (southwest)
  { lat: 6.0283, lng: 80.2122 }, // Aeolus / Flag Rock (west)
  { lat: 6.0315, lng: 80.2130 }, // Clippenburg Bastion (northwest)
];

/** Ray-casting point-in-polygon test. */
function isInsideFort(lat: number, lng: number): boolean {
  const poly = FORT_POLYGON;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].lng, yi = poly[i].lat;
    const xj = poly[j].lng, yj = poly[j].lat;
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface PlaceRecord {
  placeId: string;
  name: string;
  category: string;
  priceLevel?: number;
  priceRange: string;
  rating?: number;
  totalRatings?: number;
  address?: string;
  openNow?: boolean;
  lat?: number;
  lng?: number;
  distanceFromFort: number;
  types: string[];
  photoReference?: string;
  lastSynced: string;
  userDescription?: string;
}

export interface PlacesDb {
  lastSynced: string | null;
  places: PlaceRecord[];
}

// Snake_case row as stored in Supabase
interface PlaceRow {
  place_id: string;
  name: string;
  category: string;
  price_level: number | null;
  price_range: string;
  rating: number | null;
  total_ratings: number | null;
  address: string | null;
  open_now: boolean | null;
  lat: number | null;
  lng: number | null;
  distance_from_fort: number;
  types: string[];
  photo_reference: string | null;
  last_synced: string;
  user_description: string | null;
}

// ── Row ↔ Record mappers ─────────────────────────────────────────────────────

function rowToRecord(row: PlaceRow): PlaceRecord {
  return {
    placeId: row.place_id,
    name: row.name,
    category: row.category,
    priceLevel: row.price_level ?? undefined,
    priceRange: row.price_range,
    rating: row.rating ?? undefined,
    totalRatings: row.total_ratings ?? undefined,
    address: row.address ?? undefined,
    openNow: row.open_now ?? undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    distanceFromFort: row.distance_from_fort,
    types: row.types,
    photoReference: row.photo_reference ?? undefined,
    lastSynced: row.last_synced,
    userDescription: row.user_description ?? undefined,
  };
}

function recordToRow(r: PlaceRecord): PlaceRow {
  return {
    place_id: r.placeId,
    name: r.name,
    category: r.category,
    price_level: r.priceLevel ?? null,
    price_range: r.priceRange,
    rating: r.rating ?? null,
    total_ratings: r.totalRatings ?? null,
    address: r.address ?? null,
    open_now: r.openNow ?? null,
    lat: r.lat ?? null,
    lng: r.lng ?? null,
    distance_from_fort: r.distanceFromFort,
    types: r.types,
    photo_reference: r.photoReference ?? null,
    last_synced: r.lastSynced,
    user_description: r.userDescription ?? null,
  };
}

// ── DB helpers ───────────────────────────────────────────────────────────────

const SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

function isStale(lastSynced: string | null): boolean {
  if (!lastSynced) return true;
  return Date.now() - new Date(lastSynced).getTime() > SYNC_INTERVAL_MS;
}

export async function readPlacesDb(): Promise<PlacesDb> {
  const { data, error } = await getSupabase().from("places").select("*");
  if (error) throw new Error(`Supabase read failed: ${error.message}`);

  const places = (data as PlaceRow[]).map(rowToRecord);
  const lastSynced =
    places.length > 0
      ? places.reduce((max, p) => (p.lastSynced > max ? p.lastSynced : max), places[0].lastSynced)
      : null;

  // Background re-sync if data is stale — doesn't block the current request
  if (isStale(lastSynced)) {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (apiKey) {
      console.log("Places data stale — triggering background sync...");
      syncPlaces(apiKey).catch((err) => console.error("Background sync failed:", err));
    }
  }

  return { lastSynced, places };
}

// ── Filters ──────────────────────────────────────────────────────────────────

export function priceLevelFilter(priceLevel: number | undefined, budget: string): boolean {
  if (priceLevel === undefined) return true;
  switch (budget) {
    case "Under LKR 500":   return priceLevel === 0;
    case "LKR 500–1500":    return priceLevel <= 1;
    case "LKR 1500–3000":   return priceLevel <= 2;
    case "LKR 3000+":       return priceLevel >= 3;
    default:                return true;
  }
}

// ── Google Places sync ───────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function fetchNearbyPage(
  apiKey: string,
  type: string | null,
  pageToken?: string
): Promise<{ results: Record<string, unknown>[]; nextPageToken?: string }> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("location", `${GALLE_FORT.lat},${GALLE_FORT.lng}`);
  url.searchParams.set("radius", String(SEARCH_RADIUS));
  if (type) url.searchParams.set("type", type);
  url.searchParams.set("key", apiKey);
  if (pageToken) url.searchParams.set("pagetoken", pageToken);

  const res = await fetch(url.toString());
  const data = await res.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error("Nearby Search error:", data.status, data.error_message);
  }

  return { results: data.results ?? [], nextPageToken: data.next_page_token };
}

export function mapGooglePlaceToRecord(p: Record<string, unknown>): PlaceRecord {
  const geometry = p.geometry as { location?: { lat: number; lng: number } } | undefined;
  const lat = geometry?.location?.lat;
  const lng = geometry?.location?.lng;
  const types = (p.types as string[] | undefined) ?? [];
  const priceLevel = p.price_level as number | undefined;
  const photos = p.photos as Array<{ photo_reference: string }> | undefined;

  const dist =
    lat != null && lng != null ? distanceKm(GALLE_FORT.lat, GALLE_FORT.lng, lat, lng) : 999;

  return {
    placeId: p.place_id as string,
    name: p.name as string,
    category: categoryFromTypes(types),
    priceLevel,
    priceRange: priceLevelToLKR(priceLevel),
    rating: p.rating as number | undefined,
    totalRatings: p.user_ratings_total as number | undefined,
    address: p.formatted_address as string | undefined,
    openNow: (p.opening_hours as { open_now?: boolean } | undefined)?.open_now,
    lat,
    lng,
    distanceFromFort: walkingMinutes(dist),
    types,
    photoReference: photos?.[0]?.photo_reference,
    lastSynced: new Date().toISOString(),
  };
}

export async function saveDescription(placeId: string, description: string): Promise<void> {
  const { error } = await getSupabase()
    .from("places")
    .update({ user_description: description || null })
    .eq("place_id", placeId);
  if (error) throw new Error(`Failed to save description: ${error.message}`);
}

export async function syncPlaces(apiKey: string): Promise<{ count: number; lastSynced: string }> {
  // null = no type filter (returns all establishments); specific types catch
  // categories the broad search can under-represent due to API result caps.
  const searches: Array<string | null> = [
    null,
    "restaurant",
    "cafe",
    "bar",
    "lodging",
    "store",
    "tourist_attraction",
    "museum",
    "art_gallery",
    "spa",
  ];
  const seen = new Map<string, Record<string, unknown>>();

  for (const type of searches) {
    let pageToken: string | undefined;
    let page = 0;

    do {
      if (page > 0) await sleep(2500);
      const { results, nextPageToken } = await fetchNearbyPage(apiKey, type, pageToken);
      for (const place of results) {
        const id = place.place_id as string;
        if (id && !seen.has(id)) seen.set(id, place);
      }
      pageToken = nextPageToken;
      page++;
    } while (pageToken && page < 3);
  }

  const records = Array.from(seen.values())
    .map(mapGooglePlaceToRecord)
    .filter((r) => r.lat != null && r.lng != null && isInsideFort(r.lat, r.lng));
  const rows = records.map(recordToRow);

  const { error } = await getSupabase()
    .from("places")
    .upsert(rows, { onConflict: "place_id" });

  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);

  const lastSynced = new Date().toISOString();
  return { count: records.length, lastSynced };
}
