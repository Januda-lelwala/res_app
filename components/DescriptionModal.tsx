"use client";

import { useState, useEffect } from "react";
import { Recommendation } from "@/lib/types";

interface DescriptionModalProps {
  place: Recommendation;
  onClose: () => void;
  onSaved: (placeId: string, description: string) => void;
}

export default function DescriptionModal({ place, onClose, onSaved }: DescriptionModalProps) {
  const [text, setText] = useState(place.userDescription ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleSave() {
    if (!place.placeId) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/places/${place.placeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: text }),
      });
      if (!res.ok) throw new Error("Save failed");
      onSaved(place.placeId, text);
      onClose();
    } catch {
      setError("Couldn't save — please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-bold text-ocean text-base leading-snug">{place.name}</h2>
            <p className="text-ocean/50 text-xs mt-0.5">Add menu items or notes to improve recommendations</p>
          </div>
          <button
            onClick={onClose}
            className="text-ocean/30 hover:text-ocean/60 transition-colors ml-3 shrink-0"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <textarea
          className="w-full border border-sand/60 rounded-xl px-3 py-2.5 text-sm text-ocean placeholder-ocean/30 focus:outline-none focus:border-sky resize-none"
          rows={5}
          placeholder="e.g. Serves hoppers, kottu, and fresh seafood. Great wood-fired pizza. Known for the mango lassi. Good vegetarian options."
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />

        {error && (
          <p className="text-coral text-xs mt-2">{error}</p>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-sand/60 text-ocean/60 text-sm font-medium hover:bg-sand/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !place.placeId}
            className="flex-1 py-2 rounded-xl bg-ocean text-white text-sm font-semibold hover:bg-ocean/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </>
            ) : "Save notes"}
          </button>
        </div>
      </div>
    </div>
  );
}
