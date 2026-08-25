import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SANDBOX_STRIPE_PRICES,
  STRIPE_PRICES,
  resolveStripePrices,
} from "../src/lib/stripe.prices.ts";
import {
  buildDesk,
  cashBlips,
  catalogHeat,
  publicGame,
  scoreGame,
  scoreGamePublic,
  secondaryBandForPrice,
  secondaryRemaining,
  pickTonightHeat,
} from "../src/lib/heat.server.ts";

function fixture(overrides = {}) {
  return {
    number: 1001,
    name: "Fixture Jackpot",
    price: 10,
    topPrize: 200_000,
    odds: 4,
    tiers: [
      { amount: 200_000, remaining: 1 },
      { amount: 5_000, remaining: 80 },
      { amount: 500, remaining: 200 },
    ],
    source: "tn-remaining",
    theme: "cash",
    ...overrides,
  };
}

test("live checkout refuses missing price IDs", () => {
  assert.throws(
    () =>
      resolveStripePrices({
        mode: "live",
        monthly: "",
        annual: STRIPE_PRICES.annual,
      }),
    /requires STRIPE_PRICE_MONTHLY and STRIPE_PRICE_ANNUAL/,
  );
});

test("live checkout refuses sandbox price IDs", () => {
  assert.throws(
    () =>
      resolveStripePrices({
        mode: "live",
        monthly: SANDBOX_STRIPE_PRICES.monthly,
        annual: SANDBOX_STRIPE_PRICES.annual,
      }),
    /cannot use sandbox price IDs/,
  );
});

test("unknown key mode also refuses missing prices", () => {
  assert.throws(
    () => resolveStripePrices({ mode: "unknown", monthly: "", annual: "" }),
    /requires STRIPE_PRICE_MONTHLY and STRIPE_PRICE_ANNUAL/,
  );
});

test("test keys fall back to sandbox and refuse live IDs", () => {
  const fallback = resolveStripePrices({ mode: "test", monthly: "", annual: "" });
  assert.deepEqual(fallback, { ...SANDBOX_STRIPE_PRICES });
  assert.throws(
    () =>
      resolveStripePrices({
        mode: "test",
        monthly: STRIPE_PRICES.monthly,
        annual: STRIPE_PRICES.annual,
      }),
    /cannot use live price IDs/,
  );
});

test("live checkout accepts explicit live env IDs", () => {
  const resolved = resolveStripePrices({
    mode: "live",
    monthly: STRIPE_PRICES.monthly,
    annual: STRIPE_PRICES.annual,
  });
  assert.deepEqual(resolved, { ...STRIPE_PRICES });
});

test("scoreGamePublic never returns mid or low remaining", () => {
  const paid = scoreGame(fixture());
  const guest = scoreGamePublic(fixture());
  assert.equal(paid.midRemaining, 80);
  assert.equal(paid.lowRemaining, 200);
  assert.equal(guest.midRemaining, null);
  assert.equal(guest.lowRemaining, null);
  assert.equal(guest.mediumKnown, false);
  assert.equal(guest.topRemaining, 1);
});

test("guest scores ignore paid mid-tier data", () => {
  const richMid = fixture({ number: 1, tiers: [
    { amount: 200_000, remaining: 1 },
    { amount: 5_000, remaining: 80 },
    { amount: 500, remaining: 200 },
  ]});
  const paid = scoreGame(richMid);
  const guest = scoreGamePublic(richMid);
  assert.notEqual(guest.medium, paid.medium);
  assert.notEqual(guest.vault, paid.vault);
  assert.equal(guest.medium, scoreGame(publicGame(richMid)).medium);
});

test("unknown mid is not a bust", () => {
  const drainedTop = fixture({
    tiers: [
      { amount: 200_000, remaining: 1 },
      { amount: 5_000, remaining: null },
      { amount: 500, remaining: null },
    ],
  });
  const report = scoreGame(drainedTop);
  assert.equal(report.effectiveTop, 0);
  assert.equal(report.midRemaining, null);
  assert.equal(report.bust, false);
  assert.equal(scoreGamePublic(drainedTop).bust, false);
});

test("known drained mid is still a paid bust", () => {
  const drained = fixture({
    tiers: [
      { amount: 200_000, remaining: 1 },
      { amount: 5_000, remaining: 1 },
      { amount: 500, remaining: 0 },
    ],
  });
  assert.equal(scoreGame(drained).bust, true);
  assert.equal(scoreGamePublic(drained).bust, false);
});

test("guest catalog stats do not use mid remaining", () => {
  const games = [
    fixture({ number: 1 }),
    fixture({
      number: 2,
      tiers: [
        { amount: 200_000, remaining: 4 },
        { amount: 5_000, remaining: 0 },
        { amount: 500, remaining: 0 },
      ],
    }),
  ];
  const paid = catalogHeat(games);
  const guest = catalogHeat(games.map(publicGame), scoreGamePublic);
  assert.notEqual(guest.medium, paid.medium);
  assert.equal(guest.busts, 0);
  assert.ok(paid.busts >= 0);
});

test("guest cash blips rank without mid-tier remaining", () => {
  const midHeavy = fixture({
    number: 11,
    name: "Mid Heavy",
    topPrize: 200_000,
    tiers: [
      { amount: 200_000, remaining: 2 },
      { amount: 5_000, remaining: 90 },
      { amount: 500, remaining: 10 },
    ],
  });
  const publicCash = fixture({
    number: 12,
    name: "Cash Frenzy",
    price: 5,
    topPrize: 500,
    tiers: [
      { amount: 500, remaining: 4 },
      { amount: 100, remaining: null },
      { amount: 50, remaining: null },
    ],
  });
  const paidBlips = cashBlips([midHeavy, publicCash], 8);
  const guestBlips = cashBlips([publicGame(midHeavy), publicGame(publicCash)], 8);
  assert.ok(paidBlips.some((blip) => blip.gameId === 11 && blip.amount === 5_000));
  assert.ok(guestBlips.every((blip) => blip.amount !== 5_000));
  assert.ok(guestBlips.some((blip) => blip.gameId === 12 && blip.amount === 500));
});

test("Tennessee holdback treats posted 1 top as no retail jackpot", () => {
  const oneLeft = fixture({
    tiers: [
      { amount: 200_000, remaining: 1 },
      { amount: 5_000, remaining: 80 },
      { amount: 500, remaining: 200 },
    ],
  });
  const tn = scoreGame(oneLeft);
  const other = scoreGame(oneLeft, { topHoldback: 0 });
  assert.equal(tn.effectiveTop, 0);
  assert.equal(other.effectiveTop, 1);
  assert.notEqual(tn.grand, other.grand);
});

test("cash-out games ignore top-prize holdback", () => {
  const cash = fixture({
    price: 5,
    topPrize: 500,
    tiers: [
      { amount: 500, remaining: 1 },
      { amount: 100, remaining: 40 },
      { amount: 50, remaining: 80 },
    ],
  });
  const tn = scoreGame(cash);
  const other = scoreGame(cash, { topHoldback: 0 });
  assert.equal(tn.effectiveTop, 1);
  assert.equal(other.effectiveTop, 1);
  assert.equal(tn.role, "cash-out");
});

test("Kentucky-style remaining 1 jackpot stays live without TN holdback", () => {
  const kyOneLeft = fixture({
    number: 113,
    name: "$100,000 Jackpot",
    price: 5,
    topPrize: 100_000,
    tiers: [
      { amount: 100_000, remaining: 1 },
      { amount: 1_000, remaining: 97 },
      { amount: 500, remaining: 182 },
    ],
  });
  const tn = scoreGame(kyOneLeft);
  const ky = scoreGame(kyOneLeft, { topHoldback: 0 });
  assert.equal(tn.effectiveTop, 0);
  assert.equal(ky.effectiveTop, 1);
  assert.equal(ky.bust, false);
});

test("guest desk picks are not the paid mid-tier ranking", () => {
  const midHot = fixture({
    number: 21,
    name: "Mid Hot",
    price: 10,
    tiers: [
      { amount: 200_000, remaining: 1 },
      { amount: 5_000, remaining: 90 },
      { amount: 500, remaining: 400 },
    ],
  });
  const topLive = fixture({
    number: 22,
    name: "Top Live",
    price: 10,
    tiers: [
      { amount: 200_000, remaining: 6 },
      { amount: 5_000, remaining: 0 },
      { amount: 500, remaining: 0 },
    ],
  });
  const paidReports = new Map([
    [midHot.number, scoreGame(midHot)],
    [topLive.number, scoreGame(topLive)],
  ]);
  const guestGames = [publicGame(midHot), publicGame(topLive)];
  const guestReports = new Map(guestGames.map((game) => [game.number, scoreGamePublic(game)]));
  const paidPick = buildDesk([midHot, topLive], paidReports).byPrice.find((row) => row.price === "$10")?.pick;
  const guestPick = buildDesk(guestGames, guestReports).byPrice.find((row) => row.price === "$10")?.pick;
  assert.equal(paidPick?.game.number, 21);
  assert.equal(guestPick?.game.number, 22);
  assert.equal(guestPick?.heat.midRemaining, null);
});

test("price-scaled secondary bands match $5 / $10 / $20 only", () => {
  assert.deepEqual(secondaryBandForPrice(5), { min: 3_000, max: 7_000 });
  assert.deepEqual(secondaryBandForPrice(10), { min: 5_000, max: 10_000 });
  assert.deepEqual(secondaryBandForPrice(20), { min: 10_000, max: 40_000 });
  assert.equal(secondaryBandForPrice(25), null);
  assert.equal(secondaryBandForPrice(30), null);
  assert.equal(secondaryBandForPrice(50), null);
});

test("secondary remaining counts the price-scaled band and ignores the jackpot", () => {
  const ten = fixture({
    price: 10,
    tiers: [
      { amount: 200_000, remaining: 4 },
      { amount: 5_000, remaining: 40 },
      { amount: 500, remaining: 200 },
    ],
  });
  const twenty = fixture({
    price: 20,
    topPrize: 500_000,
    tiers: [
      { amount: 500_000, remaining: 3 },
      { amount: 25_000, remaining: 12 },
      { amount: 500, remaining: 80 },
    ],
  });
  const thirty = fixture({
    price: 30,
    topPrize: 1_000_000,
    tiers: [
      { amount: 1_000_000, remaining: 3 },
      { amount: 25_000, remaining: 12 },
      { amount: 500, remaining: 80 },
    ],
  });
  assert.equal(secondaryRemaining(ten), 40);
  assert.equal(secondaryRemaining(twenty), 12);
  assert.equal(secondaryRemaining(thirty), null);
});

test("Medium heat boosts in-band secondary remaining without changing Grand heat", () => {
  const inBand = fixture({
    number: 31,
    price: 10,
    tiers: [
      { amount: 200_000, remaining: 4 },
      { amount: 5_000, remaining: 40 },
      { amount: 500, remaining: 200 },
    ],
  });
  const outOfBand = fixture({
    number: 32,
    price: 10,
    tiers: [
      { amount: 200_000, remaining: 4 },
      { amount: 20_000, remaining: 40 },
      { amount: 500, remaining: 200 },
    ],
  });
  const a = scoreGame(inBand);
  const b = scoreGame(outOfBand);
  assert.equal(a.grand, b.grand);
  assert.equal(a.effectiveTop, b.effectiveTop);
  assert.equal(a.midRemaining, b.midRemaining);
  assert.ok(a.medium > b.medium);
});

test("$5 $3,000 remaining boosts Medium heat even though it is not a mid-tier row", () => {
  const withSecondary = fixture({
    number: 41,
    price: 5,
    topPrize: 150_000,
    tiers: [
      { amount: 150_000, remaining: 4 },
      { amount: 3_000, remaining: 30 },
      { amount: 500, remaining: 200 },
    ],
  });
  const withoutSecondary = fixture({
    number: 42,
    price: 5,
    topPrize: 150_000,
    tiers: [
      { amount: 150_000, remaining: 4 },
      { amount: 1_000, remaining: 30 },
      { amount: 500, remaining: 200 },
    ],
  });
  const a = scoreGame(withSecondary);
  const b = scoreGame(withoutSecondary);
  assert.equal(a.grand, b.grand);
  assert.equal(secondaryRemaining(withSecondary), 30);
  assert.equal(secondaryRemaining(withoutSecondary), null);
  assert.ok(a.medium > b.medium);
});

test("$30 tickets keep the unboosted Medium heat path", () => {
  const thirty = fixture({
    price: 30,
    topPrize: 1_000_000,
    tiers: [
      { amount: 1_000_000, remaining: 4 },
      { amount: 25_000, remaining: 40 },
      { amount: 500, remaining: 200 },
    ],
  });
  const twenty = fixture({
    price: 20,
    topPrize: 1_000_000,
    tiers: [
      { amount: 1_000_000, remaining: 4 },
      { amount: 25_000, remaining: 40 },
      { amount: 500, remaining: 200 },
    ],
  });
  assert.equal(secondaryRemaining(thirty), null);
  assert.equal(secondaryRemaining(twenty), 40);
  assert.ok(scoreGame(twenty).medium > scoreGame(thirty).medium);
  assert.equal(scoreGame(twenty).grand, scoreGame(thirty).grand);
});

test("bust is stronger when effective top and the secondary band are both gone", () => {
  const five = fixture({
    price: 5,
    topPrize: 150_000,
    tiers: [
      { amount: 150_000, remaining: 1 },
      { amount: 3_000, remaining: 0 },
      { amount: 500, remaining: 200 },
    ],
  });
  const report = scoreGame(five);
  assert.equal(report.effectiveTop, 0);
  assert.equal(report.midRemaining, null);
  assert.equal(secondaryRemaining(five), 0);
  assert.equal(report.bust, true);
  assert.equal(scoreGamePublic(five).bust, false);
});

test("secondary booster applies with holdback 0 on non-Tennessee desks", () => {
  const ctx = { topHoldback: 0 };
  const fiveIn = fixture({
    number: 21001,
    price: 5,
    topPrize: 100_000,
    tiers: [
      { amount: 100_000, remaining: 3 },
      { amount: 5_000, remaining: 20 },
      { amount: 500, remaining: 100 },
    ],
  });
  const fiveOut = fixture({
    number: 21002,
    price: 5,
    topPrize: 100_000,
    tiers: [
      { amount: 100_000, remaining: 3 },
      { amount: 10_000, remaining: 20 },
      { amount: 500, remaining: 100 },
    ],
  });
  const tenIn = fixture({
    number: 21010,
    price: 10,
    topPrize: 400_000,
    tiers: [
      { amount: 400_000, remaining: 3 },
      { amount: 10_000, remaining: 20 },
      { amount: 1_000, remaining: 100 },
    ],
  });
  const twentyIn = fixture({
    number: 21020,
    price: 20,
    topPrize: 1_000_000,
    tiers: [
      { amount: 1_000_000, remaining: 3 },
      { amount: 20_000, remaining: 20 },
      { amount: 5_000, remaining: 100 },
    ],
  });
  const a = scoreGame(fiveIn, ctx);
  const b = scoreGame(fiveOut, ctx);
  assert.equal(a.effectiveTop, 3);
  assert.equal(b.effectiveTop, 3);
  assert.equal(a.grand, b.grand);
  assert.equal(a.midRemaining, b.midRemaining);
  assert.ok(a.medium > b.medium);
  assert.equal(secondaryRemaining(tenIn), 20);
  assert.equal(secondaryRemaining(twentyIn), 20);
  const tenScore = scoreGame(tenIn, ctx);
  const twentyScore = scoreGame(twentyIn, ctx);
  assert.equal(tenScore.effectiveTop, 3);
  assert.equal(twentyScore.effectiveTop, 3);
  assert.ok(tenScore.medium > 8);
  assert.ok(twentyScore.medium > 8);
});

test("Play It Again holdback and Grand heat stay independent of the secondary booster", () => {
  const oneLeft = fixture({
    tiers: [
      { amount: 200_000, remaining: 1 },
      { amount: 5_000, remaining: 80 },
      { amount: 500, remaining: 200 },
    ],
  });
  const tn = scoreGame(oneLeft);
  const other = scoreGame(oneLeft, { topHoldback: 0 });
  assert.equal(tn.effectiveTop, 0);
  assert.equal(tn.grand, 0);
  assert.equal(other.effectiveTop, 1);
  assert.ok(other.grand > 0);
  assert.equal(tn.medium, other.medium);
});

test("Tonight remaining heat prefers retail tops and skips bust when live games exist", () => {
  const ctx = { topHoldback: 0 };
  const live = fixture({
    number: 201,
    name: "Live Jackpot",
    tiers: [
      { amount: 200_000, remaining: 4 },
      { amount: 8_000, remaining: 40 },
      { amount: 500, remaining: 10 },
    ],
  });
  const hotter = fixture({
    number: 202,
    name: "Hotter Jackpot",
    price: 20,
    topPrize: 500_000,
    tiers: [
      { amount: 500_000, remaining: 6 },
      { amount: 20_000, remaining: 90 },
      { amount: 500, remaining: 10 },
    ],
  });
  const drained = fixture({
    number: 203,
    name: "Drained",
    tiers: [
      { amount: 200_000, remaining: 0 },
      { amount: 5_000, remaining: 0 },
      { amount: 500, remaining: 0 },
    ],
  });
  const games = [live, hotter, drained];
  const reports = new Map(games.map((game) => [game.number, scoreGame(game, ctx)]));
  const { cards, depleted } = pickTonightHeat(games, reports, 3);
  assert.equal(depleted, false);
  assert.equal(cards.length, 2);
  assert.equal(cards[0].number, hotter.number);
  assert.ok(cards.every((card) => card.number !== drained.number));
});

test("Tonight remaining heat shows Pass list when the desk has no retail top", () => {
  const ctx = { topHoldback: 1 };
  const gone = fixture({
    number: 301,
    name: "Gone",
    tiers: [
      { amount: 200_000, remaining: 1 },
      { amount: 5_000, remaining: 0 },
      { amount: 500, remaining: 0 },
    ],
  });
  const reports = new Map([[gone.number, scoreGame(gone, ctx)]]);
  const { cards, depleted } = pickTonightHeat([gone], reports, 3);
  assert.equal(depleted, true);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].number, 301);
  assert.equal(cards[0].band, "bust");
});

