"use client";

import { useState } from "react";
import type { TripLeg, Location } from "@/lib/types";
import { TripLegCard } from "./TripLegCard";
import { Button } from "./Button";

interface TripSummaryProps {
  legs: TripLeg[];
  totalKm: number;
  mileageRate: number;
  selectedStart: Location | null;
  onReset: () => void;
}

export function TripSummary({
  legs,
  totalKm,
  mileageRate,
  selectedStart,
  onReset,
}: TripSummaryProps) {
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reimbursement = mileageRate > 0 ? totalKm * mileageRate : null;

  const lastLeg = legs[legs.length - 1];
  const returnedToStart =
    selectedStart !== null &&
    lastLeg?.to.address === selectedStart.address;

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalKm,
          purpose,
          notes,
          returnedToStart,
          startingPoint: selectedStart,
          legs,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
    } catch {
      setError("Failed to save trip. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center py-6">
        <div className="text-sm uppercase tracking-wide text-slate-500 mb-1">
          Total Distance
        </div>
        <div className="text-5xl font-bold text-emerald-600">
          {totalKm.toFixed(1)}
        </div>
        <div className="text-xl text-slate-500">kilometers</div>
        {reimbursement !== null && (
          <div className="mt-2 text-2xl font-semibold text-slate-700">
            {reimbursement.toFixed(2)} reimbursement
          </div>
        )}
      </div>

      {!saved && (
        <div className="space-y-4">
          <div>
            <label
              htmlFor="purpose"
              className="block text-lg font-semibold text-slate-700 mb-1"
            >
              Trip Purpose
            </label>
            <input
              id="purpose"
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Client meeting, Site visit..."
              className="w-full min-h-[56px] px-4 py-4 text-lg rounded-2xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-colors"
              style={{ fontSize: "16px" }}
            />
          </div>
          <div>
            <label
              htmlFor="notes"
              className="block text-lg font-semibold text-slate-700 mb-1"
            >
              Notes (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details..."
              rows={3}
              className="w-full px-4 py-4 text-lg rounded-2xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-colors resize-none"
              style={{ fontSize: "16px" }}
            />
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-700">Trip Legs</h3>
        {legs.map((leg, idx) => (
          <TripLegCard key={idx} leg={leg} index={idx} />
        ))}
      </div>

      {error && (
        <div className="text-center text-red-500" role="alert">
          {error}
        </div>
      )}

      {!saved ? (
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Trip"}
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="text-center text-emerald-600 font-semibold text-lg">
            Trip saved successfully
          </div>
          <Button onClick={onReset} variant="secondary">
            Start New Trip
          </Button>
        </div>
      )}
    </div>
  );
}
