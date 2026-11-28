import {
  POST_CADENCE,
  PUBLIC_STATE_IDS,
  STATES,
  type StateId,
} from "@/config/states";
import { bundledDeskAsOf } from "@/data/desk-as-of";
import { isDeskDataStale } from "@/lib/desk-freshness";

/**
 * Public states whose prize list is still inside staleAfterMs(cadence).
 * Live snapshot times win. A missing time falls back to the committed file.
 */
export function freshPublicStateIds(
  now = Date.now(),
  fetchedAtByState?: Partial<Record<StateId, string | null>>,
): StateId[] {
  return PUBLIC_STATE_IDS.filter((id) => {
    const live = fetchedAtByState?.[id];
    const iso =
      (typeof live === "string" && live) || bundledDeskAsOf(id) || STATES[id].publishedAt;
    return !isDeskDataStale({
      fetchedAt: iso,
      cadence: POST_CADENCE[id],
      now,
    });
  });
}
