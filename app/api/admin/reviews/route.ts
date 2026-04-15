import { NextRequest, NextResponse } from "next/server";
import { getAdminQueue, getAdminReviewCounts } from "@/lib/reviews-db";
import type { ReviewStatus } from "@/lib/types";

function isAuthorized(req: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) return false;
  // Accept either Bearer token or httpOnly cookie (same-origin requests)
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${adminSecret}`) return true;
  const cookie = req.cookies.get("admin_session")?.value;
  return cookie === adminSecret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = (searchParams.get("status") ?? "flagged") as ReviewStatus;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
  const cursor = searchParams.get("cursor") ?? undefined;

  const validStatuses: ReviewStatus[] = ["pending", "approved", "rejected", "flagged"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const [reviews, counts] = await Promise.all([
      getAdminQueue(status, limit, cursor),
      getAdminReviewCounts(),
    ]);
    return NextResponse.json({ reviews, counts });
  } catch (err: unknown) {
    console.error("Admin queue error:", err);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}
