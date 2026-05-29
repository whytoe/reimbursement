"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { searchAddresses, resolvePlace } from "@/lib/api";
import type { AutocompletePrediction } from "@/lib/api";
import type { Location } from "@/lib/types";

interface AddressSearchProps {
  onSelect: (location: Location) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function AddressSearch({
  onSelect,
  placeholder = "Type an address...",
  autoFocus = false,
}: AddressSearchProps) {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<AutocompletePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectingRef = useRef(false);
  const userLocationRef = useRef<{ lat: number; lng: number } | undefined>(undefined);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Get user's current location once for search biasing
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          userLocationRef.current = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
        },
        () => { /* Location denied or unavailable — search works without bias */ }
      );
    }
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 3) {
      setPredictions([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const res = await searchAddresses(q, userLocationRef.current);
      setPredictions(res);
    } catch {
      setError("Search failed. Please try again.");
      setPredictions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Auto-search as user types (debounced)
  useEffect(() => {
    if (query.trim().length < 3) {
      setPredictions([]);
      return;
    }

    const timer = setTimeout(() => {
      doSearch(query);
    }, 400);

    return () => clearTimeout(timer);
  }, [query, doSearch]);

  const handleSelect = useCallback(
    async (prediction: AutocompletePrediction) => {
      if (selectingRef.current) return;
      selectingRef.current = true;
      setQuery("");
      setPredictions([]);
      setIsResolving(true);
      setError(null);

      try {
        const result = await resolvePlace(prediction.placeId);
        onSelect({
          address: result.formatted_address,
          coords: { lat: result.lat, lng: result.lng },
        });
      } catch {
        setError("Could not resolve address. Please try again.");
      } finally {
        setIsResolving(false);
        setTimeout(() => {
          selectingRef.current = false;
        }, 300);
      }
    },
    [onSelect]
  );

  return (
    <div className="w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              doSearch(query);
            }
          }}
          placeholder={placeholder}
          className="w-full min-h-[56px] pl-5 pr-5 py-4 text-lg rounded-2xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-colors"
          style={{ fontSize: "16px" }}
          aria-label="Search address"
        />
      </div>

      {(isSearching || isResolving) && (
        <div className="mt-3 text-center text-slate-500" aria-live="polite">
          <div className="inline-block w-5 h-5 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mr-2 align-middle" />
          {isResolving ? "Loading address..." : "Searching..."}
        </div>
      )}

      {error && (
        <div className="mt-3 text-center text-red-500" aria-live="polite">
          {error}
        </div>
      )}

      {predictions.length > 0 && (
        <ul className="mt-3 space-y-2" role="listbox" aria-label="Search results">
          {predictions.map((prediction, idx) => (
            <li
              key={`${prediction.placeId}-${idx}`}
              role="option"
              aria-selected={false}
              tabIndex={0}
              onClick={() => handleSelect(prediction)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelect(prediction);
                }
              }}
              className="w-full min-h-[56px] px-4 py-3 text-left text-lg rounded-xl border-2 border-slate-100 hover:border-emerald-300 hover:bg-emerald-50 active:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-colors cursor-pointer"
            >
                <svg
                  className="inline-block w-5 h-5 mr-2 text-emerald-500 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {prediction.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
