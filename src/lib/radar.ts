/**
 * Grand-prize radar: published top-tier remaining drops only.
 * Monitor public desks. Never invent counts. Not live store inventory.
 */
import type { Game } from "../data/games";

/** Same list as PUBLIC_STATE_IDS. Hidden AZ CT IL MA stay off the scope. */
export const RADAR_STATE_IDS = [
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
  "oh",
  "mi",
] as const;

const BLOCKED_DESKS = new Set(["az", "ct", "il", "ma"]);
