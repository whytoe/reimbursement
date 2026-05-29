"use client";

import { SettingsGuard } from "@/components/SettingsGuard";
import { TripWizard } from "@/components/TripWizard";

export default function Home() {
  return (
    <SettingsGuard>
      <TripWizard />
    </SettingsGuard>
  );
}
