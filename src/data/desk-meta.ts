/**
 * Single source of truth for “new information is on the desk.”
 * Bump `revision` EVERY time `src/data/games.ts` changes or the alert is a lie.
 */
export const DESK_META = {
  weekLabel: "Week of August 11, 2026",
  publishedAt: "2026-08-11T12:00:00-05:00",
  revision: 1,
  summary: "Mid-tier remaining prizes refreshed from public TN counts.",
  changedGameNumbers: [] as string[],
};
