/**
 * Per-state refresh schedule for official remaining-prize sources.
 *
 * Every state is pulled once a day, except states whose official source only
 * updates weekly; those run once a week on their own day. Times are UTC and
 * sit shortly after each state's observed posting time (audit 2026-11-27).
 *
 * runner:
 *  - "vercel":   the Vercel Cron slot pulls the source directly.
 *  - "external": the source blocks Vercel (Cloudflare 403). An outside job
 *                (box / home machine / manual browser save) POSTs the official
 *                table to /api/ingest/remaining on the same schedule.
 *
 * Keep every `slot` listed in vercel.json crons (see scripts/refresh-schedule.test.mjs).
 */
import type { StateId } from "./states";

export type RefreshCadence = "daily" | "weekly";
export type RefreshRunner = "vercel" | "external";

export type StateRefresh = {
  cadence: RefreshCadence;
  /** UTC "HHMM" cron slot this state runs in. */
  slot: string;
  /** Weekly states only: 0 = Sunday … 6 = Saturday (UTC). */
  weekday?: number;
  runner: RefreshRunner;
  /** How old the source as-of can be before the desk is shown as stale. */
  maxAgeMs: number;
  /** What we observed about the source's own update rhythm. */
  sourceNote: string;
};

const DAY = 24 * 60 * 60 * 1000;
const daily = (slot: string, sourceNote: string, runner: RefreshRunner = "vercel"): StateRefresh => ({
  cadence: "daily",
  slot,
  runner,
  maxAgeMs: 2 * DAY,
  sourceNote,
});
const weekly = (
  slot: string,
  weekday: number,
  sourceNote: string,
  runner: RefreshRunner = "vercel",
): StateRefresh => ({
  cadence: "weekly",
  slot,
  weekday,
  runner,
  maxAgeMs: 8 * DAY,
  sourceNote,
});

export const REFRESH_SCHEDULE: Record<StateId, StateRefresh> = {
  // Weekly table ("updated weekly"); recent reports dated Thu/Fri. Cloudflare blocks Vercel.
  tn: weekly("1500", 5, "Official page: updated weekly (Thu/Fri)", "external"),
  ky: daily("1115", "Daily, as of prior day; posted overnight"),
  sc: daily("1630", "Daily, 'Last Updated' ~11:00 AM ET (16:00 UTC)"),
  ok: daily("1115", "Per-game pages; no as-of shown"),
  mi: daily("1115", "Daily, UpdatedAt ~08:20 UTC"),
  nc: daily("1115", "Daily, claims through prior day"),
  pa: daily("1115", "No as-of shown on page"),
  tx: daily("2200", "Daily on business days, as of prior day; posts after 11:15 UTC"),
  mo: daily("1115", "No as-of shown on page"),
  oh: daily("1115", "Official API; no as-of field"),
  ia: daily("2200", "DataAsOf prior day; posts after 11:15 UTC"),
  id: daily("1115", "No as-of shown on page"),
  // Hidden desks: keep pulling daily so they can return when the feed works.
  az: daily("1115", "Cloudflare 403 from Vercel"),
  il: daily("1115", "Cloudflare 403 from Vercel"),
  ma: daily("1115", "Official API"),
  ct: daily("1115", "Catalog page"),
};

/** Slots the Vercel cron must call (vercel.json). External states keep their own timer. */
export const VERCEL_REFRESH_SLOTS = [
  ...new Set(
    Object.values(REFRESH_SCHEDULE)
      .filter((r) => r.runner === "vercel")
      .map((r) => r.slot),
  ),
].sort();

export function refreshFor(stateId: StateId): StateRefresh {
  return REFRESH_SCHEDULE[stateId];
}

/**
 * States the Vercel cron should pull in this slot. A weekly state only runs on
 * its weekday. `slot` null = legacy call (no ?slot=): every Vercel-run state.
 */
export function dueVercelStates(
  ids: readonly StateId[],
  slot: string | null,
  now: Date = new Date(),
): StateId[] {
  return ids.filter((id) => {
    const r = REFRESH_SCHEDULE[id];
    if (!r || r.runner !== "vercel") return false;
    if (slot == null) return true;
    if (r.slot !== slot) return false;
    if (r.cadence === "weekly" && r.weekday !== now.getUTCDay()) return false;
    return true;
  });
}

export function maxDeskAgeMs(stateId: StateId | string | null | undefined): number {
  const r = stateId ? REFRESH_SCHEDULE[stateId as StateId] : undefined;
  return r?.maxAgeMs ?? 2 * DAY;
}
