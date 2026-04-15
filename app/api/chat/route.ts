import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { logSearch } from "@/lib/analytics";
import { readPlacesDb, priceLevelFilter, syncPlaces } from "@/lib/places-db";
import { getApprovedReviewsForPlaces } from "@/lib/reviews-db";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a local expert on Galle, Sri Lanka. You are given a list of real restaurants, cafes, and bars. Select the best matches for the user's request and return a JSON array (up to 10 items) where each item has:
- name: exact place name from the list
- vibeDescription: one vivid sentence describing the atmosphere
- whyThisPlace: one sentence explaining why this matches the user's specific request

Consider the user's budget, desired vibe, and any mention of food type or occasion. Rank by how well they match. Return ONLY valid JSON array, no markdown.`;

export async function POST(req: NextRequest) {
  try {
    const { message, filters, exclude } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const db = await readPlacesDb();

    if (db.places.length === 0) {
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: "GOOGLE_PLACES_API_KEY not set" }, { status: 500 });
      }
      console.log("DB empty — auto-syncing places from Google...");
      await syncPlaces(apiKey);
      const fresh = await readPlacesDb();
      db.places = fresh.places;
    }

    let candidates = db.places;

    if (filters?.category) {
      candidates = candidates.filter((p) => p.category === filters.category);
    }
    if (filters?.budget) {
      candidates = candidates.filter((p) => priceLevelFilter(p.priceLevel, filters.budget));
    }
    if (Array.isArray(exclude) && exclude.length > 0) {
      const excludeSet = new Set(exclude.map((n: string) => n.toLowerCase()));
      candidates = candidates.filter((p) => !excludeSet.has(p.name.toLowerCase()));
    }

    // Top 30 by rating as context for Claude
    candidates = [...candidates]
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 30);

    if (candidates.length === 0) {
      return NextResponse.json({ recommendations: [] });
    }

    const reviewsEnabled = process.env.REVIEWS_IN_CONTEXT === "true";
    const reviewMap = reviewsEnabled
      ? await getApprovedReviewsForPlaces(candidates.map((p) => p.placeId))
      : new Map();

    const candidateList = candidates
      .map((p) => {
        const base = `- ${p.name} | ${p.category} | ${p.priceRange} | Rating: ${p.rating ?? "N/A"} (${p.totalRatings ?? 0} reviews) | ${p.openNow === false ? "Closed" : "Open"} | ${p.address ?? ""}`;
        const notes = p.userDescription ? `Menu/Notes: ${p.userDescription}` : null;
        const placeReviews = reviewMap.get(p.placeId) ?? [];
        const reviewSummary =
          placeReviews.length > 0
            ? `User reviews (${placeReviews.length}): ${placeReviews
                .slice(0, 3)
                .map((r: { body: string; rating?: number }) => `"${r.body.slice(0, 150)}"${r.rating ? ` (${r.rating}/5)` : ""}`)
                .join(" | ")}`
            : null;
        const extras = [notes, reviewSummary].filter(Boolean).join(" | ");
        return extras ? `${base} | ${extras}` : base;
      })
      .join("\n");

    const activeFilters = [
      filters?.category ? `category: ${filters.category}` : null,
      filters?.budget ? `budget: ${filters.budget}` : null,
    ]
      .filter(Boolean)
      .join(", ");

    const userMessage = `User request: ${message}${activeFilters ? `\nFilters: ${activeFilters}` : ""}

Available places:
${candidateList}`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const rawText =
      response.content[0].type === "text" ? response.content[0].text : "";

    let aiSelections: Array<{ name: string; vibeDescription: string; whyThisPlace: string }>;
    try {
      const cleaned = rawText
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/, "");
      aiSelections = JSON.parse(cleaned);
      if (!Array.isArray(aiSelections)) aiSelections = [aiSelections];
    } catch {
      return NextResponse.json(
        { error: "Ayyo! The AI got confused. Please try again." },
        { status: 500 }
      );
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    const recommendations = await Promise.all(
      aiSelections.map(async (sel) => {
        const record =
          candidates.find((p) => p.name.toLowerCase() === sel.name.toLowerCase()) ??
          candidates.find((p) =>
            p.name.toLowerCase().includes(sel.name.toLowerCase().slice(0, 8))
          );

        if (!record) return null;

        let photoUrl: string | undefined;
        if (record.photoReference && apiKey) {
          photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${record.photoReference}&key=${apiKey}`;
        }

        return {
          name: record.name,
          category: record.category,
          priceRange: record.priceRange,
          vibeDescription: sel.vibeDescription,
          distanceFromFort: record.distanceFromFort,
          whyThisPlace: sel.whyThisPlace,
          placeId: record.placeId,
          rating: record.rating,
          totalRatings: record.totalRatings,
          address: record.address,
          openNow: record.openNow,
          photoUrl,
          lat: record.lat,
          lng: record.lng,
          googleMapsUrl: record.placeId
            ? `https://www.google.com/maps/place/?q=place_id:${record.placeId}`
            : undefined,
          userDescription: record.userDescription,
        };
      })
    );

    const validRecs = recommendations.filter(Boolean);
    logSearch(message, validRecs.length).catch(() => {});

    return NextResponse.json({ recommendations: validRecs });
  } catch (err: unknown) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      { error: "Ayyo! Something went wrong, try again." },
      { status: 500 }
    );
  }
}
