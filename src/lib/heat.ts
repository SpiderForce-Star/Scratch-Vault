import type { Game } from "@/data/games";
import { isNewCatalogGame, isUnpostedNewGame } from "../data/tn-snapshot.ts";

export type HeatBand = "hot" | "warm" | "cool" | "bust" | "new";
export type GameRole = "cash-out" | "jackpot";

/** State-aware scoring context. Default matches Tennessee (Play It Again). */
export type HeatContext = {
  /** Subtract this many posted top prizes for jackpot games. Cash-out games ignore it. */
  topHoldback: number;
  holdbackLabel?: string;
};

/** Preserve existing Tennessee scoring when callers omit a context. */
export const DEFAULT_HEAT_CONTEXT: HeatContext = {
  topHoldback: 1,
  holdbackLabel: "Play It Again",
};

export const NO_HOLDBACK_CONTEXT: HeatContext = {
  topHoldback: 0,
};

export type HeatReport = {
  grand: number;
  medium: number;
  vault: number;
  band: HeatBand;
  bust: boolean;
  mediumKnown: boolean;
  role: GameRole;
  topRemaining: number | null;
  /** Jackpot games: remaining minus the state's top-prize holdback (TN Play It Again = 1). */
  effectiveTop: number | null;
  midRemaining: number | null;
  lowRemaining: number | null;
};

/** Compact remaining-heat card for the top-of-desk strip. */
export type TonightCard = {
  number: number;
  name: string;
  price: number;
  band: HeatBand;
  effectiveTop: number | null;
  secondaryRemaining: number | null;
};

export type CashBlip = {
  id: string;
  gameId: number;
  name: string;
  amount: number;
  remaining: number | null;
  angle: number;
  radius: number;
};

export const PRICE_POINTS = [5, 10, 20, 25, 30, 50] as const;
export type PricePoint = (typeof PRICE_POINTS)[number];
export type PriceFilter = "all" | `${PricePoint}`;
export type SortKey = "heat" | "grand" | "medium" | "safest" | "price" | "name";

export function isDeskPrice(price: number): boolean {
  return (PRICE_POINTS as readonly number[]).includes(price);
}

export function isUnderFivePrice(price: number): boolean {
  return price === 1 || price === 2 || price === 3;
}

export function deskGames(games: Game[]): Game[] {
  return games.filter((g) => isDeskPrice(g.price));
}

export function underFiveGames(games: Game[]): Game[] {
  return games.filter((g) => isUnderFivePrice(g.price));
}

export type PriceGroup = { price: number; games: Game[] };

export function groupByDeskPrice(games: Game[]): PriceGroup[] {
  return PRICE_POINTS.map((price) => ({
    price,
    games: games.filter((g) => g.price === price),
  })).filter((group) => group.games.length > 0);
}

export type GamesBoard = {
  newGames: Game[];
  hot: Game[];
  warm: Game[];
  skip: Game[];
};

export type DeskPick = {
  game: Game;
  heat: HeatReport;
  why: string;
};

export type DeskReview = {
  byPrice: { price: string; pick: DeskPick | null }[];
  mediumLeaders: DeskPick[];
  avoid: DeskPick[];
  official: DeskPick[];
  stats: {
    games: number;
    retailJackpots: number;
    cashOuts: number;
    busts: number;
    officialTiers: number;
  };
};

export function bandLabel(band: HeatBand): string {
  if (band === "hot") return "Hot";
  if (band === "warm") return "Warm";
  if (band === "cool") return "Cold";
  if (band === "new") return "NEW";
  return "Pass";
}

const OPENING_BANDS: HeatBand[] = ["hot", "warm", "cool", "bust"];

/**
 * Opening desk: exactly four $5 games, one of each heat
 * (Hot / Warm / Cold / Pass). Fills from remaining $5 tickets if a band is empty.
 */
function openingBand(heat: HeatReport): HeatBand {
  if (
    heat.band === "bust" ||
    (heat.role === "jackpot" && heat.effectiveTop != null && heat.effectiveTop <= 0)
  ) {
    return "bust";
  }
  return heat.band;
}

export function pickOpeningFiveDollarGames(
  games: Game[],
  reports: Map<number, HeatReport>,
): Game[] {
  const fives = games.filter((g) => g.price === 5);
  const used = new Set<number>();
  const picked: Game[] = [];

  for (const band of OPENING_BANDS) {
    const candidates = fives.filter((g) => {
      if (used.has(g.number)) return false;
      const heat = reports.get(g.number);
      return heat ? openingBand(heat) === band : false;
    });
    candidates.sort((a, b) => {
      const ha = reports.get(a.number)!;
      const hb = reports.get(b.number)!;
      if (band === "bust") return ha.vault - hb.vault;
      return hb.vault - ha.vault;
    });
    const next = candidates[0];
    if (next) {
      used.add(next.number);
      picked.push(next);
    }
  }

  if (picked.length < 4) {
    const rest = fives
      .filter((g) => !used.has(g.number) && reports.has(g.number))
      .sort((a, b) => (reports.get(b.number)?.vault ?? 0) - (reports.get(a.number)?.vault ?? 0));
    for (const game of rest) {
      if (picked.length >= 4) break;
      used.add(game.number);
      picked.push(game);
    }
  }

  return picked;
}

export function inPriceFilter(game: Game, filter: PriceFilter): boolean {
  if (filter === "all") return true;
  return game.price === Number(filter);
}

/**
 * Skip IFF band is cool or bust, or heat.bust is true.
 * Hot, warm, and new are never skip — even jackpots with grand leftover 0.
 */
export function isSkipGame(heat: HeatReport | undefined): boolean {
  if (!heat) return false;
  if (heat.band === "hot" || heat.band === "warm" || heat.band === "new") return false;
  return heat.band === "cool" || heat.band === "bust" || heat.bust === true;
}

/** Homepage SKIP THESE chips: Cold or Skip only. Never Hot / Warm / NEW. */
export function skipChipBand(heat: HeatReport): "cool" | "bust" {
  if (heat.band === "bust" || heat.bust) return "bust";
  return "cool";
}

/** Three tickets to review at this price, then stop. Never share a game with Skip These. */
export function pickTripGames(
  games: Game[],
  reports: Map<number, HeatReport>,
  filter: PriceFilter,
  count = 3,
): Game[] {
  const pool = games.filter((g) => isDeskPrice(g.price) && inPriceFilter(g, filter));
  const ranked = sortGames(pool, "heat", reports);
  return ranked
    .filter((g) => {
      const heat = reports.get(g.number);
      return Boolean(heat && !isSkipGame(heat) && heat.band !== "new");
    })
    .slice(0, count);
}

/** New $5+ games. Unposted first, then newest numbers. Under $5 stays off this strip. */
export function pickNewGames(
  games: Game[],
  _reports: Map<number, HeatReport>,
  max = 8,
): Game[] {
  const fresh = games.filter((g) => isDeskPrice(g.price) && isNewCatalogGame(g));
  fresh.sort((a, b) => {
    const aNew = isUnpostedNewGame(a) ? 1 : 0;
    const bNew = isUnpostedNewGame(b) ? 1 : 0;
    if (aNew !== bNew) return bNew - aNew;
    return b.number - a.number;
  });
  return fresh.slice(0, max);
}

function vaultOf(reports: Map<number, HeatReport>, game: Game): number {
  return reports.get(game.number)?.vault ?? 0;
}

function matchesBoardQuery(game: Game, query: string): boolean {
  if (!query) return true;
  return game.name.toLowerCase().includes(query) || String(game.number).includes(query);
}

/** Default Games page: New → Hot → Warm → Skip these. $5+ only. */
export function buildGamesBoard(
  games: Game[],
  reports: Map<number, HeatReport>,
  priceFilter: number | "all" = "all",
  query = "",
): GamesBoard {
  const q = query.trim().toLowerCase();
  const pool = games.filter((g) => {
    if (!isDeskPrice(g.price)) return false;
    if (priceFilter !== "all" && g.price !== priceFilter) return false;
    return matchesBoardQuery(g, q);
  });
  const fresh = pickNewGames(pool, reports, pool.length);
  const freshIds = new Set(fresh.map((g) => g.number));
  const rest = pool.filter((g) => !freshIds.has(g.number));
  const hot = rest
    .filter((g) => reports.get(g.number)?.band === "hot")
    .sort((a, b) => vaultOf(reports, b) - vaultOf(reports, a) || a.price - b.price);
  const warm = rest
    .filter((g) => reports.get(g.number)?.band === "warm")
    .sort((a, b) => vaultOf(reports, b) - vaultOf(reports, a) || a.price - b.price);
  const skip = rest
    .filter((g) => isSkipGame(reports.get(g.number)))
    .sort((a, b) => vaultOf(reports, a) - vaultOf(reports, b) || a.price - b.price);
  return { newGames: fresh, hot, warm, skip };
}

/** Hot/warm tickets at this price, not this game. */
export function pickBetterPicks(
  games: Game[],
  reports: Map<number, HeatReport>,
  price: number,
  excludeNumber: number,
  max = 4,
): Game[] {
  return games
    .filter((g) => g.price === price && g.number !== excludeNumber)
    .filter((g) => {
      const heat = reports.get(g.number);
      return Boolean(heat && (heat.band === "hot" || heat.band === "warm"));
    })
    .sort((a, b) => vaultOf(reports, b) - vaultOf(reports, a))
    .slice(0, max);
}

/** Cold/skip tickets at this price, not this game. */
export function pickSkipAtPrice(
  games: Game[],
  reports: Map<number, HeatReport>,
  price: number,
  excludeNumber: number,
  max = 4,
): Game[] {
  return games
    .filter((g) => g.price === price && g.number !== excludeNumber)
    .filter((g) => isSkipGame(reports.get(g.number)))
    .sort((a, b) => vaultOf(reports, a) - vaultOf(reports, b))
    .slice(0, max);
}

function skipRank(reports: Map<number, HeatReport>, a: Game, b: Game): number {
  return vaultOf(reports, a) - vaultOf(reports, b) || a.price - b.price;
}

/** Skip-qualified games only. Prefer selected price; other-price fills must also be skip. Empty → []. */
export function pickSkipGames(
  games: Game[],
  reports: Map<number, HeatReport>,
  filter: PriceFilter,
  max = 5,
  exclude: Iterable<number> = [],
): Game[] {
  const blocked = new Set(exclude);
  const skips = games.filter(
    (g) =>
      isDeskPrice(g.price) &&
      !blocked.has(g.number) &&
      isSkipGame(reports.get(g.number)),
  );
  if (skips.length === 0) return [];
  const atPrice = skips.filter((g) => inPriceFilter(g, filter)).sort((a, b) => skipRank(reports, a, b));
  const rest = skips.filter((g) => !inPriceFilter(g, filter)).sort((a, b) => skipRank(reports, a, b));
  return [...atPrice, ...rest].slice(0, max);
}

export function sortGames(
  games: Game[],
  key: SortKey,
  reports: Map<number, HeatReport>,
): Game[] {
  const copy = [...games];
  copy.sort((a, b) => {
    const ra = reports.get(a.number);
    const rb = reports.get(b.number);
    if (!ra || !rb) return a.number - b.number;
    if (key === "heat") return rb.vault - ra.vault;
    if (key === "grand") return rb.grand - ra.grand;
    if (key === "medium") return rb.medium - ra.medium;
    if (key === "safest") {
      if (ra.bust !== rb.bust) return Number(ra.bust) - Number(rb.bust);
      return rb.vault - ra.vault;
    }
    if (key === "price") return a.price - b.price || a.number - b.number;
    return a.name.localeCompare(b.name);
  });
  return copy;
}

export function reportMap(
  reports: Record<string, HeatReport>,
): Map<number, HeatReport> {
  const map = new Map<number, HeatReport>();
  for (const [key, value] of Object.entries(reports)) {
    map.set(Number(key), value);
  }
  return map;
}
