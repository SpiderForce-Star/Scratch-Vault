import type { Game, PrizeTier } from "@/data/games";
import type {
  CashBlip,
  DeskPick,
  DeskReview,
  GameRole,
  HeatBand,
  HeatContext,
  HeatReport,
  PriceFilter,
  TonightCard,
} from "./heat";

/** Keep this inlined so Node tests can import this file without Vite aliases. */
const DEFAULT_HEAT: HeatContext = {
  topHoldback: 1,
  holdbackLabel: "Play It Again",
};

function isOfficialSource(source: Game["source"]): boolean {
  return source === "tn-remaining" || source === "official-remaining";
}

const PRICE_POINTS = [5, 10, 20, 25, 30, 50] as const;

function inPriceFilter(game: Game, filter: PriceFilter): boolean {
  if (filter === "all") return true;
  return game.price === Number(filter);
}

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

export function gameRole(game: Game): GameRole {
  const top = game.tiers[0]?.amount ?? game.topPrize;
  return top <= game.price * 120 ? "cash-out" : "jackpot";
}

function isTopTier(game: Game, tier: PrizeTier, index: number): boolean {
  return index === 0 || tier.amount === game.topPrize;
}

/** $10–$50 "won a ticket" rows — not mid-tier, not radar cash. */
function isTicketNoise(game: Game, tier: PrizeTier, index: number): boolean {
  if (isTopTier(game, tier, index)) return false;
  return tier.amount <= 50;
}

function isCashPrize(tier: PrizeTier): boolean {
  return tier.amount >= 50 && tier.amount <= 3_000;
}

function isMidPrize(game: Game, tier: PrizeTier, index: number): boolean {
  if (isTopTier(game, tier, index)) return false;
  if (isTicketNoise(game, tier, index)) return false;
  return tier.amount > 3_000 && tier.amount < game.topPrize;
}

/** Price-scaled secondary bands. Other ticket prices have no extra Medium weight. */
export function secondaryBandForPrice(
  price: number,
): { min: number; max: number } | null {
  if (price === 5) return { min: 3_000, max: 7_000 };
  if (price === 10) return { min: 5_000, max: 10_000 };
  if (price === 20) return { min: 10_000, max: 40_000 };
  return null;
}

function inSecondaryBand(game: Game, tier: PrizeTier, index: number): boolean {
  const band = secondaryBandForPrice(game.price);
  if (!band) return false;
  if (isTopTier(game, tier, index)) return false;
  return tier.amount >= band.min && tier.amount <= band.max;
}

/** Remaining prizes inside the price-scaled secondary band, or null if none published. */
export function secondaryRemaining(game: Game): number | null {
  if (!secondaryBandForPrice(game.price)) return null;
  const rows = game.tiers.filter((tier, i) => inSecondaryBand(game, tier, i));
  if (!rows.length) return null;
  return sumRemaining(rows);
}

function sumRemaining(tiers: PrizeTier[]): number | null {
  let known = false;
  let total = 0;
  for (const tier of tiers) {
    if (tier.remaining == null) continue;
    known = true;
    total += Math.max(0, tier.remaining);
  }
  return known ? total : null;
}

export function scoreGame(
  game: Game,
  ctx: HeatContext = DEFAULT_HEAT,
): HeatReport {
  const role = gameRole(game);
  const top = game.tiers[0];
  const topRemaining = top?.remaining ?? null;
  const holdback = Math.max(0, ctx.topHoldback);

  const effectiveTop =
    topRemaining == null
      ? null
      : role === "cash-out"
        ? topRemaining
        : Math.max(0, topRemaining - holdback);

  const midTiers = game.tiers.filter((tier, i) => isMidPrize(game, tier, i));
  const cashTiers = game.tiers.filter((tier, i) => {
    if (isTicketNoise(game, tier, i)) return false;
    if (role === "cash-out" && isTopTier(game, tier, i)) return true;
    if (isTopTier(game, tier, i)) return false;
    return isCashPrize(tier) && !isMidPrize(game, tier, i);
  });

  const midRemaining = sumRemaining(midTiers);
  const lowRemaining = sumRemaining(cashTiers);
  const mediumKnown = midRemaining != null || lowRemaining != null;

  let grand = 35;
  if (role === "cash-out") {
    grand = 22;
  } else if (effectiveTop == null) {
    grand = 35;
  } else if (effectiveTop <= 0) {
    grand = 0;
  } else {
    const size = Math.log10(Math.max(game.topPrize, 10));
    grand = clamp(16 + Math.min(effectiveTop, 12) * 7 + size * 4);
  }

  let medium = 36;
  if (midRemaining != null) {
    medium = clamp(8 + Math.min(midRemaining, 120) * 0.7);
  } else if (role === "cash-out" && topRemaining != null) {
    medium = clamp(18 + Math.min(topRemaining / game.price, 80) * 0.95);
  } else if (effectiveTop != null) {
    medium = clamp(24 + Math.min(effectiveTop, 6) * 6);
  }

  const secondaryLeft = secondaryRemaining(game);
  if (secondaryLeft != null && secondaryLeft > 0) {
    // Dedicated lift so $5 / $10 / $20 in-band remaining is a real Medium bump
    // (20 remaining → +17), on top of existing mid-tier scoring.
    const boost = 8 + Math.min(secondaryLeft, 40) * 0.45;
    medium = clamp(medium + boost);
  }

  let cash = 28;
  if (lowRemaining != null) {
    cash = clamp(10 + Math.min(lowRemaining, 400) * 0.18);
  } else if (role === "cash-out" && topRemaining != null) {
    cash = clamp(16 + Math.min(topRemaining, 80) * 0.7);
  }

  const secondaryGone = secondaryLeft != null && secondaryLeft <= 0;
  const bust =
    role === "jackpot" &&
    effectiveTop != null &&
    effectiveTop <= 0 &&
    ((midRemaining != null && midRemaining <= 2) || secondaryGone);

  const vault = bust ? 0 : clamp(grand * 0.28 + medium * 0.42 + cash * 0.3);

  let band: HeatBand = "cool";
  if (bust) band = "bust";
  else if (vault >= 62 || medium >= 68 || cash >= 72) band = "hot";
  else if (vault >= 42 || medium >= 44 || cash >= 50) band = "warm";

  return {
    grand,
    medium,
    vault,
    band,
    bust,
    mediumKnown,
    role,
    topRemaining,
    effectiveTop,
    midRemaining,
    lowRemaining,
  };
}

/** Strip mid/low remaining so only public fields remain. */
export function publicGame(game: Game): Game {
  return {
    ...game,
    tiers: game.tiers.map((tier, i) => ({
      ...tier,
      remaining: i === 0 ? tier.remaining : null,
    })),
  };
}

/** Guest scorer: price, top prize, and top-tier remaining only. */
export function scoreGamePublic(
  game: Game,
  ctx: HeatContext = DEFAULT_HEAT,
): HeatReport {
  return scoreGame(publicGame(game), ctx);
}

function hasRetailTop(heat: HeatReport): boolean {
  if (heat.bust) return false;
  if (heat.effectiveTop != null && heat.effectiveTop <= 0) return false;
  return true;
}

/**
 * Top remaining-heat games for the desk strip.
 * Uses existing scoreGame / secondary-band remaining. Does not change odds.
 */
export function pickTonightHeat(
  games: Game[],
  reports: Map<number, HeatReport>,
  limit = 3,
): { cards: TonightCard[]; depleted: boolean } {
  const rows = games.flatMap((game) => {
    const heat = reports.get(game.number);
    if (!heat) return [];
    return [
      {
        game,
        heat,
        secondary: secondaryRemaining(game),
      },
    ];
  });

  const live = rows.filter((row) => hasRetailTop(row.heat));
  const depleted = live.length === 0;
  const pool = depleted ? rows : live;

  pool.sort((a, b) => {
    if (a.heat.bust !== b.heat.bust) return a.heat.bust ? 1 : -1;
    const aTop = a.heat.effectiveTop != null && a.heat.effectiveTop > 0 ? 1 : 0;
    const bTop = b.heat.effectiveTop != null && b.heat.effectiveTop > 0 ? 1 : 0;
    if (aTop !== bTop) return bTop - aTop;
    const aSec = a.secondary ?? -1;
    const bSec = b.secondary ?? -1;
    if (bSec !== aSec) return bSec - aSec;
    return b.heat.vault - a.heat.vault;
  });

  const cards: TonightCard[] = pool.slice(0, Math.min(limit, pool.length)).map((row) => ({
    number: row.game.number,
    name: row.game.name,
    price: row.game.price,
    band: row.heat.band,
    effectiveTop: row.heat.effectiveTop,
    secondaryRemaining:
      row.secondary != null && row.secondary > 0 ? row.secondary : null,
  }));

  return { cards, depleted };
}

export const pickTonight = pickTonightHeat;

export function catalogHeat(
  games: Game[],
  score: (game: Game) => HeatReport = scoreGame,
): {
  grand: number;
  medium: number;
  busts: number;
  games: number;
} {
  if (!games.length) return { grand: 0, medium: 0, busts: 0, games: 0 };
  let grand = 0;
  let medium = 0;
  let busts = 0;
  for (const game of games) {
    const report = score(game);
    grand += report.grand;
    medium += report.medium;
    if (report.bust) busts += 1;
  }
  return {
    grand: grand / games.length,
    medium: medium / games.length,
    busts,
    games: games.length,
  };
}

function shortGameName(name: string): string {
  const trimmed = name.replace(/^\$[\d,]+(?:\s+)?/, "").trim();
  if (trimmed.length <= 16) return trimmed || name;
  return `${trimmed.slice(0, 15).trim()}…`;
}

function liveRadarTiers(game: Game): PrizeTier[] {
  const role = gameRole(game);
  const live: PrizeTier[] = [];
  for (let i = 0; i < game.tiers.length; i++) {
    const tier = game.tiers[i];
    if (tier.remaining == null || tier.remaining <= 0) continue;
    if (isTicketNoise(game, tier, i)) continue;
    const top = isTopTier(game, tier, i);
    if (top) {
      live.push(tier);
      continue;
    }
    if (isCashPrize(tier) || isMidPrize(game, tier, i) || role === "cash-out") {
      live.push(tier);
    }
  }
  return live;
}

/** Spread remaining-prize blips across $5–$50. One live row can yield several amounts. */
export function cashBlips(games: Game[], count = 12): CashBlip[] {
  const buckets = new Map<number, Omit<CashBlip, "angle" | "radius">[]>();
  for (const price of PRICE_POINTS) buckets.set(price, []);

  for (const game of games) {
    const bucket = buckets.get(game.price);
    if (!bucket) continue;
    for (const tier of liveRadarTiers(game)) {
      bucket.push({
        id: `${game.number}-${tier.amount}`,
        gameId: game.number,
        name: shortGameName(game.name),
        amount: tier.amount,
        remaining: tier.remaining,
      });
    }
  }

  for (const list of buckets.values()) {
    list.sort((a, b) => (b.remaining ?? 0) - (a.remaining ?? 0) || b.amount - a.amount);
  }

  const picked: Omit<CashBlip, "angle" | "radius">[] = [];
  let guard = 0;
  while (picked.length < count && guard < count * PRICE_POINTS.length) {
    const price = PRICE_POINTS[guard % PRICE_POINTS.length];
    const next = buckets.get(price)?.shift();
    if (next) picked.push(next);
    guard += 1;
  }

  return picked.map((blip, i) => ({
    ...blip,
    angle: (i * 360) / Math.max(count, picked.length || 1) + 18 + (blip.gameId % 17),
    radius: 0.52 + (i % 3) * 0.1,
  }));
}

export function buildDesk(
  games: Game[],
  reports: Map<number, HeatReport>,
  ctx: HeatContext = DEFAULT_HEAT,
): DeskReview {
  const rows = games.map((game) => ({ game, heat: reports.get(game.number)! }));
  const holdbackLabel = ctx.holdbackLabel;
  const usesHoldback = ctx.topHoldback > 0 && Boolean(holdbackLabel);

  const why = (g: Game, h: HeatReport): string => {
    if (h.role === "cash-out" && h.topRemaining != null) {
      return `${h.topRemaining.toLocaleString()} cash prizes of $${g.topPrize.toLocaleString()} still posted`;
    }
    if (h.mediumKnown && h.midRemaining != null) {
      return `${h.effectiveTop ?? "—"} retail top · ${h.midRemaining.toLocaleString()} mid-tier left`;
    }
    if (h.effectiveTop != null) {
      if (usesHoldback) {
        return `${h.effectiveTop} effective top prize${h.effectiveTop === 1 ? "" : "s"} after ${holdbackLabel} holdback`;
      }
      return `${h.effectiveTop} posted top prize${h.effectiveTop === 1 ? "" : "s"} still listed`;
    }
    return "Published remaining count is thin";
  };

  const pick = (list: typeof rows): DeskPick | null => {
    const live = list.filter((r) => !r.heat.bust);
    if (!live.length) return null;
    live.sort((a, b) => b.heat.vault - a.heat.vault);
    const best = live[0];
    return { ...best, why: why(best.game, best.heat) };
  };

  const prices: { key: PriceFilter; label: string }[] = PRICE_POINTS.map((p) => ({
    key: String(p) as PriceFilter,
    label: `$${p}`,
  }));

  const byPrice = prices.map((p) => ({
    price: p.label,
    pick: pick(rows.filter((r) => inPriceFilter(r.game, p.key))),
  }));

  const mediumLeaders = [...rows]
    .filter((r) => !r.heat.bust)
    .sort((a, b) => b.heat.medium - a.heat.medium)
    .slice(0, 5)
    .map((r) => ({ ...r, why: why(r.game, r.heat) }));

  const avoid = rows
    .filter((r) => r.heat.bust || (r.heat.effectiveTop === 0 && r.heat.role === "jackpot"))
    .sort((a, b) => a.heat.vault - b.heat.vault)
    .slice(0, 8)
    .map((r) => ({
      ...r,
      why:
        r.heat.effectiveTop === 0
          ? usesHoldback
            ? `No retail top prize after the ${holdbackLabel} holdback`
            : "No posted top prize still listed"
          : "Depleted mid-tier and jackpot",
    }));

  const official = rows
    .filter((r) => isOfficialSource(r.game.source))
    .sort((a, b) => b.heat.vault - a.heat.vault)
    .map((r) => ({ ...r, why: why(r.game, r.heat) }));

  return {
    byPrice,
    mediumLeaders,
    avoid,
    official,
    stats: {
      games: games.length,
      retailJackpots: rows.filter(
        (r) => r.heat.role === "jackpot" && (r.heat.effectiveTop ?? 0) > 0,
      ).length,
      cashOuts: rows.filter((r) => r.heat.role === "cash-out").length,
      busts: rows.filter((r) => r.heat.bust).length,
      officialTiers: rows.filter((r) => isOfficialSource(r.game.source)).length,
    },
  };
}
