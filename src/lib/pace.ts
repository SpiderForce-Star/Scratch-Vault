import type { Game } from "@/data/games";
import type { HeatReport } from "./heat";

/**
 * Leftover-prize decay (claims), not tickets sold and not odds.
 * Overlap $50+ prize amounts that exist on both snapshots.
 */
export type PaceBand = "unknown" | "still" | "quiet" | "moving" | "fast";

export type PaceReport = {
  band: PaceBand;
  /** 16-day equivalent leftover % drop (claims). Null when unknown. */
  leftoverPct: number | null;
  leftoverDaily: number | null;
  leftoverNow: number | null;
  leftoverPrior: number | null;
  days: number | null;
  /** Additive lift applied to Heat (vault). Does not change printed odds. */
  lift: number;
};

export const EMPTY_PACE: PaceReport = {
  band: "unknown",
  leftoverPct: null,
  leftoverDaily: null,
  leftoverNow: null,
  leftoverPrior: null,
  days: null,
  lift: 0,
};

const BOOK_MIN = 50;

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

/** Remaining on prize rows of $50+ (overlap-ready). */
export function leftoverBook(game: Game): Map<number, number> {
  const map = new Map<number, number>();
  for (const tier of game.tiers) {
    if (tier.amount < BOOK_MIN) continue;
    if (tier.remaining == null) continue;
    map.set(tier.amount, Math.max(0, tier.remaining));
  }
  return map;
}

export function leftoverTotal(game: Game): number | null {
  const book = leftoverBook(game);
  if (!book.size) return null;
  let sum = 0;
  for (const n of book.values()) sum += n;
  return sum;
}

export function daysBetween(fromIso: string | null | undefined, toIso: string | null | undefined): number | null {
  if (!fromIso || !toIso) return null;
  const a = Date.parse(fromIso);
  const b = Date.parse(toIso);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null;
  return (b - a) / 86_400_000;
}

/**
 * Overlap leftover drop. Missing live tiers are ignored (not treated as decay).
 * Returns null when there is no shared $50+ book.
 */
export function overlapLeftover(
  prior: Game,
  current: Game,
): { prior: number; now: number; pct: number } | null {
  const oldBook = leftoverBook(prior);
  const newBook = leftoverBook(current);
  let priorSum = 0;
  let nowSum = 0;
  let shared = 0;
  for (const [amount, oldRem] of oldBook) {
    const nowRem = newBook.get(amount);
    if (nowRem == null) continue;
    shared += 1;
    priorSum += oldRem;
    nowSum += nowRem;
  }
  if (!shared || priorSum <= 0) return null;
  const pct = ((priorSum - nowSum) / priorSum) * 100;
  return { prior: priorSum, now: nowSum, pct };
}

/** Band leftover % as if it were a 16-day window so labels stay stable. */
export function paceBandFromPct16(pct16: number): PaceBand {
  if (pct16 >= 8) return "fast";
  if (pct16 >= 3) return "moving";
  if (pct16 > 0.5) return "quiet";
  return "still";
}

export function paceLift(band: PaceBand, heat: HeatReport): number {
  const retail =
    !heat.bust &&
    heat.band !== "new" &&
    (heat.effectiveTop == null || heat.effectiveTop > 0);
  if (band === "fast") return retail ? 10 : -6;
  if (band === "moving") return retail ? 6 : 0;
  if (band === "quiet") return 0;
  if (band === "still") return retail ? -3 : 0;
  return 0;
}

export function scoreGamePace(
  prior: Game | undefined,
  current: Game,
  days: number | null,
  heat: HeatReport,
): PaceReport {
  if (heat.band === "new") return { ...EMPTY_PACE, band: "unknown" };
  if (!prior) return { ...EMPTY_PACE };
  const overlap = overlapLeftover(prior, current);
  if (!overlap) return { ...EMPTY_PACE, leftoverNow: leftoverTotal(current) };

  const windowDays = days != null && days >= 0.5 ? days : null;
  const daily = windowDays ? overlap.pct / windowDays : overlap.pct;
  const pct16 = windowDays ? daily * 16 : overlap.pct;
  const band = paceBandFromPct16(pct16);
  const lift = paceLift(band, heat);
  return {
    band,
    leftoverPct: pct16,
    leftoverDaily: daily,
    leftoverNow: overlap.now,
    leftoverPrior: overlap.prior,
    days: windowDays,
    lift,
  };
}

export function applyPace(heat: HeatReport, pace: PaceReport): HeatReport {
  const deskScore = clamp((heat.deskScore ?? heat.vault) + pace.lift);
  return {
    ...heat,
    paceBand: pace.band,
    leftoverPct: pace.leftoverPct,
    leftoverDaily: pace.leftoverDaily,
    leftoverNow: pace.leftoverNow,
    leftoverDays: pace.days,
    deskScore,
  };
}

export function scoreCatalogPace(
  prior: Game[] | null | undefined,
  current: Game[],
  days: number | null,
  reports: Map<number, HeatReport>,
): Map<number, HeatReport> {
  const priorByNumber = new Map((prior ?? []).map((game) => [game.number, game]));
  const next = new Map<number, HeatReport>();
  for (const game of current) {
    const heat = reports.get(game.number);
    if (!heat) continue;
    const pace = scoreGamePace(priorByNumber.get(game.number), game, days, heat);
    next.set(game.number, applyPace(heat, pace));
  }
  return next;
}

export function displayedHeat(heat: HeatReport): number {
  return Math.round(heat.deskScore ?? heat.vault);
}
