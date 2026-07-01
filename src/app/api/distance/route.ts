import { NextRequest, NextResponse } from "next/server";
import { fetchMaps } from "@/lib/maps";

export async function POST(request: NextRequest) {
  const { origin, destination } = await request.json();

  if (
    !origin?.lat ||
    !origin?.lng ||
    !destination?.lat ||
    !destination?.lng
  ) {
    return NextResponse.json(
      { error: "Origin and destination coordinates are required" },
      { status: 400 }
    );
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Google Maps API key not configured" },
      { status: 500 }
    );
  }

  const url = new URL(
    "https://maps.googleapis.com/maps/api/distancematrix/json"
  );
  url.searchParams.set("origins", `${origin.lat},${origin.lng}`);
  url.searchParams.set("destinations", `${destination.lat},${destination.lng}`);
  url.searchParams.set("units", "metric");
  url.searchParams.set("key", apiKey);

  const upstream = await fetchMaps(url.toString(), "Distance Matrix");
  if ("error" in upstream) return upstream.error;
  const data = await upstream.response.json();

  if (
    data.status !== "OK" ||
    !data.rows?.[0]?.elements?.[0] ||
    data.rows[0].elements[0].status !== "OK"
  ) {
    return NextResponse.json(
      { error: "Could not calculate distance" },
      { status: 422 }
    );
  }

  const element = data.rows[0].elements[0];
  const distanceKm = element.distance.value / 1000;
  const durationMinutes = Math.round(element.duration.value / 60);

  return NextResponse.json({ distanceKm, durationMinutes });
}
