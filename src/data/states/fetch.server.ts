/**
 * One official remaining-prize pull per state per day. Server-only.
 * Sequential. Does not run on page load. Does not store lottery HTML.
 */
import { HIDDEN_RETURN_MIN_GAMES, STATE_IDS, STATES, type StateId } from "@/config/states";
import type { Game } from "@/data/games";
import { fullCatalog as tennesseeFullCatalog } from "@/data/games.full.server";
import { publicCatalog } from "./index";
import { loadBundledDesk, seedSnapshotsIfEmpty } from "./load.server";
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

const FETCH_MS = 8_000;
const CONCURRENCY = 4;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const FALLBACK_URLS: Partial<Record<StateId, string>> = {
  ok: "https://www.lottery.ok.gov/scratchers/get",
};

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

async function fetchText(url: string): Promise<{ status: number; type: string; body: string }> {
  const res = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_MS),
    headers: {
      "User-Agent": USER_AGENT,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
    },
  });
  const type = res.headers.get("content-type") || "";
  const body = await res.text();
  return { status: res.status, type, body };
}

function logResult(result: StateFetchResult): void {
  console.info("[remaining]", result.stateId, result.ok, result.gameCount, result.reason);
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
    const primaryUrl = sourceUrl || "https://www.tnlottery.com/games/scratch-offs";
    const primary = await fetchText(primaryUrl);
    if (primary.status === 403) {
      return failState(stateId, `HTTP 403`, primaryUrl);
    }
    if (primary.status >= 400) {
      const extra = FALLBACK_URLS[stateId];
      if (!extra || extra === primaryUrl) {
        return failState(stateId, `HTTP ${primary.status}`, primaryUrl);
      }
    }

    let body = primary.status < 400 ? primary.body : "";
    let type = primary.status < 400 ? primary.type : "";
    let usedUrl = primaryUrl;

    let parsed = body.trim() ? parseOfficialRemaining(stateId, body, type) : [];
    if (!parsed.length) {
      const extra = FALLBACK_URLS[stateId];
      if (extra && extra !== primaryUrl) {
        const second = await fetchText(extra);
        if (second.status === 403) {
          return failState(stateId, "HTTP 403", extra);
        }
        if (second.status >= 400) {
          return failState(stateId, `HTTP ${second.status}`, extra);
        }
        body = second.body;
        type = second.type;
        usedUrl = extra;
        parsed = parseOfficialRemaining(stateId, body, type);
      }
    }

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
  return { ranAt, results };
}

/** @deprecated Use fetchAllStates */
export async function fetchAllRemaining(): Promise<StateFetchResult[]> {
  return (await fetchAllStates()).results;
}
