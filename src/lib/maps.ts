import { NextResponse } from "next/server";

/**
 * Wrap an upstream Google Maps API fetch so that network/egress failures
 * (e.g. ECONNREFUSED when the pod cannot reach the public internet) return a
 * clean 502 with a legible message instead of bubbling up as an unhandled 500
 * that the client surfaces as a generic "Search failed".
 *
 * Returns `{ response }` on a completed request, or `{ error }` — a ready-to-
 * return NextResponse — when the request never completed.
 */
export async function fetchMaps(
  url: string,
  label: string
): Promise<{ response: Response } | { error: NextResponse }> {
  try {
    return { response: await fetch(url) };
  } catch (err) {
    const code =
      (err as { cause?: { code?: string } })?.cause?.code ?? "unknown";
    console.error(`${label}: upstream unreachable (${code})`, err);
    return {
      error: NextResponse.json(
        { error: "Mapping service is temporarily unreachable. Please try again." },
        { status: 502 }
      ),
    };
  }
}
