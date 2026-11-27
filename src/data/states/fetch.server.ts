/**
 * One official remaining-prize pull per state per day. Server-only.
 * Sequential. Does not run on page load. Does not store lottery HTML.
 */
import { STATE_IDS, STATES, type StateId } from "@/config/states";
import { seedSnapshotsIfEmpty } from "./load.server";
import { storeParsedRemaining } from "./ingest.server";
import { isAlertDesk, notifyRemainingFailures } from "./alert.server";
import { pullOfficial } from "./feeds.server";
import { extractAsOf, parseOfficialRemaining } from "./parse.server";
import { markSnapshotFailed } from "./snapshots.server";

const CONCURRENCY = 4;

export type StateFetchResult = {
  stateId: StateId;
  ok: boolean;
  gameCount: number;
  reason: string;
};

export type DailyFetchReport = {
  ranAt: string;
  results: StateFetchResult[];
};

function logResult(result: StateFetchResult): void {
  const line = ["[remaining]", result.stateId, result.ok, result.gameCount, result.reason] as const;
  if (!result.ok && isAlertDesk(result.stateId)) {
    console.error(...line);
    return;
  }
  console.info(...line);
}

async function failState(
  stateId: StateId,
  reason: string,
  sourceUrl: string | null,
  gameCount = 0,
): Promise<StateFetchResult> {
  try {
    await markSnapshotFailed(stateId, reason, sourceUrl);
  } catch (err) {
    console.error(
      "[remaining] persist failed",
      stateId,
      err instanceof Error ? err.message : "error",
    );
  }
  const result = { stateId, ok: false, gameCount, reason };
  logResult(result);
  return result;
}

export async function fetchStateRemaining(stateId: StateId): Promise<StateFetchResult> {
  const state = STATES[stateId];
  const fetchedAt = new Date().toISOString();
  const sourceUrl = state.remainingPrizesUrl;

  if (!sourceUrl && stateId !== "tn") {
    return failState(stateId, "no remaining-prizes URL", null);
  }

  try {
    const primaryUrl = sourceUrl || "https://tnlottery.com/remaining-prizes/";
    const primary = await pullOfficial(stateId, primaryUrl);
    const usedUrl = primary.url || primaryUrl;
    if (primary.status === 403) {
      return failState(stateId, "HTTP 403", usedUrl);
    }
    if (primary.status >= 400) {
      return failState(stateId, `HTTP ${primary.status}`, usedUrl);
    }

    const body = primary.body;
    const type = primary.type;
    const parsed = body.trim() ? parseOfficialRemaining(stateId, body, type) : [];

    if (!body.trim()) {
      return failState(stateId, "empty body", usedUrl);
    }
    if (!parsed.length) {
      return failState(stateId, "0 parseable games", usedUrl);
    }

    const stored = await storeParsedRemaining(stateId, parsed, {
      sourceUrl: usedUrl,
      fetchedAt,
      asOf: extractAsOf(body),
    });
    if (!stored.ok) {
      return failState(stateId, stored.reason, usedUrl, stored.gameCount);
    }
    logResult(stored);
    return stored;
  } catch (err) {
    const reason =
      err instanceof Error && /timeout|aborted/i.test(err.message)
        ? "timeout"
        : err instanceof Error
          ? err.message.slice(0, 180)
          : "fetch failed";
    return failState(stateId, reason, sourceUrl);
  }
}

export async function fetchAllStates(
  ids: readonly StateId[] = STATE_IDS,
): Promise<DailyFetchReport> {
  await seedSnapshotsIfEmpty();
  const ranAt = new Date().toISOString();
  const results: StateFetchResult[] = new Array(ids.length);
  let cursor = 0;
  async function worker() {
    while (cursor < ids.length) {
      const i = cursor++;
      results[i] = await fetchStateRemaining(ids[i]);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  const report = { ranAt, results };
  try {
    await notifyRemainingFailures(report);
  } catch (err) {
    console.error(
      "[remaining] alert hook failed",
      err instanceof Error ? err.message : "error",
    );
  }
  return report;
}

/** @deprecated Use fetchAllStates */
export async function fetchAllRemaining(): Promise<StateFetchResult[]> {
  return (await fetchAllStates()).results;
}
