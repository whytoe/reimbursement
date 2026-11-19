import { describe, it, expect } from "vitest";
import {
  dateInputToIso,
  toDateInputValue,
  validTimeZone,
  dateInZone,
  startOfDayInZone,
  startOfNextDayInZone,
} from "./dates";

describe("local date input helpers", () => {
  it("round-trips a calendar day through the stored ISO value", () => {
    const iso = dateInputToIso("2026-03-31");
    expect(toDateInputValue(new Date(iso))).toBe("2026-03-31");
  });

  it("uses the local calendar day, not the UTC one", () => {
    // 8pm local on Mar 31 — for anyone west of UTC this is Apr 1 in UTC.
    const evening = new Date(2026, 2, 31, 20, 0, 0);
    expect(toDateInputValue(evening)).toBe("2026-03-31");
  });
});

describe("timezone helpers", () => {
  const tz = "America/Vancouver";

  it("rejects invalid timezones", () => {
    expect(validTimeZone("Not/AZone")).toBeNull();
    expect(validTimeZone(null)).toBeNull();
    expect(validTimeZone(tz)).toBe(tz);
  });

  it("formats an instant as the calendar day in the zone", () => {
    // 2026-04-01T03:00Z is 8pm Mar 31 in Vancouver (PDT, UTC-7).
    expect(dateInZone(new Date("2026-04-01T03:00:00Z"), tz)).toBe("2026-03-31");
  });

  it("finds the start of a day in the zone", () => {
    expect(startOfDayInZone("2026-04-01", tz).toISOString()).toBe("2026-04-01T07:00:00.000Z");
    expect(startOfDayInZone("2026-01-15", tz).toISOString()).toBe("2026-01-15T08:00:00.000Z");
  });

  it("handles the DST change day and month/year rollover", () => {
    // Los Angeles still observes DST (BC went permanent UTC-7 in Nov 2026).
    // DST starts 2026-03-08: midnight is still PST (UTC-8).
    const la = "America/Los_Angeles";
    expect(startOfDayInZone("2026-03-08", la).toISOString()).toBe("2026-03-08T08:00:00.000Z");
    expect(startOfNextDayInZone("2026-03-08", la).toISOString()).toBe("2026-03-09T07:00:00.000Z");
    expect(startOfNextDayInZone("2026-12-31", la).toISOString()).toBe("2027-01-01T08:00:00.000Z");
  });

  it("works east of UTC too", () => {
    expect(startOfDayInZone("2026-04-01", "Asia/Tokyo").toISOString()).toBe("2026-03-31T15:00:00.000Z");
  });
});
