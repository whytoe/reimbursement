export interface LatLng {
  lat: number;
  lng: number;
}

export interface Location {
  address: string;
  coords: LatLng;
  /** ISO 3166-1 alpha-2 country code (e.g. "US"), when known. Used to
   *  restrict address autocomplete to the same country. */
  country?: string;
}

export interface TripLeg {
  from: Location;
  to: Location;
  distanceKm: number;
}

export type TripPhase =
  | "idle"
  | "entering-destination"
  | "computing"
  | "leg-complete"
  | "finishing"
  | "summary";

export interface TripState {
  phase: TripPhase;
  selectedStart: Location | null;
  legs: TripLeg[];
  totalKm: number;
}

export type TripAction =
  | { type: "START_TRIP" }
  | { type: "SET_COMPUTING" }
  | { type: "LEG_COMPUTED"; payload: TripLeg }
  | { type: "ADD_ANOTHER_STOP" }
  | { type: "FINISH_TRIP" }
  | { type: "END_HERE" }
  | { type: "RETURN_LEG_COMPUTED"; payload: TripLeg }
  | { type: "COMPUTE_ERROR"; fallbackPhase: TripPhase }
  | { type: "RESET" };

export interface CompletedTrip {
  id: string;
  date: string;
  legs: TripLeg[];
  totalKm: number;
  startingPoint: Location;
  returnedToStart: boolean;
  purpose: string;
  notes: string;
}

export interface GeocodeResult {
  formatted_address: string;
  lat: number;
  lng: number;
  /** ISO 3166-1 alpha-2 country code from the resolved place, when present. */
  country?: string;
}
