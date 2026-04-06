"use client";

import { useState } from "react";
import { Recommendation } from "@/lib/types";
import { distanceKm, walkingMinutes } from "@/lib/utils";

interface UserLocation { lat: number; lng: number }

interface PlaceCardProps {
  place: Recommendation;
  onSelect: (place: Recommendation) => void;
  isSelected: boolean;
  userLocation?: UserLocation | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  Restaurant: "bg-emerald-100 text-emerald-700",
  Bar: "bg-purple-100 text-purple-700",
  Cafe: "bg-amber-100 text-amber-700",
  "Street Food": "bg-orange-100 text-orange-700",
  Rooftop: "bg-sky-100 text-sky-700",
};

export default function PlaceCard({ place, onSelect, isSelected, userLocation }: PlaceCardProps) {
  const distanceLabel = (() => {
    if (userLocation && place.lat && place.lng) {
      const mins = walkingMinutes(distanceKm(userLocation.lat, userLocation.lng, place.lat, place.lng));
      return `${mins} min walk from you`;
    }
    return `${place.distanceFromFort} min walk from fort`;
  })();

  const photos =
    (place.photoUrls && place.photoUrls.length > 0)
      ? place.photoUrls
      : place.photoUrl
        ? [place.photoUrl]
        : [];
  const [activeIdx, setActiveIdx] = useState(0);
  return (
    <div
      onClick={() => onSelect(place)}
      className={`bg-white rounded-2xl overflow-hidden cursor-pointer transition-all border ${
        isSelected
          ? "border-coral ring-1 ring-coral shadow-md"
          : "border-sand/40 hover:border-coral/40 hover:shadow-sm"
      }`}
    >
      {/* Photo gallery */}
      {photos.length > 0 && (
        <div className="relative w-full h-36 overflow-hidden bg-sand/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[activeIdx]}
            alt={`${place.name} photo ${activeIdx + 1}`}
            className="w-full h-full object-cover"
          />
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setActiveIdx((idx) => (idx - 1 + photos.length) % photos.length); }}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs transition-colors"
                aria-label="Previous photo"
              >
                ‹
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setActiveIdx((idx) => (idx + 1) % photos.length); }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs transition-colors"
                aria-label="Next photo"
              >
                ›
              </button>
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setActiveIdx(i); }}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${i === activeIdx ? "bg-white" : "bg-white/40"}`}
                    aria-label={`Photo ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="p-4">
      {/* Top row: name + open/closed */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-bold text-ocean text-sm leading-snug">{place.name}</h3>
        {place.openNow !== undefined && (
          <span
            className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
              place.openNow ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
            }`}
          >
            {place.openNow ? "Open" : "Closed"}
          </span>
        )}
      </div>

      {/* Category badge */}
      <span
        className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-3 ${
          CATEGORY_COLORS[place.category] ?? "bg-gray-100 text-gray-600"
        }`}
      >
        {place.category}
      </span>

      {/* Vibe description — the AI magic */}
      <p className="text-sm text-ocean/70 leading-relaxed mb-3">{place.vibeDescription}</p>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-xs text-ocean/50 mb-4">
        {place.rating && (
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="font-semibold text-ocean/70">{place.rating.toFixed(1)}</span>
          </span>
        )}
        <span>{distanceLabel}</span>
        <span>{place.priceRange}</span>
      </div>

      {/* Maps link */}
      {place.googleMapsUrl ? (
        <a
          href={place.googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="block w-full text-center text-xs bg-ocean hover:bg-ocean/90 text-white py-2 rounded-xl font-semibold transition-colors"
        >
          Get directions →
        </a>
      ) : (
        <div className="h-8" />
      )}
      </div>
    </div>
  );
}
