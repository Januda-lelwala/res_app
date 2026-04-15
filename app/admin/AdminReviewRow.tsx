"use client";

import { useState } from "react";
import type { PlaceReview } from "@/lib/types";

interface Props {
  review: PlaceReview;
}

const CONFIDENCE_COLOR = (c: number) => {
  if (c >= 0.85) return "text-emerald-600";
  if (c >= 0.6) return "text-amber-600";
  return "text-red-500";
};

export default function AdminReviewRow({ review }: Props) {
  const [status, setStatus] = useState(review.status);
  const [adminNote, setAdminNote] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isDone = status === "approved" || status === "rejected";

  async function handleAction(newStatus: "approved" | "rejected") {
    setIsUpdating(true);
    const res = await fetch(`/api/admin/reviews/${review.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, adminNote: adminNote || undefined }),
    });
    if (res.ok) setStatus(newStatus);
    setIsUpdating(false);
  }

  const verdictBadge = review.aiVerdict
    ? {
        approve: "bg-emerald-100 text-emerald-700",
        reject: "bg-red-100 text-red-600",
        flag: "bg-amber-100 text-amber-700",
      }[review.aiVerdict]
    : "bg-gray-100 text-gray-500";

  return (
    <div className={`bg-white rounded-xl border p-4 transition-opacity ${isDone ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-ocean text-sm">{review.reviewerName}</span>
            {review.rating != null && (
              <span className="text-amber-500 text-xs font-medium">★ {review.rating}/5</span>
            )}
            <span className="text-gray-400 text-xs">{new Date(review.createdAt).toLocaleDateString()}</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">{review.body}</p>
        </div>

        {/* AI verdict */}
        <div className="shrink-0 text-right">
          {review.aiVerdict && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${verdictBadge}`}>
              AI: {review.aiVerdict}
            </span>
          )}
          {review.aiConfidence != null && (
            <div className={`text-xs mt-1 font-medium ${CONFIDENCE_COLOR(review.aiConfidence)}`}>
              {Math.round(review.aiConfidence * 100)}% conf
            </div>
          )}
        </div>
      </div>

      {review.aiReason && (
        <p className="text-xs text-gray-500 mt-2 italic">"{review.aiReason}"</p>
      )}

      {/* Expand for admin note + actions */}
      {!isDone && (
        <div className="mt-3">
          {expanded && (
            <input
              type="text"
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:border-sky mb-2"
              placeholder="Admin note (optional)"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
            />
          )}
          <div className="flex gap-2 items-center">
            <button
              onClick={() => handleAction("approved")}
              disabled={isUpdating}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => handleAction("rejected")}
              disabled={isUpdating}
              className="px-4 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              Reject
            </button>
            <button
              onClick={() => setExpanded((s) => !s)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors ml-1"
            >
              {expanded ? "Hide note" : "Add note"}
            </button>
          </div>
        </div>
      )}

      {isDone && (
        <div className={`mt-2 text-xs font-semibold ${status === "approved" ? "text-emerald-600" : "text-red-500"}`}>
          {status === "approved" ? "✓ Approved" : "✗ Rejected"}
        </div>
      )}
    </div>
  );
}
