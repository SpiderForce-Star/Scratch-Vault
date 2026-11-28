import { postCadenceFor, STATES, type StateId } from "@/config/states";
import { bundledDeskAsOf } from "@/data/desk-as-of";
import { deskFreshnessLabel, isDeskDataStale } from "@/lib/desk-freshness";

/**
 * Stored `stale: false` is not enough. An old list is stale once it is past
 * staleAfterMs(cadence). A row already marked stale stays stale.
 */
export function snapshotIsStale(input: {
  stateId: StateId;
  fetchedAt?: string | null;
  storedStale?: boolean;
  now?: number;
}): boolean {
  if (
    input.fetchedAt &&
    isDeskDataStale({
      fetchedAt: input.fetchedAt,
      cadence: postCadenceFor(input.stateId),
      now: input.now,
    })
  ) {
    return true;
  }
  return Boolean(input.storedStale);
}

/** Header, marquee, and cards. Uses this state's snapshot time only. */
export function deskStampFor(input: {
  stateId: StateId;
  fetchedAt?: string | null;
  now?: number;
  locale?: string;
}): { stale: boolean; asOfIso: string | null; when: string; short: string; name: string } {
  const config = STATES[input.stateId];
  const iso = input.fetchedAt || bundledDeskAsOf(input.stateId) || config.publishedAt;
  const freshness = deskFreshnessLabel({
    fetchedAt: iso,
    cadence: postCadenceFor(input.stateId),
    now: input.now,
    locale: input.locale ?? "en-US",
  });
  return {
    ...freshness,
    short: config.shortName,
    name: config.name,
  };
}
