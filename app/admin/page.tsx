"use client";

import { useEffect, useState, useCallback } from "react";
import { PlaceRecord } from "@/lib/places-db";

type EditState = {
  ownerNotes: string;
  ownerPrice: string;
};

export default function AdminPage() {
  const [places, setPlaces] = useState<PlaceRecord[]>([]);
  const [filtered, setFiltered] = useState<PlaceRecord[]>([]);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPlaces = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/places");
    const data = await res.json();
    setPlaces(data.places ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q ? places.filter((p) => p.name.toLowerCase().includes(q)) : places
    );
  }, [search, places]);

  function getEdit(place: PlaceRecord): EditState {
    return (
      edits[place.placeId] ?? {
        ownerNotes: place.ownerNotes ?? "",
        ownerPrice: place.ownerPrice ?? "",
      }
    );
  }

  function setEdit(placeId: string, field: keyof EditState, value: string) {
    setEdits((prev) => ({
      ...prev,
      [placeId]: { ...getEditById(placeId), [field]: value },
    }));
  }

  function getEditById(placeId: string): EditState {
    const place = places.find((p) => p.placeId === placeId);
    return (
      edits[placeId] ?? {
        ownerNotes: place?.ownerNotes ?? "",
        ownerPrice: place?.ownerPrice ?? "",
      }
    );
  }

  async function save(placeId: string) {
    setSaving(placeId);
    const edit = getEditById(placeId);
    await fetch("/api/admin/places", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        placeId,
        ownerNotes: edit.ownerNotes || null,
        ownerPrice: edit.ownerPrice || null,
      }),
    });
    setSaving(null);
    setSaved(placeId);
    // Update local state so the pill reflects the change immediately
    setPlaces((prev) =>
      prev.map((p) =>
        p.placeId === placeId
          ? { ...p, ownerNotes: edit.ownerNotes || undefined, ownerPrice: edit.ownerPrice || undefined }
          : p
      )
    );
    setTimeout(() => setSaved(null), 2000);
  }

  async function syncFort() {
    setSyncing(true);
    setSyncResult(null);
    const res = await fetch("/api/sync-places", { method: "POST" });
    const data = await res.json();
    setSyncing(false);
    if (data.success) {
      setSyncResult(`Synced ${data.count} places`);
      fetchPlaces();
    } else {
      setSyncResult(`Error: ${data.error}`);
    }
  }

  const hasNotes = (p: PlaceRecord) => !!(p.ownerNotes || p.ownerPrice);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-ocean text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Galle Fort — Place Admin</h1>
          <p className="text-sm text-blue-200 mt-0.5">
            Add notes &amp; price info so Claude describes places accurately
          </p>
        </div>
        <div className="flex items-center gap-3">
          {syncResult && (
            <span className="text-sm text-blue-200">{syncResult}</span>
          )}
          <button
            onClick={syncFort}
            disabled={syncing}
            className="bg-coral text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            {syncing ? "Syncing…" : "Sync Fort Places"}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="flex gap-4 mb-5 text-sm text-gray-500">
          <span>{places.length} places total</span>
          <span>·</span>
          <span>{places.filter(hasNotes).length} with notes</span>
          <span>·</span>
          <span>{places.filter((p) => !hasNotes(p)).length} need notes</span>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-ocean/30"
        />

        {/* List */}
        {loading ? (
          <p className="text-center text-gray-400 py-12">Loading places…</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-12">No places found</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((place) => {
              const isOpen = expandedId === place.placeId;
              const edit = getEdit(place);
              const isSaving = saving === place.placeId;
              const isSaved = saved === place.placeId;
              const hasData = hasNotes(place);

              return (
                <div
                  key={place.placeId}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  {/* Row */}
                  <button
                    className="w-full text-left px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition"
                    onClick={() =>
                      setExpandedId(isOpen ? null : place.placeId)
                    }
                  >
                    {/* Status dot */}
                    <span
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        hasData ? "bg-emerald-400" : "bg-gray-200"
                      }`}
                    />

                    {/* Name + meta */}
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-900 text-sm">
                        {place.name}
                      </span>
                      <span className="ml-2 text-xs text-gray-400">
                        {place.category}
                        {place.rating ? ` · ★ ${place.rating}` : ""}
                      </span>
                    </div>

                    {/* Preview of notes */}
                    {place.ownerNotes && !isOpen && (
                      <span className="text-xs text-gray-400 italic truncate max-w-[240px] hidden sm:block">
                        {place.ownerNotes}
                      </span>
                    )}

                    {/* Chevron */}
                    <span className="text-gray-300 text-sm ml-2">
                      {isOpen ? "▲" : "▼"}
                    </span>
                  </button>

                  {/* Expanded edit form */}
                  {isOpen && (
                    <div className="px-5 pb-5 border-t border-gray-50 pt-4 space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                          Notes (vibe, atmosphere, crowd, cuisine…)
                        </label>
                        <textarea
                          rows={3}
                          value={edit.ownerNotes}
                          onChange={(e) =>
                            setEdit(place.placeId, "ownerNotes", e.target.value)
                          }
                          placeholder="e.g. Rooftop terrace inside the Fort walls, colonial décor, great for sundowners, mix of tourists and expats. Sri Lankan fusion menu."
                          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30 resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                          Price info (actual dish prices)
                        </label>
                        <input
                          type="text"
                          value={edit.ownerPrice}
                          onChange={(e) =>
                            setEdit(place.placeId, "ownerPrice", e.target.value)
                          }
                          placeholder="e.g. Rice & curry Rs 350, mains Rs 800–1,500, beers Rs 450"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => save(place.placeId)}
                          disabled={isSaving}
                          className="bg-ocean text-white px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
                        >
                          {isSaving ? "Saving…" : "Save"}
                        </button>
                        {isSaved && (
                          <span className="text-emerald-500 text-sm font-medium">
                            ✓ Saved
                          </span>
                        )}
                        <a
                          href={`https://www.google.com/maps/place/?q=place_id:${place.placeId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-500 hover:underline ml-auto"
                        >
                          View on Google Maps →
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
