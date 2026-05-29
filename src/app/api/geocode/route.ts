import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { query, placeId } = await request.json();

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Google Maps API key not configured" },
      { status: 500 }
    );
  }

  // Resolve place_id to coordinates via Place Details
  if (placeId && typeof placeId === "string") {
    const url = new URL(
      "https://maps.googleapis.com/maps/api/place/details/json"
    );
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("fields", "formatted_address,geometry");
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== "OK" || !data.result) {
      console.error("Place Details error:", data.status, data.error_message);
      return NextResponse.json(
        { results: [], error: data.error_message || data.status }
      );
    }

    const r = data.result;
    return NextResponse.json({
      results: [
        {
          formatted_address: r.formatted_address,
          lat: r.geometry.location.lat,
          lng: r.geometry.location.lng,
        },
      ],
    });
  }

  // Fallback: standard geocoding by address text
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json({ error: "Query or placeId is required" }, { status: 400 });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query.trim());
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.status !== "OK") {
    console.error("Geocoding API error:", data.status, data.error_message);
    return NextResponse.json({ results: [], error: data.error_message || data.status });
  }

  const results = data.results.slice(0, 3).map(
    (r: {
      formatted_address: string;
      geometry: { location: { lat: number; lng: number } };
    }) => ({
      formatted_address: r.formatted_address,
      lat: r.geometry.location.lat,
      lng: r.geometry.location.lng,
    })
  );

  return NextResponse.json({ results });
}
