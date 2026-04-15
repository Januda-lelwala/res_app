import { NextRequest, NextResponse } from "next/server";
import { saveDescription } from "@/lib/places-db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { placeId: string } }
) {
  try {
    const { description } = await req.json();
    if (typeof description !== "string") {
      return NextResponse.json({ error: "description must be a string" }, { status: 400 });
    }
    await saveDescription(params.placeId, description);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("Save description error:", err);
    return NextResponse.json({ error: "Failed to save description" }, { status: 500 });
  }
}
