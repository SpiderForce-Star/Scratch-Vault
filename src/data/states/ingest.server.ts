/**
 * Shared "store a parsed official table" step. Used by the Vercel cron pull
 * (fetch.server) and by the authenticated external ingest route, so a desk
 * written from outside Vercel goes through exactly the same trust checks.
 * Server-only. Does not store lottery HTML.
 */
import { HIDDEN_RETURN_MIN_GAMES, STATES, type StateId } from "@/config/states";
import type { Game } from "@/data/games";
import { fullCatalog as tennesseeFullCatalog } from "@/data/games.full.server";
import { publicCatalog } from "./index";
import { loadBundledDesk } from "./load.server";
import { fetchText } from "./feeds.server";
import {
  gamesFromParse,
  mergeNewGameListings,
  parseNewGames,
  unionBundledGames,
  type ParsedGame,
} from "./parse.server";
import {
  archivePriorSnapshot,
  formatWeekLabel,
  readSnapshot,
  upsertSnapshot,
} from "./snapshots.server";

export type StoreResult = {
  stateId: StateId;
  ok: boolean;
  gameCount: number;
  reason: string;
  /** Parsed source games that matched a game we already know. */
  matched?: number;
};

/**
 * A parse that matches almost none of the games we already know is a broken
 * parser (e.g. prize amounts read as game numbers), not a new catalog.
 * Fail it instead of re-stamping last-good counts with today's date.
 */
export const MIN_KNOWN_MATCH_RATIO = 0.3;

export async function storeParsedRemaining(
  stateId: StateId,
  parsed: ParsedGame[],
  opts: {
    sourceUrl: string | null;
    fetchedAt?: string;
    /** Source's own as-of (ISO). Falls back to fetchedAt. */
    asOf?: string | null;
    /** Skip the extra new-games page pull (external ingest already sent it all). */
    skipNewGames?: boolean;
  },
): Promise<StoreResult> {
  const fetchedAt = opts.fetchedAt ?? new Date().toISOString();
  if (!parsed.length) return { stateId, ok: false, gameCount: 0, reason: "0 parseable games" };

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

  if (known.length) {
    const knownNumbers = new Set(known.map((g) => g.number));
    const matched = parsed.filter((g) => knownNumbers.has(g.number)).length;
    const base = Math.min(known.length, parsed.length);
    if (base >= 5 && matched / base < MIN_KNOWN_MATCH_RATIO) {
      return {
        stateId,
        ok: false,
        gameCount: 0,
        matched,
        reason: `parse matched ${matched}/${parsed.length} known games`,
      };
    }
  }

  const games = gamesFromParse(stateId, parsed, known);
  if (!games.length) return { stateId, ok: false, gameCount: 0, reason: "0 parseable games" };
  if (games.length < HIDDEN_RETURN_MIN_GAMES) {
    return { stateId, ok: false, gameCount: games.length, reason: "untrusted parse" };
  }

  let catalog: Game[] = games.map((game) => ({ ...game, stateId }));
  const newGamesUrl = STATES[stateId].newGamesUrl;
  if (!opts.skipNewGames && newGamesUrl && newGamesUrl !== opts.sourceUrl) {
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

  const asOf = opts.asOf || fetchedAt;
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
    sourceUrl: opts.sourceUrl,
    reason: "ok",
    gameCount: catalog.length,
    catalog,
  });
  return { stateId, ok: true, gameCount: catalog.length, reason: "ok" };
}
