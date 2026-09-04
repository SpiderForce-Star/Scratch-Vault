import { describe, expect, it } from "vitest";
import {
  isSkipGame,
  pickSkipGames,
  skipChipBand,
  type HeatReport,
} from "./heat";
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
});
