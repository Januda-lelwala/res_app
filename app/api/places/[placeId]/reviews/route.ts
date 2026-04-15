import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import {
  insertReview,
  getApprovedReviewsForPlace,
  checkRateLimit,
  checkDuplicate,
} from "@/lib/reviews-db";
import { runModeration } from "@/lib/moderation";
import type { SubmitReviewPayload } from "@/lib/types";

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { placeId: string } }
) {
  try {
    const reviews = await getApprovedReviewsForPlace(params.placeId);
    return NextResponse.json({ reviews });
  } catch (err: unknown) {
    console.error("Fetch reviews error:", err);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { placeId: string } }
) {
  try {
    const body = await req.json() as Partial<SubmitReviewPayload>;

    // Validate inputs
    const reviewerName = body.reviewerName?.trim() ?? "";
    const reviewBody = body.body?.trim() ?? "";
    const rating = body.rating;

    if (!reviewerName || reviewerName.length < 1 || reviewerName.length > 60) {
      return NextResponse.json(
        { error: "Name must be between 1 and 60 characters" },
        { status: 400 }
      );
    }
    if (!reviewBody || reviewBody.length < 20 || reviewBody.length > 1000) {
      return NextResponse.json(
        { error: "Review must be between 20 and 1000 characters" },
        { status: 400 }
      );
    }
    if (rating !== undefined && rating !== null && (rating < 1 || rating > 5 || !Number.isInteger(rating))) {
      return NextResponse.json(
        { error: "Rating must be an integer between 1 and 5" },
        { status: 400 }
      );
    }

    // Build fingerprints
    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") ?? "";
    const ipHash = hashValue(ip);
    const fp = hashValue(ip + userAgent);

    // Rate limit: max 3 reviews per IP per 24h
    const withinLimit = await checkRateLimit(ipHash);
    if (!withinLimit) {
      return NextResponse.json(
        { error: "You've submitted too many reviews today. Please try again tomorrow." },
        { status: 429 }
      );
    }

    // Duplicate: 1 review per fingerprint per place
    const isUnique = await checkDuplicate(fp, params.placeId);
    if (!isUnique) {
      return NextResponse.json(
        { error: "You've already submitted a review for this place." },
        { status: 409 }
      );
    }

    const reviewId = await insertReview(
      params.placeId,
      { reviewerName, body: reviewBody, rating: rating ?? undefined },
      fp,
      ipHash
    );

    // Fire-and-forget moderation — don't block the response
    runModeration(reviewId).catch((err) =>
      console.error(`Moderation failed for review ${reviewId}:`, err)
    );

    return NextResponse.json(
      {
        reviewId,
        message: "Thanks! Your review is being checked and will appear shortly.",
      },
      { status: 202 }
    );
  } catch (err: unknown) {
    console.error("Submit review error:", err);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
