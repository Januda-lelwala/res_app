import { getAdminQueue, getAdminReviewCounts } from "@/lib/reviews-db";
import AdminReviewRow from "./AdminReviewRow";
import type { ReviewStatus } from "@/lib/types";

const STATUS_TABS: { value: ReviewStatus; label: string }[] = [
  { value: "flagged", label: "Flagged" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_COLORS: Record<ReviewStatus, string> = {
  flagged: "bg-amber-100 text-amber-700",
  pending: "bg-gray-100 text-gray-600",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-600",
};

interface PageProps {
  searchParams: { status?: string };
}

export default async function AdminPage({ searchParams }: PageProps) {
  const activeStatus = (searchParams.status ?? "flagged") as ReviewStatus;
  const [reviews, counts] = await Promise.all([
    getAdminQueue(activeStatus, 50),
    getAdminReviewCounts(),
  ]);

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {STATUS_TABS.map(({ value, label }) => (
          <a
            key={value}
            href={`/admin?status=${value}`}
            className={`rounded-xl p-4 text-center border transition-all ${
              activeStatus === value
                ? "border-ocean bg-white shadow-sm"
                : "border-transparent bg-white/60 hover:bg-white"
            }`}
          >
            <div className="text-2xl font-bold text-ocean">{counts[value]}</div>
            <div className={`text-xs font-medium mt-1 px-2 py-0.5 rounded-full inline-block ${STATUS_COLORS[value]}`}>
              {label}
            </div>
          </a>
        ))}
      </div>

      {/* Review list */}
      {reviews.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-3xl mb-2">✓</p>
          <p className="text-sm">No {activeStatus} reviews</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <AdminReviewRow key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}
