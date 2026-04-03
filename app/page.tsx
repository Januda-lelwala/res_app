"use client";

import { useState, useCallback } from "react";
import ChatInput from "@/components/ChatInput";
import MapView from "@/components/MapView";
import PlaceCard from "@/components/PlaceCard";
import { Recommendation } from "@/lib/types";
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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
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

        setLastQuery(query);
        setRecommendations(aiRecs);
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

  const handleLoadMore = useCallback(async () => {
    if (!lastQuery || isLoadingMore) return;
    setIsLoadingMore(true);
    setError(null);

    try {
      const filters: Record<string, string> = {};
      if (activeCategory) filters.category = activeCategory;
      if (activeBudget) filters.budget = activeBudget;

      const exclude = recommendations.map((r) => r.name);

      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: lastQuery, filters, exclude }),
      });

      if (!chatRes.ok) {
        const err = await chatRes.json();
        throw new Error(err.error ?? "Failed to get more recommendations");
      }

      const { recommendations: aiRecs }: { recommendations: Recommendation[] } =
        await chatRes.json();

      setRecommendations((prev) => [...prev, ...aiRecs]);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Ayyo! Something went wrong, try again."
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [lastQuery, recommendations, activeCategory, activeBudget, isLoadingMore]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-seafoam via-[#E0F2FE] to-white relative overflow-x-hidden">
      {/* Decorative wave shape behind hero */}
      <div className="absolute top-0 left-0 right-0 h-72 overflow-hidden pointer-events-none -z-0">
        <svg className="absolute bottom-0 w-[200%] wave-animate opacity-20" viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,20 1440,40 L1440,80 L0,80 Z" fill="#0F3460" />
        </svg>
        <svg className="absolute bottom-0 w-[200%] opacity-10" style={{animationDelay:"2s"}} viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path d="M0,50 C240,10 480,70 720,50 C960,30 1200,70 1440,50 L1440,80 L0,80 Z" fill="#7DD3FC" />
        </svg>
      </div>

      {/* ── Hero section ── */}
      <div className="relative z-10 px-4 pt-12 pb-8 max-w-2xl mx-auto">
        {/* Wordmark */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm border border-sky/30 rounded-full px-4 py-1.5 mb-4 shadow-sm">
            <span className="text-xs font-semibold text-ocean/60 tracking-widest uppercase">Sri Lanka</span>
          </div>
          <h1 className="text-4xl font-bold text-ocean tracking-tight leading-tight">
            🏖️ Explore Galle Fort
          </h1>
          <p className="text-ocean/50 text-sm mt-2 font-medium">
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
                className={`text-xs px-3.5 py-1.5 rounded-full font-medium border transition-all shadow-sm ${
                  activeCategory === c
                    ? "bg-coral border-coral text-white shadow-coral/30 shadow-md"
                    : "bg-white/70 border-sky/40 text-ocean/70 hover:bg-white hover:border-sky"
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
                className={`text-xs px-3.5 py-1.5 rounded-full font-medium border transition-all shadow-sm ${
                  activeBudget === b
                    ? "bg-coral border-coral text-white shadow-coral/30 shadow-md"
                    : "bg-white/70 border-sky/40 text-ocean/70 hover:bg-white hover:border-sky"
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
              className="flex items-center gap-2 text-xs text-ocean/60 hover:text-ocean border border-ocean/20 hover:border-ocean/40 bg-white/50 hover:bg-white/80 px-4 py-2 rounded-full transition-all backdrop-blur-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Use my location
            </button>
          )}
          {location.status === "requesting" && (
            <span className="text-xs text-ocean/50 flex items-center gap-2">
              <span className="w-3 h-3 border border-ocean/30 border-t-ocean rounded-full animate-spin" />
              Getting location…
            </span>
          )}
          {location.status === "in-galle" && (
            <span className="text-xs text-sky-600 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
              Using your location · distances updated
            </span>
          )}
          {location.status === "outside" && (
            <span className="text-xs text-ocean/40">
              You&apos;re outside Galle — distances shown from Galle Fort
            </span>
          )}
          {(location.status === "denied" || location.status === "unavailable") && (
            <span className="text-xs text-ocean/40">
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
        <main className="relative z-10 px-4 pb-16 max-w-2xl mx-auto">
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
            <p className="text-ocean/40 text-xs mb-3">
              {recommendations.length} place{recommendations.length !== 1 ? "s" : ""} found
            </p>
          )}

          {/* Cards */}
          {recommendations.length === 0 && !isLoading ? (
            <div className="text-center py-12 text-ocean/30">
              <p className="text-3xl mb-2">🤷</p>
              <p className="text-sm">No places found — try rephrasing your search.</p>
            </div>
          ) : (
            <>
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

            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="mt-5 w-full py-3 rounded-2xl border border-sky/40 bg-white/50 text-ocean/60 hover:text-ocean hover:border-sky hover:bg-white text-sm font-medium transition-all disabled:opacity-40 flex items-center justify-center gap-2 backdrop-blur-sm"
            >
              {isLoadingMore ? (
                <>
                  <span className="w-4 h-4 border-2 border-ocean/30 border-t-ocean rounded-full animate-spin" />
                  Finding more…
                </>
              ) : (
                "Show more places →"
              )}
            </button>
            </>
          )}
        </main>
      )}

      {/* ── First-load teaser ── */}
      {!hasSearched && !isLoading && (
        <div className="relative z-10 px-4 pb-16 max-w-2xl mx-auto text-center">
          <p className="text-ocean/30 text-xs mt-2 tracking-wide">
            Galle Fort · Unawatuna · Closenberg · Light House Street
          </p>
        </div>
      )}
    </div>
  );
}
