import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { distanceKm, walkingMinutes, priceLevelToLKR, categoryFromTypes } from "./utils";

const GALLE_FORT = { lat: 6.0328, lng: 80.217 };
const DB_PATH = path.join(process.cwd(), "data", "places.json");

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
}

export interface PlacesDb {
  lastSynced: string | null;
  places: PlaceRecord[];
}

export async function readPlacesDb(): Promise<PlacesDb> {
  try {
    const content = await readFile(DB_PATH, "utf-8");
    return JSON.parse(content);
  } catch {
    return { lastSynced: null, places: [] };
  }
}

export async function writePlacesDb(db: PlacesDb): Promise<void> {
  await mkdir(path.dirname(DB_PATH), { recursive: true });
  await writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

export function priceLevelFilter(priceLevel: number | undefined, budget: string): boolean {
  if (priceLevel === undefined) return true;
  switch (budget) {
    case "Under LKR 500": return priceLevel === 0;
    case "LKR 500–1500": return priceLevel <= 1;
    case "LKR 1500–3000": return priceLevel <= 2;
    case "LKR 3000+": return priceLevel >= 3;
    default: return true;
  }
}

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

  return { results: data.results ?? [], nextPageToken: data.next_page_token };
}

export async function syncPlaces(apiKey: string): Promise<{ count: number; lastSynced: string }> {
  const types = ["restaurant", "cafe", "bar"];
  const seen = new Map<string, Record<string, unknown>>();

  for (const type of types) {
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

  const places = Array.from(seen.values()).map(mapGooglePlaceToRecord);
  const db = { lastSynced: new Date().toISOString(), places };
  await writePlacesDb(db);

  return { count: places.length, lastSynced: db.lastSynced };
}

export function mapGooglePlaceToRecord(p: Record<string, unknown>): PlaceRecord {
  const geometry = p.geometry as { location?: { lat: number; lng: number } } | undefined;
  const lat = geometry?.location?.lat;
  const lng = geometry?.location?.lng;
  const types = (p.types as string[] | undefined) ?? [];
  const priceLevel = p.price_level as number | undefined;
  const photos = p.photos as Array<{ photo_reference: string }> | undefined;

  const dist = lat != null && lng != null
    ? distanceKm(GALLE_FORT.lat, GALLE_FORT.lng, lat, lng)
    : 999;

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
