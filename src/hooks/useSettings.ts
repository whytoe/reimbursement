"use client";

import { useState, useEffect, useCallback } from "react";
import type { Location } from "@/lib/types";

export function useSettings() {
  const [startingPoints, setPoints] = useState<[Location, Location] | null>(null);
  const [mileageRate, setRate] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) throw new Error("Failed to load settings");
        const data = await res.json();

        if (cancelled) return;

        if (data.startingPointA?.address && data.startingPointB?.address) {
          setPoints([data.startingPointA, data.startingPointB]);
        }
        setRate(data.mileageRate ?? 0);
      } catch {
        // Settings not configured yet
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const saveStartingPoints = useCallback(async (points: [Location, Location]) => {
    setPoints(points);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startingPointA: points[0],
        startingPointB: points[1],
      }),
    });
  }, []);

  const saveMileageRate = useCallback(async (rate: number) => {
    setRate(rate);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mileageRate: rate }),
    });
  }, []);

  return { startingPoints, mileageRate, saveStartingPoints, saveMileageRate, isLoaded };
}
