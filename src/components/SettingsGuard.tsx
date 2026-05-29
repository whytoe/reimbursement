"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { useSettings } from "@/hooks/useSettings";
import { Button } from "./Button";

interface SettingsGuardProps {
  children: ReactNode;
}

export function SettingsGuard({ children }: SettingsGuardProps) {
  const { startingPoints, isLoaded } = useSettings();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-label="Loading">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (!startingPoints) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <svg
          className="w-20 h-20 text-slate-300 mb-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <h2 className="text-2xl font-bold text-slate-700 mb-2">
          Set Up Your Starting Points
        </h2>
        <p className="text-lg text-slate-500 mb-8">
          Configure two starting locations before tracking your first trip.
        </p>
        <Link href="/settings">
          <Button>Go to Settings</Button>
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
