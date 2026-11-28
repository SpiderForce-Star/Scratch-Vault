import type { PostCadence } from "@/config/states";

/**
 * Prize-list freshness.
 *
 * The cron fetch runs once a day. A daily lottery list is stale after about
 * 36 hours. A weekly list is stale after its 7-day cadence plus that same
 * 36-hour buffer. Stale data is never labeled current.
 */

export const DESK_TIME_ZONE = "America/Chicago";

/** Daily lists: stale once they are older than about 36 hours. */
export const DAILY_STALE_MS = 36 * 60 * 60 * 1000;

/** Weekly lists: the lottery's posting cadence. */
export const WEEKLY_CADENCE_MS = 7 * 24 * 60 * 60 * 1000;

/** Extra wait after a weekly cadence before the list is called stale. */
export const WEEKLY_BUFFER_MS = 36 * 60 * 60 * 1000;

/**
 * Public desks, including the default Tennessee desk. Keep this aligned with
 * PUBLIC_STATE_IDS. Hidden desks are not paged.
 */
const ALERT_DESKS = new Set([
  "tn",
  "ky",
  "sc",
  "ok",
  "nc",
  "pa",
  "tx",
  "mo",
  "ia",
  "id",
  "mi",
  "oh",
]);

export function isAlertDesk(stateId: string): boolean {
  return ALERT_DESKS.has(stateId);
}

export function staleAfterMs(cadence: PostCadence = "daily"): number {
  return cadence === "weekly" ? WEEKLY_CADENCE_MS + WEEKLY_BUFFER_MS : DAILY_STALE_MS;
}

export function deskAsOfIso(
  fetchedAt: string | null | undefined,
  publishedAt: string | null | undefined,
): string | null {
  const raw = fetchedAt || publishedAt || "";
  if (!raw) return null;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

export function isDeskDataStale(input: {
  stale?: boolean;
  fetchedAt?: string | null;
  publishedAt?: string | null;
  cadence?: PostCadence;
  now?: number;
}): boolean {
  const iso = deskAsOfIso(input.fetchedAt, input.stale ? input.publishedAt : input.fetchedAt || null);
  if (!iso) return false;
  const age = (input.now ?? Date.now()) - Date.parse(iso);
  return age > staleAfterMs(input.cadence ?? "daily");
}

/** Date and time in America/Chicago, with a short zone label (CST or CDT). */
export function formatDeskAsOf(iso: string, locale = "en-US"): string {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return iso;
  const date = new Date(parsed);
  const when = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: DESK_TIME_ZONE,
  }).format(date);
  const zone =
    new Intl.DateTimeFormat("en-US", {
      timeZone: DESK_TIME_ZONE,
      timeZoneName: "short",
    })
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName")?.value ?? "CT";
  return `${when} ${zone}`;
}

const FRESHNESS_CLAIM = /\b(current|actual|live|real-time|real time)\b/i;

/** As-of label. Never returns a "current" claim when the list is stale. */
export function deskFreshnessLabel(input: {
  fetchedAt?: string | null;
  publishedAt?: string | null;
  stale?: boolean;
  cadence?: PostCadence;
  now?: number;
  locale?: string;
}): { stale: boolean; asOfIso: string | null; when: string } {
  const asOfIso = deskAsOfIso(
    input.fetchedAt,
    input.stale ? input.publishedAt : input.fetchedAt || input.publishedAt || null,
  );
  const stale = isDeskDataStale({
    fetchedAt: asOfIso,
    cadence: input.cadence,
    now: input.now,
  });
  const when = asOfIso ? formatDeskAsOf(asOfIso, input.locale ?? "en-US") : "";
  if (stale && FRESHNESS_CLAIM.test(when)) {
    return { stale, asOfIso, when: when.replace(FRESHNESS_CLAIM, "").replace(/\s+/g, " ").trim() };
  }
  return { stale, asOfIso, when };
}
