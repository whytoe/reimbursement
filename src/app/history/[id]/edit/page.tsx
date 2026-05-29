"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { AddressSearch } from "@/components/AddressSearch";
import { Button } from "@/components/Button";
import { getDistance } from "@/lib/api";
import type { Location, TripLeg } from "@/lib/types";

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
  startingPoint: { address: string; coords: { lat: number; lng: number } };
  legs: DbTripLeg[];
}

function dbLegToTripLeg(leg: DbTripLeg): TripLeg {
  return {
    from: { address: leg.fromAddr, coords: { lat: leg.fromLat, lng: leg.fromLng } },
    to: { address: leg.toAddr, coords: { lat: leg.toLat, lng: leg.toLng } },
    distanceKm: leg.distanceKm,
  };
}

export default function EditTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [trip, setTrip] = useState<DbTrip | null>(null);
  const [legs, setLegs] = useState<TripLeg[]>([]);
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingLegIdx, setEditingLegIdx] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<"from" | "to" | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/trips/${id}`);
        if (!res.ok) throw new Error("Not found");
        const data: DbTrip = await res.json();
        setTrip(data);
        setLegs(data.legs.map(dbLegToTripLeg));
        setPurpose(data.purpose);
        setNotes(data.notes);
        setDate(new Date(data.date).toISOString().split("T")[0]);
      } catch {
        setError("Trip not found");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id]);

  const handleAddressChange = async (legIdx: number, field: "from" | "to", location: Location) => {
    setRecalculating(true);
    setEditingLegIdx(null);
    setEditingField(null);

    try {
      const updatedLegs = [...legs];
      const leg = { ...updatedLegs[legIdx] };

      if (field === "from") {
        leg.from = location;
      } else {
        leg.to = location;
      }

      // Recalculate distance for this leg
      const { distanceKm } = await getDistance(leg.from.coords, leg.to.coords);
      leg.distanceKm = distanceKm;
      updatedLegs[legIdx] = leg;

      setLegs(updatedLegs);
    } catch {
      setError("Failed to recalculate distance");
    } finally {
      setRecalculating(false);
    }
  };

  const totalKm = legs.reduce((sum, leg) => sum + leg.distanceKm, 0);

  const handleSave = async () => {
    if (!trip) return;
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/trips/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date(date).toISOString(),
          totalKm,
          purpose,
          notes,
          legs,
        }),
      });

      if (!res.ok) throw new Error("Save failed");
      router.push("/history");
    } catch {
      setError("Failed to save changes");
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-label="Loading trip">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        <span className="sr-only">Loading trip...</span>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <h2 className="text-2xl font-bold text-slate-700">Trip Not Found</h2>
        <Button onClick={() => router.push("/history")} variant="outline" className="mt-4">
          Back to History
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Edit Trip</h1>
        <button
          onClick={() => router.push("/history")}
          className="text-slate-500 hover:text-slate-700 min-w-[56px] min-h-[56px] flex items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          Cancel
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="date" className="block text-lg font-semibold text-slate-700 mb-1">
            Date
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full min-h-[56px] px-4 py-4 text-lg rounded-2xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-colors"
            style={{ fontSize: "16px" }}
          />
        </div>

        <div>
          <label htmlFor="edit-purpose" className="block text-lg font-semibold text-slate-700 mb-1">
            Purpose
          </label>
          <input
            id="edit-purpose"
            type="text"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="e.g. Client meeting"
            className="w-full min-h-[56px] px-4 py-4 text-lg rounded-2xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-colors"
            style={{ fontSize: "16px" }}
          />
        </div>

        <div>
          <label htmlFor="edit-notes" className="block text-lg font-semibold text-slate-700 mb-1">
            Notes
          </label>
          <textarea
            id="edit-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-4 py-4 text-lg rounded-2xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-colors resize-none"
            style={{ fontSize: "16px" }}
          />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-700">
          Trip Legs — {totalKm.toFixed(1)} km total
        </h3>

        {recalculating && (
          <div className="text-center text-slate-500">
            <div className="inline-block w-5 h-5 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mr-2 align-middle" />
            Recalculating distance...
          </div>
        )}

        {legs.map((leg, idx) => (
          <div key={idx} className="p-4 bg-slate-50 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-emerald-700">Leg {idx + 1}</span>
              <span className="text-lg font-bold text-emerald-600">{leg.distanceKm.toFixed(1)} km</span>
            </div>

            {/* From address */}
            <div>
              <span className="text-xs uppercase text-slate-500 font-medium">From</span>
              {editingLegIdx === idx && editingField === "from" ? (
                <AddressSearch
                  onSelect={(loc) => handleAddressChange(idx, "from", loc)}
                  placeholder="Search new from address..."
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => { setEditingLegIdx(idx); setEditingField("from"); }}
                  className="w-full text-left text-sm text-slate-600 hover:text-emerald-600 p-2 rounded-lg hover:bg-emerald-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px]"
                >
                  {leg.from.address}
                  <span className="text-emerald-500 ml-2 text-xs">edit</span>
                </button>
              )}
            </div>

            {/* To address */}
            <div>
              <span className="text-xs uppercase text-slate-500 font-medium">To</span>
              {editingLegIdx === idx && editingField === "to" ? (
                <AddressSearch
                  onSelect={(loc) => handleAddressChange(idx, "to", loc)}
                  placeholder="Search new to address..."
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => { setEditingLegIdx(idx); setEditingField("to"); }}
                  className="w-full text-left text-sm text-slate-600 hover:text-emerald-600 p-2 rounded-lg hover:bg-emerald-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px]"
                >
                  {leg.to.address}
                  <span className="text-emerald-500 ml-2 text-xs">edit</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="text-center text-red-500" role="alert">{error}</div>
      )}

      <Button onClick={handleSave} disabled={isSaving || recalculating}>
        {isSaving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}
