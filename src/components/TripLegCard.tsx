"use client";

import type { TripLeg } from "@/lib/types";

interface TripLegCardProps {
  leg: TripLeg;
  index: number;
}

export function TripLegCard({ leg, index }: TripLegCardProps) {
  return (
    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-600 truncate" title={leg.from.address}>{leg.from.address}</div>
        <svg
          className="w-4 h-4 text-slate-400 my-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
        <div className="text-sm text-slate-600 truncate" title={leg.to.address}>{leg.to.address}</div>
      </div>
      <div className="flex-shrink-0 text-right">
        <span className="text-lg font-bold text-emerald-600">
          {leg.distanceKm.toFixed(1)}
        </span>
        <span className="text-sm text-slate-500 ml-1">km</span>
      </div>
    </div>
  );
}
