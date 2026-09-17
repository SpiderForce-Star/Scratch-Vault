import { describe, expect, it } from "vitest";
import type { Game } from "@/data/games";
import type { HeatReport } from "./heat";
import {
  applyPace,
  leftoverBook,
  overlapLeftover,
  paceBandFromPct16,
  scoreCatalogPace,
  scoreGamePace,
} from "./pace";

function game(
  number: number,
  tiers: { amount: number; remaining: number | null }[],
): Game {
  return {
    number,
    name: `G${number}`,
    price: 10,
    topPrize: tiers[0]?.amount ?? 500,
    odds: 4,
    tiers,
    source: "official-remaining",
    theme: "cash",
    stateId: "ky",
  };
}

const baseHeat: HeatReport = {
  grand: 40,
  medium: 50,
  vault: 48,
  deskScore: 48,
  band: "warm",
  bust: false,
  mediumKnown: true,
  role: "jackpot",
  topRemaining: 2,
  effectiveTop: 2,
  midRemaining: 20,
  lowRemaining: 100,
};

describe("leftover overlap", () => {
  it("ignores missing live tiers (not decay)", () => {
    const prior = game(1, [
      { amount: 500, remaining: 100 },
      { amount: 100, remaining: 1000 },
      { amount: 50, remaining: 5000 },
    ]);
    const live = game(1, [{ amount: 500, remaining: 90 }]);
    const overlap = overlapLeftover(prior, live);
    expect(overlap).toEqual({ prior: 100, now: 90, pct: 10 });
  });

  it("does not count sub-$50 rows", () => {
    const g = game(2, [
      { amount: 500, remaining: 10 },
      { amount: 20, remaining: 9999 },
    ]);
    expect([...leftoverBook(g).keys()]).toEqual([500]);
  });

  it("uses more than three $50+ rows when published", () => {
    const prior = game(1, [
      { amount: 200_000, remaining: 2 },
      { amount: 10_000, remaining: 10 },
      { amount: 5_000, remaining: 20 },
      { amount: 1_000, remaining: 30 },
      { amount: 500, remaining: 40 },
      { amount: 100, remaining: 50 },
      { amount: 50, remaining: 60 },
    ]);
    const live = game(1, [
      { amount: 200_000, remaining: 2 },
      { amount: 10_000, remaining: 8 },
      { amount: 5_000, remaining: 18 },
      { amount: 1_000, remaining: 28 },
      { amount: 500, remaining: 38 },
      { amount: 100, remaining: 48 },
      { amount: 50, remaining: 58 },
    ]);
    expect(leftoverBook(live).size).toBe(7);
    const overlap = overlapLeftover(prior, live);
    expect(overlap?.prior).toBe(2 + 10 + 20 + 30 + 40 + 50 + 60);
    expect(overlap?.now).toBe(2 + 8 + 18 + 28 + 38 + 48 + 58);
  });
});

describe("pace bands (16-day equivalent)", () => {
  it("still / quiet / moving / fast", () => {
    expect(paceBandFromPct16(0.2)).toBe("still");
    expect(paceBandFromPct16(1)).toBe("quiet");
    expect(paceBandFromPct16(4)).toBe("moving");
    expect(paceBandFromPct16(9)).toBe("fast");
  });

  it("normalizes a 16-day 8% drop to fast", () => {
    const prior = game(3, [{ amount: 500, remaining: 100 }]);
    const live = game(3, [{ amount: 500, remaining: 92 }]);
    const pace = scoreGamePace(prior, live, 16, baseHeat);
    expect(pace.band).toBe("fast");
    expect(pace.leftoverPct).toBeCloseTo(8, 5);
    expect(pace.lift).toBe(10);
  });

  it("unknown when no prior catalog", () => {
    const live = game(4, [{ amount: 500, remaining: 92 }]);
    const pace = scoreGamePace(undefined, live, 16, baseHeat);
    expect(pace.band).toBe("unknown");
    expect(pace.lift).toBe(0);
  });
});

describe("heat blend", () => {
  it("deskScore includes leftover pace lift and does not replace vault", () => {
    const next = applyPace(baseHeat, {
      band: "fast",
      leftoverPct: 9,
      leftoverDaily: 9 / 16,
      leftoverNow: 92,
      leftoverPrior: 100,
      days: 16,
      lift: 10,
    });
    expect(next.vault).toBe(48);
    expect(next.deskScore).toBe(58);
    expect(next.paceBand).toBe("fast");
  });

  it("same vault + Fast lift can move Warm → Hot", () => {
    const warm: HeatReport = { ...baseHeat, vault: 55, deskScore: 55, band: "warm" };
    const next = applyPace(warm, {
      band: "fast",
      leftoverPct: 9,
      leftoverDaily: 9 / 16,
      leftoverNow: 92,
      leftoverPrior: 100,
      days: 16,
      lift: 10,
    });
    expect(next.vault).toBe(55);
    expect(next.deskScore).toBe(65);
    expect(next.band).toBe("hot");
    expect(next.bust).toBe(false);
  });

  it("same vault + Still lift can move Hot → Warm", () => {
    const hot: HeatReport = { ...baseHeat, vault: 64, deskScore: 64, band: "hot" };
    const next = applyPace(hot, {
      band: "still",
      leftoverPct: 0.2,
      leftoverDaily: 0.2 / 16,
      leftoverNow: 100,
      leftoverPrior: 100,
      days: 16,
      lift: -3,
    });
    expect(next.vault).toBe(64);
    expect(next.deskScore).toBe(61);
    expect(next.band).toBe("warm");
  });

  it("bust stays bust — leftover pace never promotes Skip", () => {
    const bust: HeatReport = {
      ...baseHeat,
      vault: 0,
      deskScore: 0,
      band: "bust",
      bust: true,
      effectiveTop: 0,
      topRemaining: 0,
    };
    const next = applyPace(bust, {
      band: "fast",
      leftoverPct: 12,
      leftoverDaily: 12 / 16,
      leftoverNow: 80,
      leftoverPrior: 100,
      days: 16,
      lift: -6,
    });
    expect(next.band).toBe("bust");
    expect(next.bust).toBe(true);
  });

  it("Cold / Skip stays Skip even with Fast leftover", () => {
    const cold: HeatReport = { ...baseHeat, vault: 40, deskScore: 40, band: "cool" };
    const next = applyPace(cold, {
      band: "fast",
      leftoverPct: 10,
      leftoverDaily: 10 / 16,
      leftoverNow: 90,
      leftoverPrior: 100,
      days: 16,
      lift: 10,
    });
    expect(next.deskScore).toBe(50);
    expect(next.band).toBe("cool");
  });

  it("NEW stays NEW and leftover pace stays unknown", () => {
    const fresh: HeatReport = {
      ...baseHeat,
      vault: 0,
      deskScore: 0,
      band: "new",
      remainingUnknown: true,
      topRemaining: null,
      effectiveTop: null,
      midRemaining: null,
    };
    const next = applyPace(fresh, {
      band: "fast",
      leftoverPct: 10,
      leftoverDaily: 10 / 16,
      leftoverNow: 90,
      leftoverPrior: 100,
      days: 16,
      lift: 10,
    });
    expect(next.band).toBe("new");
    expect(next.paceBand).toBe("unknown");
    expect(next.deskScore).toBe(0);
  });

  it("fast leftover ranks above still leftover at the same vault", () => {
    const stillPrior = game(1, [{ amount: 500, remaining: 100 }]);
    const stillNow = game(1, [{ amount: 500, remaining: 100 }]);
    const fastPrior = game(2, [{ amount: 500, remaining: 100 }]);
    const fastNow = game(2, [{ amount: 500, remaining: 90 }]);
    const tied: HeatReport = { ...baseHeat, vault: 50, deskScore: 50 };
    const next = scoreCatalogPace(
      [stillPrior, fastPrior],
      [stillNow, fastNow],
      16,
      new Map([
        [1, { ...tied }],
        [2, { ...tied }],
      ]),
    );
    expect(next.get(2)!.deskScore!).toBeGreaterThan(next.get(1)!.deskScore!);
    expect(next.get(2)!.paceBand).toBe("fast");
    expect(next.get(1)!.paceBand).toBe("still");
  });
});
