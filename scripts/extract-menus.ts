#!/usr/bin/env npx tsx
/**
 * scripts/extract-menus.ts
 *
 * Standalone menu extraction script. Reads places from Supabase,
 * fetches their photos from Google Places, compresses them with sharp,
 * and sends ALL images for a place to Claude Haiku in ONE API call to
 * identify menu photos and extract structured menu items.
 *
 * Usage:
 *   npx tsx scripts/extract-menus.ts [options]
 *   npm run extract-menus -- [options]
 *
 * Options:
 *   --place <id>   Process a single place_id only
 *   --force        Re-process places already extracted
 *   --dry-run      Print what would happen, make no API calls
 *   --max <n>      Cap number of places to process
 *   --photos <n>   Max photos per place to fetch (default: 5)
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Anthropic from "@anthropic-ai/sdk";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";

// ── Constants ─────────────────────────────────────────────────────────────────

const MODEL = "claude-haiku-4-5-20251001";
const DEFAULT_MAX_PHOTOS = 5;
const IMAGE_WIDTH_PX = 800;
const IMAGE_QUALITY = 70;
const CONCURRENCY = 3;

// ── CLI args ──────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    placeId: null as string | null,
    force: false,
    dryRun: false,
    max: Infinity,
    photosPerPlace: DEFAULT_MAX_PHOTOS,
  };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--place":
        opts.placeId = args[++i] ?? null;
        break;
      case "--force":
        opts.force = true;
        break;
      case "--dry-run":
        opts.dryRun = true;
        break;
      case "--max":
        opts.max = parseInt(args[++i] ?? "0", 10);
        break;
      case "--photos":
        opts.photosPerPlace = parseInt(args[++i] ?? "5", 10);
        break;
    }
  }
  return opts;
}

// ── Supabase ──────────────────────────────────────────────────────────────────

function getDb(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key);
}

// ── Google Places ─────────────────────────────────────────────────────────────

interface PhotoRef {
  photo_reference: string;
  width: number;
  height: number;
}

async function fetchPhotoRefs(
  placeId: string,
  apiKey: string,
  max: number
): Promise<PhotoRef[]> {
  const url =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${encodeURIComponent(placeId)}` +
    `&fields=photos` +
    `&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for place ${placeId}`);
  const json = await res.json();
  if (json.status !== "OK") return [];
  return ((json.result?.photos as PhotoRef[] | undefined) ?? []).slice(0, max);
}

// ── Image download + compression ──────────────────────────────────────────────

async function downloadAndCompress(
  photoRef: string,
  apiKey: string
): Promise<Buffer | null> {
  const url =
    `https://maps.googleapis.com/maps/api/place/photo` +
    `?maxwidth=${IMAGE_WIDTH_PX}` +
    `&photoreference=${encodeURIComponent(photoRef)}` +
    `&key=${apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const raw = Buffer.from(await res.arrayBuffer());
    return await sharp(raw)
      .resize({ width: IMAGE_WIDTH_PX, withoutEnlargement: true })
      .jpeg({ quality: IMAGE_QUALITY })
      .toBuffer();
  } catch {
    return null;
  }
}

// ── Claude extraction ─────────────────────────────────────────────────────────

interface MenuItem {
  item_name: string;
  description: string | null;
  price_lkr: number | null;
  category: string | null;
  is_vegetarian: boolean | null;
  is_vegan: boolean | null;
  confidence: "high" | "medium" | "low";
}

interface ExtractionResult {
  has_menu: boolean;
  menu_items: MenuItem[];
  notes: string | null;
}

const SYSTEM_PROMPT = `You are a menu extraction assistant for restaurants in Galle, Sri Lanka.

You will receive one or more compressed photos from a restaurant. Your job:
1. Determine if any photo shows a menu (printed menu, chalkboard, price board, menu screen)
2. If yes, extract every visible food and drink item

Respond ONLY with valid JSON — no markdown, no explanation:
{
  "has_menu": boolean,
  "menu_items": [
    {
      "item_name": "string",
      "description": "string or null",
      "price_lkr": integer or null,
      "category": "Main | Drink | Dessert | Snack | Appetizer | Other | null",
      "is_vegetarian": true | false | null,
      "is_vegan": true | false | null,
      "confidence": "high | medium | low"
    }
  ],
  "notes": "string or null"
}

Rules:
- price_lkr: parse to integer in LKR (e.g. "Rs 450" → 450, "1,200" → 1200). null if not shown.
- confidence: "high" = clearly readable, "medium" = partially readable, "low" = guessed.
- Do not invent items not visible in the photos.
- If no menu visible in any photo: has_menu false, empty array.`;

async function extractFromPhotos(
  client: Anthropic,
  images: Buffer[],
  placeName: string
): Promise<ExtractionResult> {
  const imageBlocks: Anthropic.ImageBlockParam[] = images.map((buf) => ({
    type: "image",
    source: {
      type: "base64",
      media_type: "image/jpeg",
      data: buf.toString("base64"),
    },
  }));

  const content: Anthropic.ContentBlockParam[] = [
    {
      type: "text",
      text: `Place: ${placeName}\n\nAnalyse the following ${images.length} photo(s) and extract any menu data.`,
    },
    ...imageBlocks,
  ];

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "{}";
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  return JSON.parse(cleaned) as ExtractionResult;
}

// ── DB writes ─────────────────────────────────────────────────────────────────

async function saveResults(
  db: SupabaseClient,
  placeId: string,
  items: MenuItem[],
  photoRefs: string[],
  notes: string | null
): Promise<void> {
  if (items.length > 0) {
    const rows = items.map((item) => ({
      place_id: placeId,
      item_name: item.item_name,
      description: item.description,
      price_lkr: item.price_lkr,
      category: item.category,
      is_vegetarian: item.is_vegetarian,
      is_vegan: item.is_vegan,
      confidence: item.confidence,
      source_photo_refs: photoRefs,
      extracted_at: new Date().toISOString(),
    }));
    const { error } = await db
      .from("place_menu_items")
      .upsert(rows, { onConflict: "place_id,item_name" });
    if (error) throw new Error(`DB write failed: ${error.message}`);
  }

  const { error: logErr } = await db
    .from("place_menu_extractions")
    .upsert(
      {
        place_id: placeId,
        extracted_at: new Date().toISOString(),
        photo_count: photoRefs.length,
        item_count: items.length,
        model: MODEL,
        notes: notes ?? (items.length === 0 ? "no_menu_found" : null),
      },
      { onConflict: "place_id" }
    );
  if (logErr) throw new Error(`Log write failed: ${logErr.message}`);
}

// ── Per-place logic ───────────────────────────────────────────────────────────

type Status = "ok" | "skipped" | "no_photos" | "no_menu" | "error";

async function processPlace(
  place: { place_id: string; name: string },
  opts: ReturnType<typeof parseArgs>,
  db: SupabaseClient,
  anthropic: Anthropic,
  googleKey: string
): Promise<{ status: Status; detail?: string }> {
  const { place_id, name } = place;

  if (!opts.force) {
    const { data } = await db
      .from("place_menu_extractions")
      .select("place_id")
      .eq("place_id", place_id)
      .maybeSingle();
    if (data) return { status: "skipped" };
  }

  if (opts.dryRun) {
    return { status: "ok", detail: "dry-run" };
  }

  // Fetch photo references
  let refs: PhotoRef[];
  try {
    refs = await fetchPhotoRefs(place_id, googleKey, opts.photosPerPlace);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await saveResults(db, place_id, [], [], `fetch_error: ${msg}`);
    return { status: "error", detail: msg };
  }

  if (refs.length === 0) {
    await saveResults(db, place_id, [], [], "no_photos");
    return { status: "no_photos" };
  }

  // Download + compress all photos concurrently
  const buffers = await Promise.all(
    refs.map((r) => downloadAndCompress(r.photo_reference, googleKey))
  );
  const validBuffers = buffers.filter((b): b is Buffer => b !== null);
  const validRefs = refs
    .filter((_, i) => buffers[i] !== null)
    .map((r) => r.photo_reference);

  if (validBuffers.length === 0) {
    await saveResults(db, place_id, [], [], "all_downloads_failed");
    return { status: "no_photos", detail: "downloads failed" };
  }

  // Single Claude call with ALL photos for this place
  let result: ExtractionResult;
  try {
    result = await extractFromPhotos(anthropic, validBuffers, name);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await saveResults(db, place_id, [], validRefs, `extraction_error: ${msg}`);
    return { status: "error", detail: msg };
  }

  await saveResults(db, place_id, result.menu_items ?? [], validRefs, result.notes);

  return {
    status: result.has_menu ? "ok" : "no_menu",
    detail: result.has_menu ? `${result.menu_items.length} items` : undefined,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();

  const googleKey = process.env.GOOGLE_PLACES_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!googleKey) throw new Error("GOOGLE_PLACES_API_KEY not set in .env.local");
  if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY not set in .env.local");

  const db = getDb();
  const anthropic = new Anthropic({ apiKey: anthropicKey });

  let query = db.from("places").select("place_id, name");
  if (opts.placeId) query = query.eq("place_id", opts.placeId);

  const { data: places, error } = await query;
  if (error) throw new Error(`Failed to load places: ${error.message}`);
  if (!places || places.length === 0) {
    console.log("No places in DB. Run /api/sync-places first.");
    return;
  }

  const targets = (places as { place_id: string; name: string }[]).slice(
    0,
    opts.max === Infinity ? undefined : opts.max
  );

  console.log(`\nMenu Extractor — ${MODEL}`);
  console.log(`Processing ${targets.length} place(s) | force=${opts.force} dry-run=${opts.dryRun}\n`);

  const stats: Record<Status, number> = { ok: 0, skipped: 0, no_photos: 0, no_menu: 0, error: 0 };

  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (place) => {
        process.stdout.write(`  ${place.name.padEnd(42)}`);
        const res = await processPlace(place, opts, db, anthropic, googleKey);
        const label: Record<Status, string> = {
          ok: `✓  ${res.detail ?? ""}`,
          skipped: "–  already done",
          no_photos: `○  no photos${res.detail ? ` (${res.detail})` : ""}`,
          no_menu: "○  no menu visible",
          error: `✗  ${res.detail}`,
        };
        console.log(label[res.status]);
        stats[res.status]++;
      })
    );
  }

  console.log(`\nResults:`);
  console.log(`  Menus extracted : ${stats.ok}`);
  console.log(`  No menu visible : ${stats.no_menu}`);
  console.log(`  No photos       : ${stats.no_photos}`);
  console.log(`  Skipped         : ${stats.skipped}`);
  console.log(`  Errors          : ${stats.error}`);
}

main().catch((err) => {
  console.error("\nFatal:", err.message ?? err);
  process.exit(1);
});
