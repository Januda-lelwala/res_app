"use client";

import { FilterState } from "@/lib/types";

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

const FILTER_CONFIG = {
  budget: ["Under LKR 500", "LKR 500–1500", "LKR 1500–3000", "LKR 3000+"],
  category: ["Restaurant", "Bar", "Cafe", "Street Food", "Rooftop"],
  vibe: ["Chill", "Lively", "Romantic", "Family"],
  distance: ["Walking", "Tuk-tuk", "Any"],
} as const;

type FilterKey = keyof typeof FILTER_CONFIG;

export default function FilterBar({ filters, onChange }: FilterBarProps) {
  function toggle(key: FilterKey, value: string) {
    onChange({
      ...filters,
      [key]: filters[key] === value ? null : value,
    });
  }

  function clearAll() {
    onChange({ budget: null, category: null, vibe: null, distance: null });
  }

  const hasActive = Object.values(filters).some(Boolean);

  return (
    <aside className="w-full md:w-64 shrink-0">
      <div className="bg-white rounded-2xl shadow-sm border border-sand/30 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-ocean uppercase tracking-wider">Filters</h2>
          {hasActive && (
            <button
              onClick={clearAll}
              className="text-xs text-coral hover:text-coral/70 font-medium transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {(Object.keys(FILTER_CONFIG) as FilterKey[]).map((key) => (
          <div key={key} className="mb-5">
            <p className="text-xs font-semibold text-ocean/60 uppercase tracking-wide mb-2 capitalize">
              {key}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {FILTER_CONFIG[key].map((option) => {
                const active = filters[key] === option;
                return (
                  <button
                    key={option}
                    onClick={() => toggle(key, option)}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                      active
                        ? "bg-coral text-white border-coral"
                        : "bg-white text-ocean/70 border-sand/50 hover:border-coral/50 hover:text-coral"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
