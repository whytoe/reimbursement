"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/hooks/useSettings";
import { TripLegCard } from "@/components/TripLegCard";
import { Button } from "@/components/Button";
import type { TripLeg } from "@/lib/types";

interface DbTripLeg {
  id: string;
  fromAddr: string;
  fromLat: number;
  fromLng: number;
  toAddr: string;
  toLat: number;
  toLng: number;
  distanceKm: number;
}

interface DbTrip {
  id: string;
  date: string;
  totalKm: number;
  purpose: string;
  notes: string;
  returnedToStart: boolean;
  startingPoint: { address: string };
  legs: DbTripLeg[];
}

function dbLegToTripLeg(leg: DbTripLeg): TripLeg {
  return {
    from: { address: leg.fromAddr, coords: { lat: leg.fromLat, lng: leg.fromLng } },
    to: { address: leg.toAddr, coords: { lat: leg.toLat, lng: leg.toLng } },
    distanceKm: leg.distanceKm,
  };
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatShortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

export default function HistoryPage() {
  const router = useRouter();
  const { mileageRate } = useSettings();
  const [trips, setTrips] = useState<DbTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showExport, setShowExport] = useState(false);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");

  const loadTrips = useCallback(async () => {
    try {
      const res = await fetch("/api/trips");
      if (res.ok) {
        setTrips(await res.json());
      }
    } catch {
      // Failed to load
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const filteredTrips = useMemo(() => {
    if (!search.trim()) return trips;
    const q = search.toLowerCase();
    return trips.filter((trip) => {
      const dateStr = formatDate(trip.date).toLowerCase();
      const purpose = trip.purpose.toLowerCase();
      const addresses = trip.legs
        .map((l) => `${l.fromAddr} ${l.toAddr}`)
        .join(" ")
        .toLowerCase();
      return dateStr.includes(q) || purpose.includes(q) || addresses.includes(q);
    });
  }, [trips, search]);

  const selectedTrip = selectedId ? trips.find((t) => t.id === selectedId) : null;

  const handleDelete = async (id: string) => {
    await fetch(`/api/trips/${id}`, { method: "DELETE" });
    setTrips((prev) => prev.filter((t) => t.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (exportFrom) params.set("from", exportFrom);
    if (exportTo) params.set("to", exportTo);
    const res = await fetch(`/api/trips/export?${params}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trips-${exportFrom || "all"}-${exportTo || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-label="Loading trips">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        <span className="sr-only">Loading trips...</span>
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <svg
          className="w-16 h-16 text-slate-300 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-2xl font-bold text-slate-700 mb-2">No Trips Yet</h2>
        <p className="text-lg text-slate-500">Completed trips will appear here.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 max-w-lg mx-auto">
      {/* Header with export button */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Trips</h1>
          <p className="text-sm text-slate-500">
            {trips.length} trip{trips.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowExport(!showExport)}
          className="min-w-[56px] min-h-[56px] flex items-center justify-center rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          aria-label="Export trips"
          aria-expanded={showExport}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
      </div>

      {/* Export panel (collapsible) */}
      {showExport && (
        <div className="mb-4 p-4 bg-slate-50 rounded-2xl space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Export to CSV</h3>
          <div className="flex gap-2">
            <div className="flex-1">
              <label htmlFor="export-from" className="block text-xs font-medium text-slate-600 mb-1">From</label>
              <input
                id="export-from"
                type="date"
                value={exportFrom}
                onChange={(e) => setExportFrom(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                style={{ fontSize: "16px" }}
              />
            </div>
            <div className="flex-1">
              <label htmlFor="export-to" className="block text-xs font-medium text-slate-600 mb-1">To</label>
              <input
                id="export-to"
                type="date"
                value={exportTo}
                onChange={(e) => setExportTo(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                style={{ fontSize: "16px" }}
              />
            </div>
          </div>
          <Button variant="secondary" onClick={handleExport}>
            Download CSV
          </Button>
        </div>
      )}

      {/* Search bar */}
      <div className="mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by date, purpose, or address..."
          className="w-full min-h-[48px] px-4 py-3 text-base rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-colors"
          style={{ fontSize: "16px" }}
          aria-label="Search trips"
        />
      </div>

      {/* Trip list */}
      <div className="space-y-1">
        {filteredTrips.length === 0 && (
          <p className="text-center text-slate-500 py-8">No trips match your search.</p>
        )}

        {filteredTrips.map((trip) => {
          const isSelected = selectedId === trip.id;
          const firstStop = trip.legs[0]?.toAddr ?? "Unknown";
          const lastStop = trip.legs[trip.legs.length - 1]?.toAddr ?? "Unknown";
          const route = trip.legs.length === 1 ? firstStop : `${firstStop} → ${lastStop}`;
          const reimbursement = mileageRate > 0 ? trip.totalKm * mileageRate : null;

          return (
            <div key={trip.id}>
              {/* List row */}
              <button
                onClick={() => setSelectedId(isSelected ? null : trip.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  isSelected ? "bg-emerald-50 border border-emerald-200" : "hover:bg-slate-50"
                }`}
                aria-expanded={isSelected}
              >
                {/* Date badge */}
                <div className="flex-shrink-0 w-12 text-center">
                  <div className="text-xs text-slate-500">{new Date(trip.date).toLocaleDateString(undefined, { month: "short" })}</div>
                  <div className="text-lg font-bold text-slate-700">{new Date(trip.date).getDate()}</div>
                </div>

                {/* Trip info */}
                <div className="flex-1 min-w-0">
                  {trip.purpose ? (
                    <div className="text-sm font-semibold text-slate-800 truncate">{trip.purpose}</div>
                  ) : (
                    <div className="text-sm text-slate-600 truncate">{route}</div>
                  )}
                  {trip.purpose && (
                    <div className="text-xs text-slate-500 truncate">{route}</div>
                  )}
                </div>

                {/* Distance */}
                <div className="flex-shrink-0 text-right">
                  <div className="text-base font-bold text-emerald-600">{trip.totalKm.toFixed(1)} km</div>
                  {reimbursement !== null && (
                    <div className="text-xs text-slate-500">{reimbursement.toFixed(2)}</div>
                  )}
                </div>
              </button>

              {/* Expanded detail */}
              {isSelected && (
                <div className="ml-3 mr-3 mb-2 px-4 py-3 bg-white border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-500">{formatDate(trip.date)}</div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/history/${trip.id}/edit`); }}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        aria-label="Edit trip"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(trip.id); }}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        aria-label="Delete trip"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {trip.notes && (
                    <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                      {trip.notes}
                    </div>
                  )}

                  <div className="text-xs text-slate-500">
                    From: <span className="font-medium text-slate-700">{trip.startingPoint?.address ?? "Unknown"}</span>
                    {trip.returnedToStart && <span className="ml-2 text-emerald-600">(round trip)</span>}
                  </div>

                  <div className="space-y-2">
                    {trip.legs.map((leg, idx) => (
                      <TripLegCard key={leg.id} leg={dbLegToTripLeg(leg)} index={idx} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
