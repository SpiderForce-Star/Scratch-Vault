import type { Game } from "@/data/games";

export type HeatBand = "hot" | "warm" | "cool" | "bust";
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
