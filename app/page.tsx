"use client";

import { useState, useCallback } from "react";
import ChatInput from "@/components/ChatInput";
import MapView from "@/components/MapView";
import PlaceCard from "@/components/PlaceCard";
import { Recommendation } from "@/lib/types";
import { priceLevelToLKR, categoryFromTypes } from "@/lib/utils";
import { useLocation } from "@/lib/useLocation";

const CATEGORIES = ["Restaurant", "Bar", "Cafe", "Street Food", "Rooftop"] as const;
const BUDGETS = ["Under LKR 500", "LKR 500–1500", "LKR 1500–3000", "LKR 3000+"] as const;

type Category = (typeof CATEGORIES)[number] | null;
type Budget = (typeof BUDGETS)[number] | null;

export default function Home() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Recommendation | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>(null);
  const [activeBudget, setActiveBudget] = useState<Budget>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastQuery, setLastQuery] = useState("");
  const location = useLocation();

  const handleSearch = useCallback(
    async (query: string) => {
      setIsLoading(true);
      setError(null);
      setSelectedPlace(null);

      try {
        const filters: Record<string, string> = {};
        if (activeCategory) filters.category = activeCategory;
        if (activeBudget) filters.budget = activeBudget;

        const chatRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: query, filters }),
        });

        if (!chatRes.ok) {
          const err = await chatRes.json();
          throw new Error(err.error ?? "Failed to get recommendations");
        }

        const { recommendations: aiRecs }: { recommendations: Recommendation[] } =
          await chatRes.json();

        const enriched = await Promise.all(
          aiRecs.map(async (rec) => {
            try {
              const placesRes = await fetch("/api/places", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: rec.name }),
              });
              const { places } = await placesRes.json();
              const match = places?.[0];
              if (match) {
                return {
                  ...rec,
                  placeId: match.placeId,
                  rating: match.rating,
                  totalRatings: match.totalRatings,
                  priceRange:
                    match.priceLevel !== undefined
                      ? priceLevelToLKR(match.priceLevel)
                      : rec.priceRange,
                  category:
                    (categoryFromTypes(match.types) as Recommendation["category"]) ?? rec.category,
                  address: match.address,
                  openNow: match.openNow,
                  photoUrl: match.photoUrl,
                  lat: match.lat,
                  lng: match.lng,
                  googleMapsUrl: match.placeId
                    ? `https://www.google.com/maps/place/?q=place_id:${match.placeId}`
                    : undefined,
                } as Recommendation;
              }
            } catch {
              // fall through to AI-only data
            }
            return rec;
          })
        );

        setLastQuery(query);
        setRecommendations(enriched);
        setHasSearched(true);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Ayyo! Something went wrong, try again."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [activeCategory, activeBudget]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-ocean to-ocean/80">
      {/* ── Hero section ── */}
      <div className="px-4 pt-10 pb-8 max-w-2xl mx-auto">
        {/* Wordmark */}
        <div className="text-center mb-7">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            🌊 Discover Galle
          </h1>
          <p className="text-white/50 text-sm mt-1">
            Tell the AI what you&apos;re looking for — it knows every corner of Galle
          </p>
        </div>

        {/* Chat input */}
        <ChatInput onSearch={handleSearch} isLoading={isLoading} />

        {/* Quick filter chips */}
        <div className="mt-4 space-y-2">
          {/* Category row */}
          <div className="flex flex-wrap gap-2 justify-center">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => {
                  const next = activeCategory === c ? null : c;
                  setActiveCategory(next);
                  if (hasSearched && lastQuery) handleSearch(lastQuery);
                }}
                className={`text-xs px-3.5 py-1.5 rounded-full font-medium border transition-all ${
                  activeCategory === c
                    ? "bg-coral border-coral text-white"
                    : "bg-white/10 border-white/20 text-white/80 hover:bg-white/20"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          {/* Budget row */}
          <div className="flex flex-wrap gap-2 justify-center">
            {BUDGETS.map((b) => (
              <button
                key={b}
                onClick={() => {
                  const next = activeBudget === b ? null : b;
                  setActiveBudget(next);
                  if (hasSearched && lastQuery) handleSearch(lastQuery);
                }}
                className={`text-xs px-3.5 py-1.5 rounded-full font-medium border transition-all ${
                  activeBudget === b
                    ? "bg-coral border-coral text-white"
                    : "bg-white/10 border-white/20 text-white/80 hover:bg-white/20"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Location button */}
        <div className="mt-4 flex justify-center">
          {location.status === "idle" && (
            <button
              onClick={location.request}
              className="flex items-center gap-2 text-xs text-white/60 hover:text-white border border-white/20 hover:border-white/40 px-4 py-2 rounded-full transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Use my location
            </button>
          )}
          {location.status === "requesting" && (
            <span className="text-xs text-white/40 flex items-center gap-2">
              <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
              Getting location…
            </span>
          )}
          {location.status === "in-galle" && (
            <span className="text-xs text-blue-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              Using your location · distances updated
            </span>
          )}
          {location.status === "outside" && (
            <span className="text-xs text-white/40">
              You&apos;re outside Galle — distances shown from Galle Fort
            </span>
          )}
          {(location.status === "denied" || location.status === "unavailable") && (
            <span className="text-xs text-white/40">
              Location unavailable — distances shown from Galle Fort
            </span>
          )}
        </div>

        {error && (
          <p className="mt-4 text-center text-coral bg-coral/10 border border-coral/30 rounded-xl px-4 py-2 text-sm">
            {error}
          </p>
        )}
      </div>

      {/* ── Results ── */}
      {hasSearched && (
        <main className="px-4 pb-16 max-w-2xl mx-auto">
          {/* Mini map strip */}
          <div className="mb-5">
            <MapView
              recommendations={recommendations}
              selectedPlace={selectedPlace}
              onMarkerClick={setSelectedPlace}
              userLocation={location.status === "in-galle" ? location.coords : null}
            />
          </div>

          {/* Result count */}
          {recommendations.length > 0 && (
            <p className="text-white/50 text-xs mb-3">
              {recommendations.length} place{recommendations.length !== 1 ? "s" : ""} found
            </p>
          )}

          {/* Cards */}
          {recommendations.length === 0 && !isLoading ? (
            <div className="text-center py-12 text-white/40">
              <p className="text-3xl mb-2">🤷</p>
              <p className="text-sm">No places found — try rephrasing your search.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {recommendations.map((place) => (
                <PlaceCard
                  key={place.name}
                  place={place}
                  onSelect={setSelectedPlace}
                  isSelected={selectedPlace?.name === place.name}
                  userLocation={location.status === "in-galle" ? location.coords : null}
                />
              ))}
            </div>
          )}
        </main>
      )}

      {/* ── First-load teaser ── */}
      {!hasSearched && !isLoading && (
        <div className="px-4 pb-16 max-w-2xl mx-auto text-center">
          <p className="text-white/30 text-xs mt-2">
            Galle Fort · Unawatuna · Closenberg · Light House Street
          </p>
        </div>
      )}
    </div>
  );
}
