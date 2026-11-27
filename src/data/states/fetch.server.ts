/**
 * One official remaining-prize pull per state per day. Server-only.
 * Sequential. Does not run on page load. Does not store lottery HTML.
 */
import { HIDDEN_RETURN_MIN_GAMES, STATE_IDS, STATES, type StateId } from "@/config/states";
import type { Game } from "@/data/games";
import { fullCatalog as tennesseeFullCatalog } from "@/data/games.full.server";
import { publicCatalog } from "./index";
import { loadBundledDesk, seedSnapshotsIfEmpty } from "./load.server";
import { isAlertDesk, notifyRemainingFailures } from "./alert.server";
import { fetchText, pullOfficial } from "./feeds.server";
import {
  extractAsOf,
  gamesFromParse,
  mergeNewGameListings,
  parseNewGames,
  parseOfficialRemaining,
  unionBundledGames,
} from "./parse.server";
import {
  archivePriorSnapshot,
  formatWeekLabel,
  markSnapshotFailed,
  readSnapshot,
  upsertSnapshot,
} from "./snapshots.server";

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

    const lastGood = await readSnapshot(stateId);
    const bundled = loadBundledDesk(stateId);
    const fallbackKnown =
      stateId === "tn"
        ? tennesseeFullCatalog()
        : publicCatalog(stateId).length
          ? bundled.games
          : [];
    const known = lastGood?.catalog?.length
      ? unionBundledGames(lastGood.catalog, fallbackKnown)
      : fallbackKnown;

    const games = gamesFromParse(stateId, parsed, known);
    if (!games.length) {
      return failState(stateId, "0 parseable games", usedUrl);
    }

    if (games.length < HIDDEN_RETURN_MIN_GAMES) {
      return failState(stateId, "untrusted parse", usedUrl, games.length);
    }

    let catalog: Game[] = games.map((game) => ({ ...game, stateId }));
    const newGamesUrl = state.newGamesUrl;
    if (newGamesUrl && newGamesUrl !== usedUrl) {
      try {
        const extra = await fetchText(newGamesUrl);
        if (extra.status < 400 && extra.body.trim()) {
          const listed = parseNewGames(stateId, extra.body, extra.type);
          catalog = mergeNewGameListings(catalog, listed, stateId).map((game) => ({
            ...game,
            stateId,
          }));
        }
      } catch {
        /* remaining catalog stands — do not fail the desk */
      }
    }

    const asOf = extractAsOf(body) || fetchedAt;
    const weekLabel = formatWeekLabel(asOf, true);
    if (lastGood?.catalog?.length) {
      await archivePriorSnapshot(lastGood);
    }
    await upsertSnapshot({
      stateId,
      ok: true,
      stale: false,
      fetchedAt,
      weekLabel,
      sourceUrl: usedUrl,
      reason: "ok",
      gameCount: catalog.length,
      catalog,
    });
    const result = { stateId, ok: true, gameCount: catalog.length, reason: "ok" };
    logResult(result);
    return result;
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

export async function fetchAllStates(): Promise<DailyFetchReport> {
  await seedSnapshotsIfEmpty();
  const ranAt = new Date().toISOString();
  const results: StateFetchResult[] = new Array(STATE_IDS.length);
  let cursor = 0;
  async function worker() {
    while (cursor < STATE_IDS.length) {
      const i = cursor++;
      results[i] = await fetchStateRemaining(STATE_IDS[i]);
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
