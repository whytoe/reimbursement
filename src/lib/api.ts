import type { GeocodeResult, LatLng } from "./types";

export interface AutocompletePrediction {
  description: string;
  placeId: string;
}

export async function searchAddresses(
  query: string,
  userLocation?: { lat: number; lng: number }
): Promise<AutocompletePrediction[]> {
  const res = await fetch("/api/autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, userLocation }),
  });

  if (!res.ok) {
    throw new Error("Address search failed");
  }

  const data = await res.json();
  return data.predictions;
}

export async function resolvePlace(
  placeId: string
): Promise<GeocodeResult> {
  const res = await fetch("/api/geocode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ placeId }),
  });

  if (!res.ok) {
    throw new Error("Place resolution failed");
  }

  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    throw new Error("No results for place");
  }
  return data.results[0];
}

export async function geocodeAddress(
  query: string
): Promise<GeocodeResult[]> {
  const res = await fetch("/api/geocode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    throw new Error("Geocoding failed");
  }

  const data = await res.json();
  return data.results;
}

export async function getDistance(
  origin: LatLng,
  destination: LatLng
): Promise<{ distanceKm: number; durationMinutes: number }> {
  const res = await fetch("/api/distance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ origin, destination }),
  });

  if (!res.ok) {
    throw new Error("Distance calculation failed");
  }

  return res.json();
}
