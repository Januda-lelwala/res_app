export type ReviewStatus = "pending" | "approved" | "rejected" | "flagged";

export interface PlaceReview {
  id: string;
  placeId: string;
  reviewerName: string;
  body: string;
  rating?: number;
  status: ReviewStatus;
  aiVerdict?: "approve" | "reject" | "flag";
  aiReason?: string;
  aiConfidence?: number;
  adminNote?: string;
  createdAt: string;
  moderatedAt?: string;
  reviewedAt?: string;
}

export interface SubmitReviewPayload {
  reviewerName: string;
  body: string;
  rating?: number;
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
  userDescription?: string;
  approvedReviews?: PlaceReview[];
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
