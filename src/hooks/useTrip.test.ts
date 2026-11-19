import { describe, it, expect } from "vitest";
import { tripReducer } from "./useTrip";
import type { Location, TripLeg, TripState } from "@/lib/types";

const home: Location = { address: "Home", coords: { lat: 0, lng: 0 } };
const client: Location = { address: "Client", coords: { lat: 1, lng: 1 } };

describe("tripReducer", () => {
  it("ROUND_TRIP_COMPUTED jumps to summary with both legs", () => {
    const start: TripState = {
      phase: "computing",
      selectedStart: null,
      legs: [],
      totalKm: 0,
    };
    const out: TripLeg = { from: home, to: client, distanceKm: 12.5 };
    const back: TripLeg = { from: client, to: home, distanceKm: 13 };

    const next = tripReducer(start, {
      type: "ROUND_TRIP_COMPUTED",
      payload: [out, back],
    });

    expect(next.phase).toBe("summary");
    expect(next.selectedStart).toBe(home);
    expect(next.legs).toEqual([out, back]);
    expect(next.totalKm).toBe(25.5);
  });

  it("START_NEXT_TRIP clears the trip and goes straight to destination entry", () => {
    const done: TripState = {
      phase: "summary",
      selectedStart: home,
      legs: [{ from: home, to: client, distanceKm: 5 }],
      totalKm: 5,
    };

    const next = tripReducer(done, { type: "START_NEXT_TRIP" });

    expect(next).toEqual({
      phase: "entering-destination",
      selectedStart: null,
      legs: [],
      totalKm: 0,
    });
  });
});
