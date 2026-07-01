import { NextRequest, NextResponse } from "next/server";
import { fetchMaps } from "@/lib/maps";

export async function POST(request: NextRequest) {
  const { query, userLocation, country } = await request.json();

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Google Maps API key not configured" },
      { status: 500 }
    );
  }

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/autocomplete/json"
  );
  url.searchParams.set("input", query.trim());
  url.searchParams.set("key", apiKey);

  // Restrict results to a single country when known (from the user's starting
  // point). Drops irrelevant other-country matches.
  if (country && typeof country === "string" && /^[A-Za-z]{2}$/.test(country)) {
    url.searchParams.set("components", `country:${country.toLowerCase()}`);
  }

  // Bias results toward the caller's anchor point (the user's starting point,
  // or their device location as a fallback).
  if (
    userLocation &&
    typeof userLocation.lat === "number" &&
    typeof userLocation.lng === "number" &&
    isFinite(userLocation.lat) &&
    isFinite(userLocation.lng)
  ) {
    url.searchParams.set(
      "location",
      `${userLocation.lat},${userLocation.lng}`
    );
    url.searchParams.set("radius", "50000"); // 50km bias radius
  }

  const upstream = await fetchMaps(url.toString(), "Places Autocomplete");
  if ("error" in upstream) return upstream.error;
  const data = await upstream.response.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error(
      "Places Autocomplete error:",
      data.status,
      data.error_message
    );
    return NextResponse.json({
      predictions: [],
      error: data.error_message || data.status,
    });
  }

  const predictions = (data.predictions ?? [])
    .slice(0, 3)
    .map(
      (p: { description: string; place_id: string }) => ({
        description: p.description,
        placeId: p.place_id,
      })
    );

  return NextResponse.json({ predictions });
}
