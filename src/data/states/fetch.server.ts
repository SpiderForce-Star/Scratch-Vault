/**
 * One official remaining-prize pull per state per day. Server-only.
 * Sequential. Does not run on page load. Does not store lottery HTML.
 */
import { STATE_IDS, STATES, type StateId } from "@/config/states";
import { fullCatalog as tennesseeFullCatalog } from "@/data/games.full.server";
import { publicCatalog } from "./index";
import { loadBundledDesk, seedSnapshotsIfEmpty } from "./load.server";
import {
  extractAsOf,
  gamesFromParse,
  parseOfficialRemaining,
} from "./parse.server";
import {
  formatWeekLabel,
  markSnapshotFailed,
  readSnapshot,
  upsertSnapshot,
} from "./snapshots.server";

const FETCH_MS = 12_000;
const STATE_DELAY_MS = 400;
const USER_AGENT =
  "ScratchVault/1.0 (independent remaining-prize desk; +https://volunteer-scratch-vault.vercel.app)";

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
      Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.8",
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
    if (primary.status >= 400) {
      const extra = FALLBACK_URLS[stateId];
      if (!extra || extra === primaryUrl) {
        return failState(stateId, `HTTP ${primary.status}`, primaryUrl);
      }
    }

    let body = primary.status < 400 ? primary.body : "";
    let type = primary.status < 400 ? primary.type : "";
    let usedUrl = primaryUrl;

    if (!body.trim()) {
      const extra = FALLBACK_URLS[stateId];
      if (extra && extra !== primaryUrl) {
        const second = await fetchText(extra);
        if (second.status >= 400) {
          return failState(stateId, `HTTP ${second.status}`, extra);
        }
        body = second.body;
        type = second.type;
        usedUrl = extra;
      }
    }

    if (!body.trim()) {
      return failState(stateId, "empty body", usedUrl);
    }

    const parsed = parseOfficialRemaining(stateId, body, type);
    if (!parsed.length) {
      return failState(stateId, "0 parseable games", usedUrl);
    }

    const lastGood = await readSnapshot(stateId);
    const bundled = loadBundledDesk(stateId);
    const known =
      lastGood?.catalog?.length
        ? lastGood.catalog
        : stateId === "tn"
          ? tennesseeFullCatalog()
          : publicCatalog(stateId).length
            ? bundled.games
            : [];

    const games = gamesFromParse(stateId, parsed, known);
    if (!games.length) {
      return failState(stateId, "0 parseable games", usedUrl);
    }

    const minTrusted = known.length ? Math.max(3, Math.ceil(known.length * 0.25)) : 1;
    const matched = parsed.filter((row) =>
      known.some(
        (game) =>
          game.number === row.number ||
          game.name.replace(/[^a-z0-9]+/gi, "").toLowerCase() ===
            row.name.replace(/[^a-z0-9]+/gi, "").toLowerCase(),
      ),
    ).length;
    const trustedCount = known.length ? matched : games.length;
    if (trustedCount < minTrusted) {
      return failState(stateId, "untrusted parse", usedUrl, games.length);
    }

    const asOf = extractAsOf(body) || fetchedAt;
    const weekLabel = formatWeekLabel(asOf);
    await upsertSnapshot({
      stateId,
      ok: true,
      stale: false,
      fetchedAt,
      weekLabel,
      sourceUrl: usedUrl,
      reason: "ok",
      gameCount: games.length,
      catalog: games.map((game) => ({ ...game, stateId })),
    });
    const result = { stateId, ok: true, gameCount: games.length, reason: "ok" };
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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchAllStates(): Promise<DailyFetchReport> {
  await seedSnapshotsIfEmpty();
  const ranAt = new Date().toISOString();
  const results: StateFetchResult[] = [];
  for (let i = 0; i < STATE_IDS.length; i++) {
    const id = STATE_IDS[i];
    results.push(await fetchStateRemaining(id));
    if (i < STATE_IDS.length - 1) await wait(STATE_DELAY_MS);
  }
  return { ranAt, results };
}

/** @deprecated Use fetchAllStates */
export async function fetchAllRemaining(): Promise<StateFetchResult[]> {
  return (await fetchAllStates()).results;
}
