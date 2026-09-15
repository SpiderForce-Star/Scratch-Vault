import { describe, expect, it } from "vitest";
import {
  buildGamesBoard,
  isSkipCandidate,
  isSkipGame,
  pickSkipGames,
  pickTripGames,
  skipChipBand,
  soldPricePoints,
  sortGames,
  type HeatReport,
} from "./heat";
import { applyPace } from "./pace";
import { secondaryBandForPrice } from "./heat.server";
import type { Game } from "@/data/games";

const hot: HeatReport = {
  grand: 0, medium: 80, vault: 70, band: "hot", bust: false,
  mediumKnown: true, role: "jackpot", topRemaining: 0,
  effectiveTop: 0, midRemaining: 10, lowRemaining: null,
};
const cool: HeatReport = { ...hot, band: "cool", vault: 12, medium: 10 };
const bust: HeatReport = { ...hot, band: "bust", bust: true, vault: 0 };

function g(n: number, price: 5 | 10 | 30 | 50): Game {
  return {
    number: n, name: `G${n}`, price, topPrize: 100000, odds: 4,
    tiers: [{ amount: 100000, remaining: 0 }], source: "public-compiled",
    theme: "cash", stateId: "ky",
  };
}

describe("skip", () => {
  it("hot + grand 0 is not skip", () => {
    expect(isSkipGame(hot)).toBe(false);
  });
  it("cool and bust are skip", () => {
    expect(isSkipGame(cool)).toBe(true);
    expect(isSkipGame(bust)).toBe(true);
  });
  it("skip chip is never hot", () => {
    expect(skipChipBand(cool)).toBe("cool");
    expect(skipChipBand(bust)).toBe("bust");
  });
  it("pickSkipGames at $50 does not pad with $5", () => {
    const games = [g(1, 5), g(2, 5), g(3, 50)];
    const reports = new Map<number, HeatReport>([
      [1, hot],
      [2, cool],
      [3, hot],
    ]);
    expect(pickSkipGames(games, reports, "50", 5)).toEqual([]);
  });
  it("never returns hot/warm", () => {
    const games = [g(1, 10), g(2, 10)];
    const reports = new Map<number, HeatReport>([[1, hot], [2, cool]]);
    const out = pickSkipGames(games, reports, "10", 5);
    expect(out.map((x) => x.number)).toEqual([2]);
  });
  it("unknown remaining is not skip", () => {
    const unknown: HeatReport = {
      ...cool,
      topRemaining: null,
      midRemaining: null,
      remainingUnknown: true,
    };
    expect(isSkipGame(unknown)).toBe(false);
    expect(isSkipGame({ ...cool, topRemaining: null, midRemaining: null })).toBe(false);
    expect(isSkipGame({ ...cool, remainingUnknown: false, topRemaining: null, midRemaining: null })).toBe(true);
  });
  it("soldPricePoints is catalog intersect PRICE_POINTS", () => {
    expect(soldPricePoints([g(1, 5), g(2, 10), g(3, 50), g(4, 5)])).toEqual([5, 10, 50]);
  });
  it("ended KY Merry Multiplier is skip, not a review pick", () => {
    const merry = {
      ...g(107, 5),
      name: "Merry Multiplier",
      stateId: "ky",
    };
    expect(isSkipCandidate(merry, hot)).toBe(true);
    const games = [merry, g(153, 5)];
    const reports = new Map<number, HeatReport>([
      [107, hot],
      [153, hot],
    ]);
    expect(pickTripGames(games, reports, "5", 3).map((row) => row.number)).toEqual([153]);
    expect(pickSkipGames(games, reports, "5", 5).map((row) => row.number)).toEqual([107]);
  });
});

describe("leftover pace stickers", () => {
  const live: HeatReport = {
    grand: 40,
    medium: 50,
    vault: 55,
    deskScore: 55,
    band: "warm",
    bust: false,
    mediumKnown: true,
    role: "jackpot",
    topRemaining: 2,
    effectiveTop: 2,
    midRemaining: 20,
    lowRemaining: 100,
  };

  it("same vault + Fast lift can move Warm → Hot", () => {
    const next = applyPace(live, {
      band: "fast",
      leftoverPct: 9,
      leftoverDaily: 9 / 16,
      leftoverNow: 92,
      leftoverPrior: 100,
      days: 16,
      lift: 10,
    });
    expect(next.band).toBe("hot");
    expect(next.deskScore).toBe(65);
    expect(isSkipGame(next)).toBe(false);
  });

  it("same vault + Still lift can move Hot → Warm", () => {
    const next = applyPace(
      { ...live, vault: 64, deskScore: 64, band: "hot" },
      {
        band: "still",
        leftoverPct: 0.2,
        leftoverDaily: 0.2 / 16,
        leftoverNow: 100,
        leftoverPrior: 100,
        days: 16,
        lift: -3,
      },
    );
    expect(next.band).toBe("warm");
    expect(next.deskScore).toBe(61);
    expect(isSkipGame(next)).toBe(false);
  });

  it("bust stays bust", () => {
    const next = applyPace(
      { ...live, vault: 0, deskScore: 0, band: "bust", bust: true, effectiveTop: 0 },
      {
        band: "fast",
        leftoverPct: 12,
        leftoverDaily: 12 / 16,
        leftoverNow: 80,
        leftoverPrior: 100,
        days: 16,
        lift: -6,
      },
    );
    expect(next.band).toBe("bust");
    expect(next.bust).toBe(true);
    expect(isSkipGame(next)).toBe(true);
  });

  it("buildGamesBoard and heat sort stay on deskScore after pace", () => {
    const warm = g(153, 10);
    const hot = g(152, 10);
    const skip = g(151, 10);
    const reports = new Map<number, HeatReport>([
      [153, applyPace(live, { band: "quiet", leftoverPct: 1, leftoverDaily: 1 / 16, leftoverNow: 99, leftoverPrior: 100, days: 16, lift: 0 })],
      [152, applyPace({ ...live, vault: 55, deskScore: 55, band: "warm" }, { band: "fast", leftoverPct: 9, leftoverDaily: 9 / 16, leftoverNow: 92, leftoverPrior: 100, days: 16, lift: 10 })],
      [151, { ...bust, deskScore: 0 }],
    ]);
    expect(sortGames([warm, hot, skip], "heat", reports).map((row) => row.number)).toEqual([152, 153, 151]);
    const board = buildGamesBoard([warm, hot, skip], reports, 10);
    expect(board.hot.map((row) => row.number)).toEqual([152]);
    expect(board.warm.map((row) => row.number)).toEqual([153]);
    expect(board.skip.map((row) => row.number)).toEqual([151]);
  });
});

describe("price-scaled secondary bands", () => {
  it("keeps $5 / $10 / $20 and adds $25 / $30 / $50", () => {
    expect(secondaryBandForPrice(5)).toEqual({ min: 3_000, max: 7_000 });
    expect(secondaryBandForPrice(10)).toEqual({ min: 5_000, max: 10_000 });
    expect(secondaryBandForPrice(20)).toEqual({ min: 10_000, max: 40_000 });
    expect(secondaryBandForPrice(25)).toEqual({ min: 10_000, max: 50_000 });
    expect(secondaryBandForPrice(30)).toEqual({ min: 15_000, max: 75_000 });
    expect(secondaryBandForPrice(50)).toEqual({ min: 25_000, max: 100_000 });
    expect(secondaryBandForPrice(1)).toBeNull();
    expect(secondaryBandForPrice(3)).toBeNull();
  });
});

describe("game list ranking", () => {
  it("heat sort uses leftover-pace deskScore, not vault alone", () => {
    const a = g(1, 10);
    const b = g(2, 10);
    const reports = new Map<number, HeatReport>([
      [1, { ...hot, vault: 50, deskScore: 47 }],
      [2, { ...hot, vault: 50, deskScore: 60 }],
    ]);
    expect(sortGames([a, b], "heat", reports).map((row) => row.number)).toEqual([2, 1]);
  });
});
