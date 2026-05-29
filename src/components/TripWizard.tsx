"use client";

import { useState } from "react";
import { useSettings } from "@/hooks/useSettings";
import { useTrip } from "@/hooks/useTrip";
import { AddressSearch } from "./AddressSearch";
import { TripLegCard } from "./TripLegCard";
import { TripSummary } from "./TripSummary";
import { Button } from "./Button";
import type { Location } from "@/lib/types";

export function TripWizard() {
  const { startingPoints, mileageRate } = useSettings();
  const {
    state,
    startTrip,
    addDestination,
    addAnotherStop,
    finishTrip,
    endHere,
    returnToStart,
    reset,
  } = useTrip(startingPoints);

  const [error, setError] = useState<string | null>(null);

  const handleAddDestination = async (location: Location) => {
    setError(null);
    try {
      await addDestination(location);
    } catch {
      setError("Failed to calculate distance. Please try again.");
    }
  };

  const handleReturnToStart = async () => {
    setError(null);
    try {
      await returnToStart();
    } catch {
      setError("Failed to calculate return distance. Please try again.");
    }
  };

  // Idle: show start button
  if (state.phase === "idle") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-full max-w-sm space-y-8">
          <div>
            <svg
              className="w-16 h-16 text-emerald-500 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              Ready to Go?
            </h1>
            <p className="text-lg text-slate-500">
              Start tracking your trip distance
            </p>
          </div>
          <Button onClick={startTrip}>Start New Trip</Button>
        </div>
      </div>
    );
  }

  // Entering destination
  if (state.phase === "entering-destination") {
    const isFirstLeg = state.legs.length === 0;
    return (
      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {isFirstLeg ? "Where are you going?" : "Next stop?"}
          </h2>
          <p className="text-slate-500 mt-1">
            {isFirstLeg
              ? "Enter your first destination"
              : "Add your next destination"}
          </p>
        </div>

        {state.legs.length > 0 && (
          <div className="space-y-2">
            {state.legs.map((leg, idx) => (
              <TripLegCard key={idx} leg={leg} index={idx} />
            ))}
            <div className="text-right text-sm text-slate-500">
              Running total:{" "}
              <span className="font-semibold text-emerald-600">
                {state.totalKm.toFixed(1)} km
              </span>
            </div>
          </div>
        )}

        <AddressSearch
          onSelect={handleAddDestination}
          placeholder="Search for a destination..."
          autoFocus
        />

        {error && (
          <div className="text-center text-red-500" aria-live="polite">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Computing distance
  if (state.phase === "computing") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4" />
        <p className="text-lg text-slate-500" aria-live="polite">
          Calculating distance...
        </p>
      </div>
    );
  }

  // Leg complete: ask to continue or finish
  if (state.phase === "leg-complete") {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <div className="text-center">
          <div className="text-sm uppercase tracking-wide text-slate-500 mb-1">
            Running Total
          </div>
          <div className="text-4xl font-bold text-emerald-600">
            {state.totalKm.toFixed(1)} km
          </div>
        </div>

        <div className="space-y-2">
          {state.legs.map((leg, idx) => (
            <TripLegCard key={idx} leg={leg} index={idx} />
          ))}
        </div>

        <div className="space-y-3">
          <Button onClick={addAnotherStop}>
            <span className="flex items-center justify-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Another Stop
            </span>
          </Button>
          <Button onClick={finishTrip} variant="outline">
            End Trip
          </Button>
        </div>

        {error && (
          <div className="text-center text-red-500" aria-live="polite">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Finishing: choose end here or return
  if (state.phase === "finishing") {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800">Finish Trip</h2>
          <p className="text-lg text-slate-500 mt-1">
            How would you like to end?
          </p>
        </div>

        <div className="space-y-3">
          <Button onClick={handleReturnToStart}>
            <span className="flex items-center justify-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Return to Starting Point
            </span>
          </Button>
          <Button onClick={endHere} variant="outline">
            End Here
          </Button>
        </div>

        {error && (
          <div className="text-center text-red-500" aria-live="polite">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Summary — user adds purpose/notes and saves
  if (state.phase === "summary") {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">
          Trip Complete
        </h2>
        <TripSummary
          legs={state.legs}
          totalKm={state.totalKm}
          mileageRate={mileageRate}
          selectedStart={state.selectedStart}
          onReset={reset}
        />
      </div>
    );
  }

  return null;
}
