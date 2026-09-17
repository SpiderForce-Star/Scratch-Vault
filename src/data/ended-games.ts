/**
 * Remaining tables sometimes keep closed games. Skip-list them so they
 * never land in Review these 3 / tonight picks.
 *
 * Ending-soon uses an official last-day (YYYY-MM-DD). Missing or unparseable
 * dates stay off the chip — never invent a calendar.
 */
export const ENDED_GAMES: ReadonlyArray<{ readonly stateId: string; readonly number: number }> = [
  { stateId: "ky", number: 107 }, // Merry Multiplier — closed; still on KY remaining
];

/** Inclusive window for the Ending soon strip. */
export const ENDING_SOON_DAYS = 30;

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTHS: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function ymdFromParts(year: number, month: number, day: number): string | null {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (year < 2020 || year > 2040) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Official last-day / claim-by text → YYYY-MM-DD. TBD / empty / junk → null. */
export function parseCalendarDate(raw: unknown): string | null {
  const s = String(raw ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return null;
  if (/^(tbd|n\/?a|na|pending|—|-|\.|none|not announced)$/i.test(s)) return null;

  const iso = s.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) {
    return ymdFromParts(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  const named = s.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i,
  );
  if (named) {
    const month = MONTHS[named[1].toLowerCase().replace(/\.$/, "")];
    return ymdFromParts(Number(named[3]), month, Number(named[2]));
  }

  const slash = s.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (slash) {
    let year = Number(slash[3]);
    if (year < 100) year += 2000;
    return ymdFromParts(year, Number(slash[1]), Number(slash[2]));
  }

  return null;
}

export function isYmd(value: unknown): value is string {
  return typeof value === "string" && YMD.test(value);
}

/** Calendar day in the desk's display zone. Default Chicago. */
export function calendarYmd(
  now: Date = new Date(),
  timeZone = "America/Chicago",
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Whole days from `today` to `ymd`. Negative = already past. */
export function daysUntilYmd(
  ymd: string,
  today: string = calendarYmd(),
): number | null {
  if (!isYmd(ymd) || !isYmd(today)) return null;
  const a = Date.parse(`${today}T12:00:00Z`);
  const b = Date.parse(`${ymd}T12:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

export function formatYmdLabel(ymd: string, locale = "en-US"): string {
  const m = YMD.exec(ymd);
  if (!m) return ymd;
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export type DatedGame = {
  stateId?: string;
  number: number;
  name?: string;
  endDate?: string | null;
  lastClaimDate?: string | null;
};

export function isEndedGame(game: DatedGame): boolean {
  const state = (game.stateId ?? "tn").trim().toLowerCase() || "tn";
  if (ENDED_GAMES.some((row) => row.stateId === state && row.number === game.number)) {
    return true;
  }
  const name = String(game.name ?? "");
  if (/no longer available|not sold|\bended\b|no longer sold/i.test(name)) {
    return true;
  }
  if (isYmd(game.endDate)) {
    const days = daysUntilYmd(game.endDate);
    if (days != null && days < 0) return true;
  }
  return false;
}

/** Official last-day is today or within ENDING_SOON_DAYS. Past dates are ended, not soon. */
export function isEndingSoon(game: DatedGame, now?: Date): boolean {
  if (!isYmd(game.endDate)) return false;
  if (isEndedGame(game)) return false;
  const days = daysUntilYmd(game.endDate, calendarYmd(now));
  return days != null && days >= 0 && days <= ENDING_SOON_DAYS;
}
