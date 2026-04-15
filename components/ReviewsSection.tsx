"use client";

import { useState } from "react";
import ReviewModal from "./ReviewModal";
import type { PlaceReview } from "@/lib/types";

interface ReviewsSectionProps {
  placeId: string;
  placeName: string;
  initialReviews: PlaceReview[];
  userDescription?: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export default function ReviewsSection({
  placeId,
  placeName,
  initialReviews,
  userDescription,
}: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<PlaceReview[]>(initialReviews);
  const [showAll, setShowAll] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const displayed = showAll ? reviews : reviews.slice(0, 3);

  function handleSubmitted() {
    // Optimistically show a "pending" message — review will appear after moderation
  }

  return (
    <div className="mt-3">
      {/* Curator notes (the existing userDescription) */}
      {userDescription && (
        <div className="mb-2 px-3 py-2 bg-amber-50 border border-amber-200/60 rounded-xl text-xs text-ocean/70 leading-relaxed">
          <span className="font-semibold text-amber-700">Curator notes: </span>
          {userDescription}
        </div>
      )}

      {/* Visitor reviews */}
      {reviews.length > 0 && (
        <div className="space-y-2 mb-2">
          {displayed.map((review) => (
            <div
              key={review.id}
              className="px-3 py-2 bg-sky/5 border border-sky/20 rounded-xl text-xs text-ocean/80 leading-relaxed"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-ocean/70">{review.reviewerName}</span>
                <div className="flex items-center gap-1.5">
                  {review.rating != null && (
                    <span className="flex items-center gap-0.5 text-amber-500 font-medium">
                      <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {review.rating}
                    </span>
                  )}
                  <span className="text-ocean/30">{timeAgo(review.createdAt)}</span>
                </div>
              </div>
              <p>{review.body}</p>
            </div>
          ))}

          {reviews.length > 3 && (
            <button
              onClick={() => setShowAll((s) => !s)}
              className="text-xs text-sky font-medium hover:underline"
            >
              {showAll ? "Show less" : `Show all ${reviews.length} reviews`}
            </button>
          )}
        </div>
      )}

      {reviews.length === 0 && !userDescription && (
        <p className="text-xs text-ocean/30 mb-2">No visitor reviews yet — be the first!</p>
      )}

      <button
        onClick={() => setShowModal(true)}
        className="text-xs text-sky font-medium hover:underline"
      >
        Write a review
      </button>

      {showModal && (
        <ReviewModal
          placeId={placeId}
          placeName={placeName}
          onClose={() => setShowModal(false)}
          onSubmitted={handleSubmitted}
        />
      )}
    </div>
  );
}
