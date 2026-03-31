import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { logSearch } from "@/lib/analytics";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a local expert on Galle, Sri Lanka. You help tourists and locals find the perfect place to eat, drink, or hang out based on their budget in LKR, their vibe preference, and their proximity to Galle Fort. Always respond in JSON format with an array of exactly 10 recommendations, each containing: name, category (one of: Restaurant, Bar, Cafe, Street Food, Rooftop), priceRange (in LKR as a string like "LKR 500–1,500"), vibeDescription (one sentence), distanceFromFort (walking minutes as a number), and whyThisPlace (one sentence personalized reason). Be specific to Galle — reference real areas like Galle Fort, Unawatuna Road, Closenberg, Light House Street. Return ONLY valid JSON — no markdown, no explanation, just the JSON array.`;

export async function POST(req: NextRequest) {
  try {
    const { message, filters } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    let userMessage = message;
    if (filters && Object.values(filters).some(Boolean)) {
      const activeFilters = Object.entries(filters)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      userMessage = `${message}\n\n[Active filters: ${activeFilters}]`;
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const rawText =
      response.content[0].type === "text" ? response.content[0].text : "";

    let recommendations;
    try {
      // Strip any accidental markdown fences
      const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
      recommendations = JSON.parse(cleaned);
      if (!Array.isArray(recommendations)) {
        recommendations = [recommendations];
      }
    } catch {
      return NextResponse.json(
        { error: "Ayyo! The AI got confused. Please try again." },
        { status: 500 }
      );
    }

    // Log the query asynchronously
    logSearch(message, recommendations.length).catch(() => {});

    return NextResponse.json({ recommendations });
  } catch (err: unknown) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      { error: "Ayyo! Something went wrong, try again." },
      { status: 500 }
    );
  }
}
