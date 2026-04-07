export interface PlacePhoto {
  id: number;
  placeId: string;
  photoReference: string;
  width?: number;
  height?: number;
  displayOrder: number;
  fetchedAt: string;
}

export interface Recommendation {
  name: string;
  category: "Restaurant" | "Bar" | "Cafe" | "Street Food" | "Rooftop";
  priceRange: string;
  vibeDescription: string;
  distanceFromFort: number;
  whyThisPlace: string;
  // Enriched from Google Places
  placeId?: string;
  rating?: number;
  totalRatings?: number;
  address?: string;
  openNow?: boolean;
  photoUrl?: string;
  googleMapsUrl?: string;
  lat?: number;
  lng?: number;
}

export interface FilterState {
  budget: string | null;
  category: string | null;
  vibe: string | null;
  distance: string | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface PlacesResult {
  placeId: string;
  name: string;
  rating?: number;
  totalRatings?: number;
  priceLevel?: number;
  address?: string;
  openNow?: boolean;
  photoUrl?: string;
  lat?: number;
  lng?: number;
  types?: string[];
}
