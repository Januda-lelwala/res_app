import { NextRequest, NextResponse } from "next/server";
import { updateReviewStatus } from "@/lib/reviews-db";

function isAuthorized(req: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) return false;
  // Accept either Bearer token or httpOnly cookie (same-origin requests)
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${adminSecret}`) return true;
  const cookie = req.cookies.get("admin_session")?.value;
  return cookie === adminSecret;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json() as { status?: string; adminNote?: string };
    const { status, adminNote } = body;

    if (status !== "approved" && status !== "rejected") {
      return NextResponse.json(
        { error: "status must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    await updateReviewStatus(params.id, status, adminNote);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("Admin review update error:", err);
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 });
  }
}
