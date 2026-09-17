import type { Game } from "@/data/games";
import { isEndedGame } from "../data/ended-games.ts";
import {
  inPriceFilter,
  isDeskPrice,
  isSkipCandidate,
  pickSkipGames,
  pickTripGames,
  soldPricePoints,
  type HeatReport,
  type PriceFilter,
  type PricePoint,
} from "./heat.ts";

export const STRATEGY_IDS = ["heat", "grand", "cash", "fast", "spread"] as const;
export type StrategyId = (typeof STRATEGY_IDS)[number];

export const STRATEGY_BUDGETS = [20, 30, 40, 50, 60, 80, 100, 150, 200] as const;
export type StrategyBudget = (typeof STRATEGY_BUDGETS)[number];

export type StrategyGoal = "mixed" | "grand" | "cash";

export type StrategyRow = {
  game: Game;
  heat: HeatReport;
  count: number;
};

export type StrategyPlan = {
  id: StrategyId;
  lookAt: StrategyRow[];
  walkPast: StrategyRow[];
  stubs: number[];
  spent: number;
  ticketCount: number;
  leftover: number;
  fit: number;
  empty: boolean;
  mix: { grand: number; medium: number; cash: number };
};

const LOOK_AT = 3;
const WALK_MAX = 5;
const CASH_MIX_FLOOR = 40;

function deskScore(heat: HeatReport): number {
  return heat.deskScore ?? heat.vault;
}

function cashMix(heat: HeatReport): number {
  return heat.cash ?? 0;
}

/** Jackpot with no retail top. Guest payloads strip remaining; grand stays 0. */
export function isRetailTopGone(heat: HeatReport): boolean {
  if (heat.role !== "jackpot") return false;
  if (heat.effectiveTop != null) return heat.effectiveTop <= 0;
  if (heat.remainingUnknown === true) return false;
  return heat.grand <= 0;
}

/** Jackpot that still lists a retail top. Cold is allowed. Cash-out / bust / gone are not. */
export function hasListedJackpotTop(heat: HeatReport): boolean {
  if (heat.role !== "jackpot") return false;
  if (heat.bust || heat.band === "bust") return false;
  if (heat.effectiveTop != null) return heat.effectiveTop > 0;
  if (heat.remainingUnknown === true) return false;
  return heat.grand > 0;
}

function isListedLive(heat: HeatReport | undefined): heat is HeatReport {
  if (!heat) return false;
  if (heat.band === "new") return false;
  if (heat.bust || heat.band === "bust") return false;
  if (isRetailTopGone(heat)) return false;
  return true;
}

function deskPool(games: Game[], filter: PriceFilter): Game[] {
  return games.filter(
    (game) => isDeskPrice(game.price) && inPriceFilter(game, filter) && !isEndedGame(game),
  );
}

function skipRank(a: Game, b: Game, reports: Map<number, HeatReport>): number {
  const ha = reports.get(a.number);
  const hb = reports.get(b.number);
  return (ha ? deskScore(ha) : 0) - (hb ? deskScore(hb) : 0) || a.price - b.price;
}

function walkRows(games: Game[], reports: Map<number, HeatReport>): StrategyRow[] {
  return games.flatMap((game) => {
    const heat = reports.get(game.number);
    if (!heat) return [];
    return [{ game, heat, count: 0 }];
  });
}

function lookAtRows(
  picks: Game[],
  reports: Map<number, HeatReport>,
  counts: number[],
): StrategyRow[] {
  return picks.flatMap((game, i) => {
    const heat = reports.get(game.number);
    if (!heat) return [];
    return [{ game, heat, count: counts[i] ?? 0 }];
  });
}

function spendRoundRobin(
  picks: Game[],
  budget: number,
): { counts: number[]; stubs: number[] } {
  const counts = picks.map(() => 0);
  const stubs: number[] = [];
  let remaining = budget;
  if (!picks.length) return { counts, stubs };
  let guard = 0;
  while (guard++ < 10_000) {
    let progressed = false;
    for (let i = 0; i < picks.length; i++) {
      const price = picks[i].price;
      if (price > 0 && price <= remaining) {
        counts[i] += 1;
        remaining -= price;
        stubs.push(price);
        progressed = true;
      }
    }
    if (!progressed) break;
  }
  return { counts, stubs };
}

function spendConcentrate(
  picks: Game[],
  budget: number,
): { counts: number[]; stubs: number[] } {
  const counts = picks.map(() => 0);
  const stubs: number[] = [];
  let remaining = budget;
  for (let i = 0; i < picks.length; i++) {
    const price = picks[i].price;
    if (price <= 0) continue;
    while (price <= remaining) {
      counts[i] += 1;
      remaining -= price;
      stubs.push(price);
    }
  }
  return { counts, stubs };
}

function spendSplitThenCheapest(
  picks: Game[],
  budget: number,
): { counts: number[]; stubs: number[] } {
  const n = picks.length;
  const counts = picks.map(() => 0);
  const stubs: number[] = [];
  if (!n) return { counts, stubs };
  const share = Math.floor(budget / n);
  let rest = budget - share * n;
  for (let i = 0; i < n; i++) {
    const price = picks[i].price;
    if (price <= 0) continue;
    const k = Math.floor(share / price);
    counts[i] = k;
    for (let j = 0; j < k; j++) stubs.push(price);
    rest += share - k * price;
  }
  const order = picks
    .map((_, i) => i)
    .sort((a, b) => picks[a].price - picks[b].price || a - b);
  let guard = 0;
  while (rest > 0 && guard++ < 10_000) {
    let bought = false;
    for (const i of order) {
      const price = picks[i].price;
      if (price > 0 && price <= rest) {
        counts[i] += 1;
        rest -= price;
        stubs.push(price);
        bought = true;
        break;
      }
    }
    if (!bought) break;
  }
  return { counts, stubs };
}

function fitOf(rows: StrategyRow[], goal: StrategyGoal): number {
  let num = 0;
  let den = 0;
  for (const row of rows) {
    if (row.count <= 0) continue;
    const metric =
      goal === "mixed"
        ? deskScore(row.heat)
        : goal === "grand"
          ? row.heat.grand
          : (row.heat.medium + cashMix(row.heat)) / 2;
    num += metric * row.count;
    den += row.count;
  }
  return den ? num / den : 0;
}

function mixOf(rows: StrategyRow[]): { grand: number; medium: number; cash: number } {
  let grand = 0;
  let medium = 0;
  let cash = 0;
  let den = 0;
  for (const row of rows) {
    if (row.count <= 0) continue;
    grand += row.heat.grand * row.count;
    medium += row.heat.medium * row.count;
    cash += cashMix(row.heat) * row.count;
    den += row.count;
  }
  if (!den) return { grand: 0, medium: 0, cash: 0 };
  return { grand: grand / den, medium: medium / den, cash: cash / den };
}

function assemble(
  id: StrategyId,
  picks: Game[],
  walk: Game[],
  reports: Map<number, HeatReport>,
  budget: number,
  goal: StrategyGoal,
  spend: (picks: Game[], budget: number) => { counts: number[]; stubs: number[] },
): StrategyPlan {
  const empty = picks.length === 0;
  const { counts, stubs } = empty ? { counts: [] as number[], stubs: [] as number[] } : spend(picks, budget);
  const lookAt = empty ? [] : lookAtRows(picks, reports, counts);
  const spent = stubs.reduce((sum, price) => sum + price, 0);
  return {
    id,
    lookAt,
    walkPast: walkRows(walk, reports),
    stubs,
    spent,
    ticketCount: stubs.length,
    leftover: Math.max(0, budget - spent),
    fit: fitOf(lookAt, goal),
    empty,
    mix: mixOf(lookAt),
  };
}

function paceRank(band: HeatReport["paceBand"]): number {
  if (band === "fast") return 2;
  if (band === "moving") return 1;
  return 0;
}

function buildHeat(
  games: Game[],
  reports: Map<number, HeatReport>,
  filter: PriceFilter,
  budget: number,
  goal: StrategyGoal,
): StrategyPlan {
  const picks = pickTripGames(games, reports, filter, LOOK_AT);
  const walk = pickSkipGames(
    games,
    reports,
    filter,
    WALK_MAX,
    picks.map((game) => game.number),
  );
  return assemble("heat", picks, walk, reports, budget, goal, spendRoundRobin);
}

function buildGrand(
  games: Game[],
  reports: Map<number, HeatReport>,
  filter: PriceFilter,
  budget: number,
  goal: StrategyGoal,
): StrategyPlan {
  const pool = deskPool(games, filter);
  const picks = pool
    .filter((game) => {
      const heat = reports.get(game.number);
      return heat != null && heat.band !== "new" && hasListedJackpotTop(heat);
    })
    .sort((a, b) => {
      const ha = reports.get(a.number)!;
      const hb = reports.get(b.number)!;
      if (b.topPrize !== a.topPrize) return b.topPrize - a.topPrize;
      const aTop = ha.effectiveTop ?? 0;
      const bTop = hb.effectiveTop ?? 0;
      if (bTop !== aTop) return bTop - aTop;
      return deskScore(hb) - deskScore(ha);
    })
    .slice(0, LOOK_AT);
  const blocked = new Set(picks.map((game) => game.number));
  const walk = pool
    .filter((game) => {
      if (blocked.has(game.number)) return false;
      const heat = reports.get(game.number);
      if (!heat || heat.band === "new") return false;
      if (heat.role === "cash-out") return true;
      return (
        heat.role === "jackpot" &&
        (heat.bust || heat.band === "bust" || isRetailTopGone(heat))
      );
    })
    .sort((a, b) => skipRank(a, b, reports))
    .slice(0, WALK_MAX);
  return assemble("grand", picks, walk, reports, budget, goal, spendConcentrate);
}

function buildCash(
  games: Game[],
  reports: Map<number, HeatReport>,
  filter: PriceFilter,
  budget: number,
  goal: StrategyGoal,
): StrategyPlan {
  const pool = deskPool(games, filter);
  const picks = pool
    .filter((game) => {
      const heat = reports.get(game.number);
      if (!isListedLive(heat)) return false;
      return heat.medium + cashMix(heat) >= CASH_MIX_FLOOR;
    })
    .sort((a, b) => {
      const ha = reports.get(a.number)!;
      const hb = reports.get(b.number)!;
      const sa = ha.medium + cashMix(ha);
      const sb = hb.medium + cashMix(hb);
      if (sb !== sa) return sb - sa;
      return deskScore(hb) - deskScore(ha);
    })
    .slice(0, LOOK_AT);
  const blocked = new Set(picks.map((game) => game.number));
  const walk = pool
    .filter((game) => {
      if (blocked.has(game.number)) return false;
      const heat = reports.get(game.number);
      if (!heat || heat.role !== "jackpot") return false;
      return heat.medium + cashMix(heat) < CASH_MIX_FLOOR;
    })
    .sort((a, b) => skipRank(a, b, reports))
    .slice(0, WALK_MAX);
  return assemble("cash", picks, walk, reports, budget, goal, spendRoundRobin);
}

function buildFast(
  games: Game[],
  reports: Map<number, HeatReport>,
  filter: PriceFilter,
  budget: number,
  goal: StrategyGoal,
): StrategyPlan {
  const pool = deskPool(games, filter);
  const picks = pool
    .filter((game) => {
      const heat = reports.get(game.number);
      if (!isListedLive(heat)) return false;
      return heat.paceBand === "fast" || heat.paceBand === "moving";
    })
    .sort((a, b) => {
      const ha = reports.get(a.number)!;
      const hb = reports.get(b.number)!;
      const pace = paceRank(hb.paceBand) - paceRank(ha.paceBand);
      if (pace) return pace;
      const pa = ha.leftoverPct ?? -1;
      const pb = hb.leftoverPct ?? -1;
      if (pb !== pa) return pb - pa;
      return deskScore(hb) - deskScore(ha);
    })
    .slice(0, LOOK_AT);
  const blocked = new Set(picks.map((game) => game.number));
  const rest = pool.filter((game) => !blocked.has(game.number));
  const stillQuiet = rest.filter((game) => {
    const band = reports.get(game.number)?.paceBand;
    return band === "still" || band === "quiet";
  });
  const unknown = rest.filter((game) => {
    const band = reports.get(game.number)?.paceBand;
    return !band || band === "unknown";
  });
  stillQuiet.sort((a, b) => skipRank(a, b, reports));
  unknown.sort((a, b) => skipRank(a, b, reports));
  const walk = [...stillQuiet, ...unknown].slice(0, WALK_MAX);
  return assemble("fast", picks, walk, reports, budget, goal, spendRoundRobin);
}

function buildSpread(
  games: Game[],
  reports: Map<number, HeatReport>,
  filter: PriceFilter,
  budget: number,
  goal: StrategyGoal,
  heatPlan: StrategyPlan,
): StrategyPlan {
  const soldAll = soldPricePoints(games);
  const sold: PricePoint[] =
    filter === "all" ? soldAll : soldAll.filter((price) => String(price) === filter);
  const winners: Game[] = [];
  for (const price of sold) {
    const top = pickTripGames(games, reports, String(price) as PriceFilter, 1)[0];
    if (top) winners.push(top);
  }
  winners.sort((a, b) => {
    const ha = reports.get(a.number);
    const hb = reports.get(b.number);
    return (hb ? deskScore(hb) : 0) - (ha ? deskScore(ha) : 0) || a.price - b.price;
  });
  const picks = winners.slice(0, LOOK_AT);
  if (!picks.length) {
    return { ...heatPlan, id: "spread" };
  }
  const blocked = new Set(picks.map((game) => game.number));
  const prices = new Set(picks.map((game) => game.price));
  const walk = deskPool(games, filter)
    .filter((game) => prices.has(game.price) && !blocked.has(game.number))
    .filter((game) => isSkipCandidate(game, reports.get(game.number)))
    .sort((a, b) => skipRank(a, b, reports))
    .slice(0, WALK_MAX);
  return assemble("spread", picks, walk, reports, budget, goal, spendSplitThenCheapest);
}

export function redactStrategyHeat(heat: HeatReport): HeatReport {
  return {
    ...heat,
    topRemaining: null,
    effectiveTop: null,
    midRemaining: null,
    lowRemaining: null,
    leftoverPct: null,
    leftoverDaily: null,
    leftoverNow: null,
    mediumKnown: false,
  };
}

export function redactStrategyGame(game: Game): Game {
  return {
    ...game,
    tiers: game.tiers.map((tier) => ({ ...tier, remaining: null })),
  };
}

export function redactStrategyPlan(plan: StrategyPlan): StrategyPlan {
  return {
    ...plan,
    lookAt: plan.lookAt.map((row) => ({
      ...row,
      game: redactStrategyGame(row.game),
      heat: redactStrategyHeat(row.heat),
    })),
    walkPast: plan.walkPast.map((row) => ({
      ...row,
      game: redactStrategyGame(row.game),
      heat: redactStrategyHeat(row.heat),
    })),
  };
}

export type StrategyDeskInput = {
  games: Game[];
  reports: Map<number, HeatReport>;
  filter?: PriceFilter;
  budget?: number;
  goal?: StrategyGoal;
  locked?: boolean;
};

export function buildStrategyDesk(input: StrategyDeskInput): Record<StrategyId, StrategyPlan> {
  const filter = input.filter ?? "all";
  const budget = input.budget ?? 50;
  const goal = input.goal ?? "mixed";
  const games = input.games;
  const reports = input.reports;
  const heat = buildHeat(games, reports, filter, budget, goal);
  const plans: Record<StrategyId, StrategyPlan> = {
    heat,
    grand: buildGrand(games, reports, filter, budget, goal),
    cash: buildCash(games, reports, filter, budget, goal),
    fast: buildFast(games, reports, filter, budget, goal),
    spread: buildSpread(games, reports, filter, budget, goal, heat),
  };
  if (!input.locked) return plans;
  return {
    heat: redactStrategyPlan(plans.heat),
    grand: redactStrategyPlan(plans.grand),
    cash: redactStrategyPlan(plans.cash),
    fast: redactStrategyPlan(plans.fast),
    spread: redactStrategyPlan(plans.spread),
  };
}

export function pinStrategyDeskB(
  goal: StrategyGoal,
  deskA: StrategyId,
  deskB: StrategyId,
): StrategyId {
  if (goal === "grand" && deskA !== "grand" && deskB !== "grand") return "grand";
  if (goal === "cash" && deskA !== "cash" && deskB !== "cash") return "cash";
  return deskB;
}

export function strategyWinner(a: StrategyPlan, b: StrategyPlan): StrategyId {
  if (b.empty && !a.empty) return a.id;
  if (a.empty && !b.empty) return b.id;
  if (b.fit > a.fit) return b.id;
  return a.id;
}
