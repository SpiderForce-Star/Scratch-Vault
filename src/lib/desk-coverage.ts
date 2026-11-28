import {
  POST_CADENCE,
  PUBLIC_STATE_IDS,
  STATES,
  type StateId,
} from "@/config/states";
import { bundledDeskAsOf } from "@/data/desk-as-of";
import { isDeskDataStale } from "@/lib/desk-freshness";

/** Public states whose committed prize list is still inside its update window. */
export function freshPublicStateIds(now = Date.now()): StateId[] {
  return PUBLIC_STATE_IDS.filter((id) => {
    const iso = bundledDeskAsOf(id) || STATES[id].publishedAt;
    return !isDeskDataStale({
      fetchedAt: iso,
      cadence: POST_CADENCE[id],
      now,
    });
  });
}
