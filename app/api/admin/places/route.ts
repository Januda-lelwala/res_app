import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { readPlacesDb } from "@/lib/places-db";

// GET /api/admin/places — return all places sorted by name
export async function GET() {
  try {
    const db = await readPlacesDb();
    const sorted = [...db.places].sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ places: sorted });
  } catch (err: unknown) {
    console.error("Admin GET error:", err);
    return NextResponse.json({ error: "Failed to fetch places" }, { status: 500 });
  }
}

// PATCH /api/admin/places — update owner_notes and owner_price for a place
export async function PATCH(req: NextRequest) {
  try {
    const { placeId, ownerNotes, ownerPrice } = await req.json();

    if (!placeId) {
      return NextResponse.json({ error: "placeId is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("places")
      .update({
        owner_notes: ownerNotes ?? null,
        owner_price: ownerPrice ?? null,
      })
      .eq("place_id", placeId);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Admin PATCH error:", err);
    return NextResponse.json({ error: "Failed to update place" }, { status: 500 });
  }
}
