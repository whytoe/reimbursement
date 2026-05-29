"use client";

import { AddressSearch } from "./AddressSearch";
import type { Location } from "@/lib/types";

interface StartingPointFormProps {
  label: string;
  value: Location | null;
  onChange: (location: Location) => void;
}

export function StartingPointForm({
  label,
  value,
  onChange,
}: StartingPointFormProps) {
  return (
    <div className="space-y-3">
      <label className="block text-lg font-semibold text-slate-700">
        {label}
      </label>
      {value && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 rounded-xl border border-emerald-200">
          <svg
            className="w-5 h-5 text-emerald-600 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="text-slate-700">{value.address}</span>
        </div>
      )}
      <AddressSearch
        onSelect={onChange}
        placeholder={`Search for ${label.toLowerCase()}...`}
      />
    </div>
  );
}
