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
  if (types.includes("bar") || types.includes("night_club")) return "Bar";
  if (types.includes("cafe")) return "Cafe";
  if (types.includes("meal_takeaway") || types.includes("food")) return "Street Food";
  return "Restaurant";
}

export function buildShareUrl(placeName: string, placeId?: string): string {
  const base =
    typeof window !== "undefined" ? window.location.origin : "https://discovergalle.com";
  const params = new URLSearchParams({ place: placeName });
  if (placeId) params.set("id", placeId);
  return `${base}?${params.toString()}`;
}
