/**
 * Helpers for `<input type="date">` values (YYYY-MM-DD in the user's local
 * timezone) and the ISO timestamps stored on trips.
 *
 * Trips are stored at local noon so the calendar day survives conversion to
 * UTC in any timezone within ±12h — midnight UTC would show as the previous
 * evening anywhere west of Greenwich.
 */

/** Local calendar date of a Date as YYYY-MM-DD. */
export function toDateInputValue(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

/** Today's local date as YYYY-MM-DD. */
export function todayDateInputValue(): string {
  return toDateInputValue(new Date());
}

/** YYYY-MM-DD (local) → ISO timestamp at local noon on that day. */
export function dateInputToIso(value: string): string {
  return new Date(`${value}T12:00:00`).toISOString();
}

/** Returns `tz` if it is a valid IANA timezone name, otherwise null. */
export function validTimeZone(tz: string | null | undefined): string | null {
  if (!tz) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return null;
  }
}

/** Calendar date of `date` in timezone `tz` as YYYY-MM-DD. */
export function dateInZone(date: Date, tz: string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Offset of `tz` from UTC at instant `ms`, in milliseconds. */
function zoneOffsetMs(ms: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(new Date(ms));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - (ms - (ms % 1000));
}

/** First instant of calendar day `day` (YYYY-MM-DD) in timezone `tz`. */
export function startOfDayInZone(day: string, tz: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  const wallClock = Date.UTC(y, m - 1, d);
  // Two passes so a DST change between the guess and the answer is handled.
  let utc = wallClock - zoneOffsetMs(wallClock, tz);
  utc = wallClock - zoneOffsetMs(utc, tz);
  return new Date(utc);
}

/** First instant of the day after `day` in timezone `tz`. */
export function startOfNextDayInZone(day: string, tz: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  return startOfDayInZone(next, tz);
}
