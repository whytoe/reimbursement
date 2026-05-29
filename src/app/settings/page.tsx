"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/hooks/useSettings";
import { StartingPointForm } from "@/components/StartingPointForm";
import { Button } from "@/components/Button";
import type { Location } from "@/lib/types";

export default function SettingsPage() {
  const router = useRouter();
  const { startingPoints, mileageRate, saveStartingPoints, saveMileageRate, isLoaded } = useSettings();

  const [pointA, setPointA] = useState<Location | null>(null);
  const [pointB, setPointB] = useState<Location | null>(null);
  const [rate, setRate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      if (startingPoints) {
        setPointA(startingPoints[0]);
        setPointB(startingPoints[1]);
      }
      setRate(mileageRate > 0 ? mileageRate.toString() : "");
    }
  }, [isLoaded, startingPoints, mileageRate]);

  const canSave = pointA !== null && pointB !== null;

  const handleSave = async () => {
    if (!pointA || !pointB) return;
    setIsSaving(true);

    await saveStartingPoints([pointA, pointB]);

    const parsedRate = parseFloat(rate);
    if (!isNaN(parsedRate) && parsedRate >= 0) {
      await saveMileageRate(parsedRate);
    }

    setIsSaving(false);
    router.push("/");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match");
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError("New password must differ from current password");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        const data: { error?: string } = await res.json().catch(() => ({}));
        setPasswordError(data.error ?? "Could not update password");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(true);
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-label="Loading settings">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        <span className="sr-only">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Settings</h1>
        <p className="text-lg text-slate-500 mt-1">
          Configure your starting locations and mileage rate
        </p>
      </div>

      <StartingPointForm
        label="Starting Point A"
        value={pointA}
        onChange={setPointA}
      />

      <StartingPointForm
        label="Starting Point B"
        value={pointB}
        onChange={setPointB}
      />

      <div className="space-y-3">
        <label
          htmlFor="mileage-rate"
          className="block text-lg font-semibold text-slate-700"
        >
          Mileage Rate (per km)
        </label>
        <p className="text-sm text-slate-500">
          Used to calculate reimbursement amounts on your trips
        </p>
        <input
          id="mileage-rate"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          placeholder="e.g. 0.21"
          className="w-full min-h-[56px] px-4 py-4 text-lg rounded-2xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-colors"
          style={{ fontSize: "16px" }}
        />
      </div>

      <Button onClick={handleSave} disabled={!canSave || isSaving}>
        {isSaving
          ? "Saving..."
          : canSave
            ? "Save Settings"
            : "Set both starting points to continue"}
      </Button>

      <section className="space-y-4 border-t border-slate-200 pt-8">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Change password</h2>
          <p className="text-sm text-slate-500 mt-1">Minimum 8 characters.</p>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label htmlFor="current-password" className="block text-lg font-medium text-slate-700 mb-1">
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full min-h-[56px] px-4 py-4 text-lg rounded-2xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-colors"
              style={{ fontSize: "16px" }}
            />
          </div>
          <div>
            <label htmlFor="new-password" className="block text-lg font-medium text-slate-700 mb-1">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full min-h-[56px] px-4 py-4 text-lg rounded-2xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-colors"
              style={{ fontSize: "16px" }}
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-lg font-medium text-slate-700 mb-1">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full min-h-[56px] px-4 py-4 text-lg rounded-2xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-colors"
              style={{ fontSize: "16px" }}
            />
          </div>

          {passwordError && (
            <div className="text-red-600 text-lg" role="alert">{passwordError}</div>
          )}
          {passwordSuccess && (
            <div className="text-emerald-600 text-lg" role="status">Password updated.</div>
          )}

          <Button type="submit" disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}>
            {isChangingPassword ? "Updating..." : "Update password"}
          </Button>
        </form>
      </section>
    </div>
  );
}
