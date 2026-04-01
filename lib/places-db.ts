import { prisma } from "./db";
import { PlacesResult } from "./types";
import type { PlaceModel } from "./generated/prisma/models/Place";

const TTL_HOURS = parseInt(process.env.PLACES_CACHE_TTL_HOURS ?? "24", 10);

export type CachedPlace = PlacesResult & { lastSyncedAt: Date };

function toPlacesResult(row: PlaceModel): CachedPlace {
  return {
    placeId: row.placeId,
    name: row.name,
    rating: row.rating ?? undefined,
    totalRatings: row.totalRatings ?? undefined,
    priceLevel: row.priceLevel ?? undefined,
    address: row.address ?? undefined,
    openNow: row.openNow ?? undefined,
    photoUrl: row.photoUrl ?? undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    types: JSON.parse(row.types),
    lastSyncedAt: row.lastSyncedAt,
  };
}

export function isFresh(lastSyncedAt: Date): boolean {
  return Date.now() - lastSyncedAt.getTime() < TTL_HOURS * 60 * 60 * 1000;
}

/**
 * Find a cached place by search query. Uses in-memory name/alias matching
 * since SQLite lacks case-insensitive full-text search via Prisma.
 */
export async function findCachedPlace(query: string): Promise<CachedPlace | null> {
  const needle = query.toLowerCase().trim();
  const all = await prisma.place.findMany();

  const match = all.find((row) => {
    const rowName = row.name.toLowerCase();
    const aliases: string[] = JSON.parse(row.searchAliases);
    return (
      rowName === needle ||
      rowName.includes(needle) ||
      needle.includes(rowName) ||
      aliases.some((a) => a === needle || a.includes(needle) || needle.includes(a))
    );
  });

  return match ? toPlacesResult(match) : null;
}

/** Upsert a place result into the DB, recording the search query as an alias. */
export async function upsertPlace(place: PlacesResult, searchQuery: string): Promise<void> {
  const existing = await prisma.place.findUnique({ where: { placeId: place.placeId } });
  const aliases: string[] = existing ? JSON.parse(existing.searchAliases) : [];
  const lowerQuery = searchQuery.toLowerCase().trim();
  if (!aliases.includes(lowerQuery)) aliases.push(lowerQuery);

  const payload = {
    name: place.name,
    rating: place.rating ?? null,
    totalRatings: place.totalRatings ?? null,
    priceLevel: place.priceLevel ?? null,
    address: place.address ?? null,
    openNow: place.openNow ?? null,
    photoUrl: place.photoUrl ?? null,
    lat: place.lat ?? null,
    lng: place.lng ?? null,
    types: JSON.stringify(place.types ?? []),
    searchAliases: JSON.stringify(aliases),
    lastSyncedAt: new Date(),
  };

  await prisma.place.upsert({
    where: { placeId: place.placeId },
    create: { placeId: place.placeId, ...payload },
    update: payload,
  });
}

/** All places in the DB. */
export async function getAllPlaces(): Promise<CachedPlace[]> {
  const rows = await prisma.place.findMany();
  return rows.map(toPlacesResult);
}

/** Places whose cache has expired. */
export async function getStalePlaces(): Promise<CachedPlace[]> {
  const cutoff = new Date(Date.now() - TTL_HOURS * 60 * 60 * 1000);
  const rows = await prisma.place.findMany({ where: { lastSyncedAt: { lt: cutoff } } });
  return rows.map(toPlacesResult);
}

/** Stats for the sync status endpoint. */
export async function getCacheStats() {
  const all = await prisma.place.findMany({ select: { name: true, lastSyncedAt: true } });
  const now = Date.now();
  const fresh = all.filter((r) => now - r.lastSyncedAt.getTime() < TTL_HOURS * 60 * 60 * 1000);
  return {
    total: all.length,
    fresh: fresh.length,
    stale: all.length - fresh.length,
    ttlHours: TTL_HOURS,
    oldestSync: all.length ? new Date(Math.min(...all.map((r) => r.lastSyncedAt.getTime()))) : null,
    newestSync: all.length ? new Date(Math.max(...all.map((r) => r.lastSyncedAt.getTime()))) : null,
  };
}
