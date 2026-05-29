"use client";

import { useReducer, useCallback } from "react";
import type { Location, TripState, TripAction, TripLeg } from "@/lib/types";
import { getDistance } from "@/lib/api";
import { haversineDistance } from "@/lib/geo";

const initialState: TripState = {
  phase: "idle",
  selectedStart: null,
  legs: [],
  totalKm: 0,
};

function tripReducer(state: TripState, action: TripAction): TripState {
  switch (action.type) {
    case "START_TRIP":
      return { ...state, phase: "entering-destination" };
    case "SET_COMPUTING":
      return { ...state, phase: "computing" };
    case "LEG_COMPUTED":
      return {
        ...state,
        phase: "leg-complete",
        selectedStart: state.selectedStart ?? action.payload.from,
        legs: [...state.legs, action.payload],
        totalKm: state.totalKm + action.payload.distanceKm,
      };
    case "ADD_ANOTHER_STOP":
      return { ...state, phase: "entering-destination" };
    case "FINISH_TRIP":
      return { ...state, phase: "finishing" };
    case "END_HERE":
      return { ...state, phase: "summary" };
    case "RETURN_LEG_COMPUTED":
      return {
        ...state,
        phase: "summary",
        legs: [...state.legs, action.payload],
        totalKm: state.totalKm + action.payload.distanceKm,
      };
    case "COMPUTE_ERROR":
      return { ...state, phase: action.fallbackPhase };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export function useTrip(startingPoints: [Location, Location] | null) {
  const [state, dispatch] = useReducer(tripReducer, initialState);

  const startTrip = useCallback(() => {
    dispatch({ type: "START_TRIP" });
  }, []);

  const addDestination = useCallback(
    async (destination: Location) => {
      dispatch({ type: "SET_COMPUTING" });

      try {
        let from: Location;
        if (state.legs.length === 0) {
          if (!startingPoints) throw new Error("Starting points not configured");
          const d0 = haversineDistance(startingPoints[0].coords, destination.coords);
          const d1 = haversineDistance(startingPoints[1].coords, destination.coords);
          from = d0 <= d1 ? startingPoints[0] : startingPoints[1];
        } else {
          from = state.legs[state.legs.length - 1].to;
        }

        const { distanceKm } = await getDistance(from.coords, destination.coords);
        const leg: TripLeg = { from, to: destination, distanceKm };
        dispatch({ type: "LEG_COMPUTED", payload: leg });
      } catch (err) {
        dispatch({ type: "COMPUTE_ERROR", fallbackPhase: "entering-destination" });
        throw err;
      }
    },
    [state.legs, startingPoints]
  );

  const addAnotherStop = useCallback(() => {
    dispatch({ type: "ADD_ANOTHER_STOP" });
  }, []);

  const finishTrip = useCallback(() => {
    dispatch({ type: "FINISH_TRIP" });
  }, []);

  const endHere = useCallback(() => {
    dispatch({ type: "END_HERE" });
  }, []);

  const returnToStart = useCallback(async () => {
    dispatch({ type: "SET_COMPUTING" });

    try {
      const lastStop = state.legs[state.legs.length - 1].to;
      const start = state.selectedStart!;

      const { distanceKm } = await getDistance(lastStop.coords, start.coords);
      const leg: TripLeg = { from: lastStop, to: start, distanceKm };
      dispatch({ type: "RETURN_LEG_COMPUTED", payload: leg });
    } catch (err) {
      dispatch({ type: "COMPUTE_ERROR", fallbackPhase: "finishing" });
      throw err;
    }
  }, [state.legs, state.selectedStart]);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return {
    state,
    startTrip,
    addDestination,
    addAnotherStop,
    finishTrip,
    endHere,
    returnToStart,
    reset,
  };
}
