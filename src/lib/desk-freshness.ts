/** A desk whose last good pull is older than this is shown as stale. */
export const STALE_DESK_MS = 2 * 24 * 60 * 60 * 1000;

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
  now?: number;
}): boolean {
  const iso = deskAsOfIso(input.fetchedAt, input.stale ? input.publishedAt : null);
  if (!iso) return false;
  const age = (input.now ?? Date.now()) - Date.parse(iso);
  return age > STALE_DESK_MS;
}

export function formatDeskAsOf(iso: string, locale = "en-US"): string {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return iso;
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago",
  }).format(new Date(parsed));
}
