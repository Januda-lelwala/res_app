import Anthropic from "@anthropic-ai/sdk";
import { getSupabase } from "./supabase";
import { updateModerationResult, getReviewById } from "./reviews-db";

const MODERATION_SYSTEM_PROMPT = `You are a moderation assistant for a restaurant and bar review app in Galle Fort, Sri Lanka.
A user has submitted a review. Assess it on three criteria:

1. RELEVANCE — Does it discuss the restaurant/bar experience? (food, drinks, price, service, ambience, menu items, opening hours). Off-topic content should be rejected.
2. QUALITY — Is it informative and specific? Generic filler like "good place, will visit again" with no details adds no value. Flag or reject if entirely uninformative.
3. INTEGRITY — Does it contain spam, promotional language, hate speech, or dangerous misinformation?

Return ONLY a JSON object with:
{"verdict":"approve"|"reject"|"flag","reason":"one concise sentence","confidence":0.0}

Guidelines:
- "approve" when relevant, specific, and benign (confidence > 0.75)
- "reject" when clearly spam, promotional, off-topic, or abusive (confidence > 0.85)
- "flag" for anything uncertain — let a human decide
- Mild or negative criticism of a place is legitimate, do not reject it`;

interface ModerationResult {
  verdict: "approve" | "reject" | "flag";
  reason: string;
  confidence: number;
}

export async function runModeration(reviewId: string): Promise<void> {
  const review = await getReviewById(reviewId);
  if (!review) {
    console.error(`Moderation: review ${reviewId} not found`);
    return;
  }

  // Fetch place name for context
  const { data: placeData } = await getSupabase()
    .from("places")
    .select("name, category, price_range")
    .eq("place_id", review.placeId)
    .single();

  const placeName = placeData
    ? `${(placeData as { name: string }).name} (${(placeData as { category: string }).category}, ${(placeData as { price_range: string }).price_range})`
    : review.placeId;

  const userMessage = `Place: ${placeName}
Reviewer name: ${review.reviewerName}
Review: ${review.body}
Star rating: ${review.rating != null ? `${review.rating}/5` : "not given"}`;

  let result: ModerationResult;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: MODERATION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
    result = JSON.parse(cleaned) as ModerationResult;

    if (!["approve", "reject", "flag"].includes(result.verdict)) {
      throw new Error(`Invalid verdict: ${result.verdict}`);
    }
  } catch (err) {
    console.error(`Moderation parse error for review ${reviewId}:`, err);
    // Safe fallback — send to human review
    result = { verdict: "flag", reason: "Moderation service error — needs manual review", confidence: 0 };
  }

  await updateModerationResult(reviewId, result.verdict, result.reason, result.confidence);
}
