export function priceLevelToLKR(priceLevel?: number): string {
  switch (priceLevel) {
    case 0:
      return "Under LKR 500";
    case 1:
      return "LKR 500–1,500";
    case 2:
      return "LKR 1,500–3,000";
    case 3:
      return "LKR 3,000–5,000";
    case 4:
      return "LKR 5,000+";
    default:
      return "Price varies";
  }
}

export function categoryFromTypes(types?: string[]): string {
  if (!types) return "Restaurant";
  if (types.includes("lodging")) return "Hotel";
  if (types.includes("bar") || types.includes("night_club")) return "Bar";
  if (types.includes("cafe")) return "Cafe";
  if (types.includes("meal_takeaway") || types.includes("food")) return "Street Food";
  if (types.includes("museum")) return "Museum";
  if (types.includes("art_gallery")) return "Art Gallery";
  if (types.includes("spa")) return "Spa";
  if (
    types.includes("store") ||
    types.includes("clothing_store") ||
    types.includes("jewelry_store") ||
    types.includes("book_store") ||
    types.includes("shopping_mall")
  ) return "Shop";
  if (types.includes("tourist_attraction") || types.includes("point_of_interest")) return "Attraction";
  return "Other";
}

// Haversine distance in km between two lat/lng points
export function distanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Average walking speed ~5 km/h → 1 min per 83 m
export function walkingMinutes(km: number): number {
  return Math.max(1, Math.round((km / 5) * 60));
}

// Galle bounding box
const GALLE_SW = { lat: 5.98, lng: 80.18 };
const GALLE_NE = { lat: 6.10, lng: 80.28 };

export function isInsideGalle(lat: number, lng: number): boolean {
  return (
    lat >= GALLE_SW.lat && lat <= GALLE_NE.lat &&
    lng >= GALLE_SW.lng && lng <= GALLE_NE.lng
  );
}

export function buildShareUrl(placeName: string, placeId?: string): string {
  const base =
    typeof window !== "undefined" ? window.location.origin : "https://discovergalle.com";
  const params = new URLSearchParams({ place: placeName });
  if (placeId) params.set("id", placeId);
  return `${base}?${params.toString()}`;
}
