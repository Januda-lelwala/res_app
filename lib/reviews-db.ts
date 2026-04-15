import { getSupabase } from "./supabase";
import type { PlaceReview, ReviewStatus, SubmitReviewPayload } from "./types";

// ── Row type (snake_case from Supabase) ──────────────────────────────────────

interface ReviewRow {
  id: string;
  place_id: string;
  reviewer_name: string;
  reviewer_fp: string;
  reviewer_ip_hash: string;
  body: string;
  rating: number | null;
  status: ReviewStatus;
  ai_verdict: "approve" | "reject" | "flag" | null;
  ai_reason: string | null;
  ai_confidence: number | null;
  admin_note: string | null;
  created_at: string;
  moderated_at: string | null;
  reviewed_at: string | null;
}

// ── Row ↔ Record mapper ──────────────────────────────────────────────────────

function rowToReview(row: ReviewRow): PlaceReview {
  return {
    id: row.id,
    placeId: row.place_id,
    reviewerName: row.reviewer_name,
    body: row.body,
    rating: row.rating ?? undefined,
    status: row.status,
    aiVerdict: row.ai_verdict ?? undefined,
    aiReason: row.ai_reason ?? undefined,
    aiConfidence: row.ai_confidence ?? undefined,
    adminNote: row.admin_note ?? undefined,
    createdAt: row.created_at,
    moderatedAt: row.moderated_at ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
  };
}

// ── Public functions ─────────────────────────────────────────────────────────

export async function insertReview(
  placeId: string,
  payload: SubmitReviewPayload,
  fp: string,
  ipHash: string
): Promise<string> {
  const { data, error } = await getSupabase()
    .from("place_reviews")
    .insert({
      place_id: placeId,
      reviewer_name: payload.reviewerName,
      reviewer_fp: fp,
      reviewer_ip_hash: ipHash,
      body: payload.body,
      rating: payload.rating ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to insert review: ${error.message}`);
  return (data as { id: string }).id;
}

export async function getApprovedReviewsForPlaces(
  placeIds: string[]
): Promise<Map<string, PlaceReview[]>> {
  if (placeIds.length === 0) return new Map();

  const { data, error } = await getSupabase()
    .from("place_reviews")
    .select("*")
    .in("place_id", placeIds)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch reviews: ${error.message}`);

  const map = new Map<string, PlaceReview[]>();
  for (const row of (data as ReviewRow[]) ?? []) {
    const review = rowToReview(row);
    const list = map.get(review.placeId) ?? [];
    list.push(review);
    map.set(review.placeId, list);
  }
  return map;
}

export async function getApprovedReviewsForPlace(placeId: string): Promise<PlaceReview[]> {
  const { data, error } = await getSupabase()
    .from("place_reviews")
    .select("*")
    .eq("place_id", placeId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(`Failed to fetch reviews: ${error.message}`);
  return ((data as ReviewRow[]) ?? []).map(rowToReview);
}

export async function getAdminQueue(
  status: ReviewStatus,
  limit: number,
  cursor?: string
): Promise<PlaceReview[]> {
  let query = getSupabase()
    .from("place_reviews")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch admin queue: ${error.message}`);
  return ((data as ReviewRow[]) ?? []).map(rowToReview);
}

export async function getAdminReviewCounts(): Promise<Record<ReviewStatus, number>> {
  const { data, error } = await getSupabase()
    .from("place_reviews")
    .select("status");

  if (error) throw new Error(`Failed to fetch review counts: ${error.message}`);

  const counts: Record<ReviewStatus, number> = {
    pending: 0,
    approved: 0,
    rejected: 0,
    flagged: 0,
  };
  for (const row of (data ?? []) as { status: ReviewStatus }[]) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }
  return counts;
}

export async function updateReviewStatus(
  id: string,
  status: "approved" | "rejected",
  adminNote?: string
): Promise<void> {
  const { error } = await getSupabase()
    .from("place_reviews")
    .update({
      status,
      admin_note: adminNote ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(`Failed to update review status: ${error.message}`);
}

export async function updateModerationResult(
  id: string,
  verdict: "approve" | "reject" | "flag",
  reason: string,
  confidence: number
): Promise<void> {
  const statusMap = { approve: "approved", reject: "rejected", flag: "flagged" } as const;

  const { error } = await getSupabase()
    .from("place_reviews")
    .update({
      status: statusMap[verdict],
      ai_verdict: verdict,
      ai_reason: reason,
      ai_confidence: confidence,
      moderated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(`Failed to update moderation result: ${error.message}`);
}

export async function checkRateLimit(ipHash: string): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await getSupabase()
    .from("place_reviews")
    .select("*", { count: "exact", head: true })
    .eq("reviewer_ip_hash", ipHash)
    .gte("created_at", since);

  if (error) throw new Error(`Rate limit check failed: ${error.message}`);
  return (count ?? 0) < 3;
}

export async function checkDuplicate(fp: string, placeId: string): Promise<boolean> {
  const { count, error } = await getSupabase()
    .from("place_reviews")
    .select("*", { count: "exact", head: true })
    .eq("reviewer_fp", fp)
    .eq("place_id", placeId);

  if (error) throw new Error(`Duplicate check failed: ${error.message}`);
  return (count ?? 0) === 0;
}

export async function getReviewById(id: string): Promise<PlaceReview | null> {
  const { data, error } = await getSupabase()
    .from("place_reviews")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return rowToReview(data as ReviewRow);
}
