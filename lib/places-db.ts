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
