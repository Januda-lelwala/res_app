"use client";

import { useState, useEffect } from "react";

interface ReviewModalProps {
  placeId: string;
  placeName: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function ReviewModal({ placeId, placeName, onClose, onSubmitted }: ReviewModalProps) {
  const [reviewerName, setReviewerName] = useState("");
  const [body, setBody] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/places/${placeId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewerName: reviewerName.trim(),
          body: body.trim(),
          rating: rating ?? undefined,
        }),
      });

      if (res.status === 429) {
        setError("You've submitted too many reviews today. Please try again tomorrow.");
        return;
      }
      if (res.status === 409) {
        setError("You've already submitted a review for this place.");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? "Couldn't submit — please try again.");
        return;
      }

      setSuccess(true);
      onSubmitted();
    } catch {
      setError("Couldn't submit — please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isValid = reviewerName.trim().length >= 1 && body.trim().length >= 20;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-bold text-ocean text-base leading-snug">{placeName}</h2>
            <p className="text-ocean/50 text-xs mt-0.5">Share your experience to help others</p>
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

        {success ? (
          <div className="py-6 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-ocean font-semibold text-sm">Thanks for your review!</p>
            <p className="text-ocean/50 text-xs">It's being checked and will appear shortly.</p>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2 rounded-xl bg-ocean text-white text-sm font-semibold hover:bg-ocean/90 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <input
                type="text"
                className="w-full border border-sand/60 rounded-xl px-3 py-2.5 text-sm text-ocean placeholder-ocean/30 focus:outline-none focus:border-sky"
                placeholder="Your name"
                maxLength={60}
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                autoFocus
              />

              <div>
                <textarea
                  className="w-full border border-sand/60 rounded-xl px-3 py-2.5 text-sm text-ocean placeholder-ocean/30 focus:outline-none focus:border-sky resize-none"
                  rows={4}
                  placeholder="What did you eat or drink? How was the service, price, ambience? (min. 20 characters)"
                  maxLength={1000}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
                <p className="text-right text-xs text-ocean/30 mt-0.5">{body.length}/1000</p>
              </div>

              {/* Star rating */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-ocean/50">Rating (optional)</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(rating === star ? null : star)}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(null)}
                      className="transition-colors"
                      aria-label={`${star} star`}
                    >
                      <svg
                        className={`w-5 h-5 ${
                          star <= (hoveredStar ?? rating ?? 0)
                            ? "text-amber-400"
                            : "text-sand/40"
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && <p className="text-coral text-xs mt-3">{error}</p>}

            <div className="flex gap-2 mt-4">
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-xl border border-sand/60 text-ocean/60 text-sm font-medium hover:bg-sand/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !isValid}
                className="flex-1 py-2 rounded-xl bg-ocean text-white text-sm font-semibold hover:bg-ocean/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting…
                  </>
                ) : "Submit review"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
