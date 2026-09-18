import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { pickTripGames } from "../src/lib/heat.ts";
import {
  STRATEGY_IDS,
  buildStrategyDesk,
  hasListedJackpotTop,
} from "../src/lib/strategy-desk.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function game(number, price, extra = {}) {
  return {
    number,
    name: extra.name ?? `Game ${number}`,
    price,
    topPrize: extra.topPrize ?? 200_000,
    odds: 3.9,
    source: "official-remaining",
    theme: extra.theme ?? "cash",
    stateId: extra.stateId ?? "ky",
    tiers: extra.tiers ?? [
      { amount: extra.topPrize ?? 200_000, remaining: extra.topRemaining ?? 4 },
      { amount: 5_000, remaining: extra.midRemaining ?? 40 },
      { amount: 500, remaining: extra.lowRemaining ?? 80 },
    ],
    ...extra,
  };
}

function heat(partial = {}) {
  return {
    grand: 40,
    medium: 40,
    vault: 50,
    band: "hot",
    bust: false,
    mediumKnown: true,
    role: "jackpot",
    topRemaining: 4,
    effectiveTop: 4,
    midRemaining: 40,
    lowRemaining: 80,
    cash: 40,
    remainingUnknown: false,
    paceBand: "quiet",
    leftoverPct: 1,
    leftoverDaily: 1 / 16,
    leftoverNow: 90,
    leftoverDays: 16,
    deskScore: 50,
    ...partial,
  };
}

function fixtureDesk() {
  const games = [
    game(101, 10, { name: "Hot Ten A", topPrize: 200_000 }),
    game(102, 10, { name: "Hot Ten B", topPrize: 250_000 }),
    game(103, 5, { name: "Hot Five", topPrize: 100_000 }),
    game(104, 10, { name: "Cold Ten Skip", topPrize: 300_000 }),
    game(201, 50, {
      name: "Cold Five Million",
      topPrize: 5_000_000,
      topRemaining: 2,
    }),
    game(202, 10, {
      name: "Cash Frenzy",
      topPrize: 500,
      theme: "frenzy",
      tiers: [
        { amount: 500, remaining: 40 },
        { amount: 100, remaining: 80 },
        { amount: 50, remaining: 200 },
      ],
    }),
    game(203, 10, {
      name: "Retail Top Gone",
      topPrize: 400_000,
      topRemaining: 0,
      tiers: [
        { amount: 400_000, remaining: 0 },
        { amount: 5_000, remaining: 10 },
        { amount: 500, remaining: 20 },
      ],
    }),
    game(1, 1, {
      name: "Dollar Book",
      topPrize: 5_000,
      topRemaining: 9,
    }),
  ];
  const reports = new Map([
    [101, heat({ deskScore: 90, vault: 90, band: "hot", grand: 55, medium: 48, cash: 42, effectiveTop: 4 })],
    [102, heat({ deskScore: 80, vault: 80, band: "warm", grand: 50, medium: 44, cash: 38, effectiveTop: 3 })],
    [103, heat({ deskScore: 70, vault: 70, band: "hot", grand: 42, medium: 50, cash: 46, effectiveTop: 5, paceBand: "fast", leftoverPct: 9 })],
    [104, heat({ deskScore: 20, vault: 20, band: "cool", grand: 30, medium: 18, cash: 16, effectiveTop: 1 })],
    [
      201,
      heat({
        deskScore: 18,
        vault: 18,
        band: "cool",
        grand: 88,
        medium: 22,
        cash: 12,
        effectiveTop: 2,
        topRemaining: 2,
        paceBand: "still",
        leftoverPct: 0.2,
      }),
    ],
    [
      202,
      heat({
        deskScore: 85,
        vault: 85,
        band: "hot",
        role: "cash-out",
        grand: 22,
        medium: 60,
        cash: 70,
        effectiveTop: 40,
        topRemaining: 40,
        paceBand: "moving",
        leftoverPct: 5,
      }),
    ],
    [
      203,
      heat({
        deskScore: 8,
        vault: 0,
        band: "cool",
        bust: false,
        grand: 0,
        medium: 12,
        cash: 10,
        effectiveTop: 0,
        topRemaining: 0,
      }),
    ],
    [
      1,
      heat({
        deskScore: 99,
        vault: 99,
        band: "hot",
        grand: 70,
        medium: 70,
        cash: 70,
        effectiveTop: 9,
        paceBand: "fast",
        leftoverPct: 12,
      }),
    ],
  ]);
  return { games, reports };
}

test("Heat look-at order equals pickTripGames for a fixture desk at $10 and at all", () => {
  const { games, reports } = fixtureDesk();
  for (const filter of ["10", "all"]) {
    const expected = pickTripGames(games, reports, filter, 3).map((row) => row.number);
    const plan = buildStrategyDesk({ games, reports, filter, budget: 50 }).heat;
    assert.deepEqual(
      plan.lookAt.map((row) => row.game.number),
      expected,
      `heat look-at must match pickTripGames at ${filter}`,
    );
  }
});

test("Grand leftover can pick a Cold jackpot with effectiveTop > 0 that Heat skips", () => {
  const { games, reports } = fixtureDesk();
  const heatPlan = buildStrategyDesk({ games, reports, filter: "all", budget: 50 }).heat;
  const grandPlan = buildStrategyDesk({ games, reports, filter: "all", budget: 50 }).grand;
  assert.ok(heatPlan.lookAt.every((row) => row.game.number !== 201));
  assert.equal(reports.get(201).band, "cool");
  assert.ok(reports.get(201).effectiveTop > 0);
  assert.ok(hasListedJackpotTop(reports.get(201)));
  assert.ok(grandPlan.lookAt.some((row) => row.game.number === 201));
  assert.equal(grandPlan.lookAt[0].game.number, 201);
});

test("Grand leftover never picks cash-out or effectiveTop 0", () => {
  const { games, reports } = fixtureDesk();
  const grand = buildStrategyDesk({ games, reports, filter: "all", budget: 50 }).grand;
  for (const row of grand.lookAt) {
    assert.equal(row.heat.role, "jackpot");
    assert.ok(row.heat.effectiveTop == null || row.heat.effectiveTop > 0);
    assert.notEqual(row.game.number, 202);
    assert.notEqual(row.game.number, 203);
  }
});

test("under-$5 games never appear in any strategy pool", () => {
  const { games, reports } = fixtureDesk();
  const desk = buildStrategyDesk({ games, reports, filter: "all", budget: 50 });
  for (const id of STRATEGY_IDS) {
    const plan = desk[id];
    for (const row of [...plan.lookAt, ...plan.walkPast]) {
      assert.ok(row.game.price >= 5, `${id} leaked under-$5 game ${row.game.number}`);
      assert.notEqual(row.game.number, 1);
    }
  }
});

test("Guest redaction: strategy payload has null remaining / leftoverPct when locked", () => {
  const { games, reports } = fixtureDesk();
  const locked = buildStrategyDesk({
    games,
    reports,
    filter: "all",
    budget: 50,
    locked: true,
  });
  for (const id of STRATEGY_IDS) {
    const plan = locked[id];
    for (const row of [...plan.lookAt, ...plan.walkPast]) {
      assert.equal(row.heat.topRemaining, null, `${id} topRemaining`);
      assert.equal(row.heat.effectiveTop, null, `${id} effectiveTop`);
      assert.equal(row.heat.midRemaining, null, `${id} midRemaining`);
      assert.equal(row.heat.lowRemaining, null, `${id} lowRemaining`);
      assert.equal(row.heat.leftoverPct, null, `${id} leftoverPct`);
      assert.ok(row.game.tiers.every((tier) => tier.remaining == null));
    }
  }
});

test("Locale: en and es have the same strategy.* keys; English+Spanish forbid odds language", () => {
  const en = JSON.parse(read("src/locales/en.json"));
  const es = JSON.parse(read("src/locales/es.json"));
  assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
  const strategyKeys = Object.keys(en)
    .filter((key) => key === "nav.strategy" || key.startsWith("strategy."))
    .sort();
  assert.deepEqual(
    strategyKeys,
    Object.keys(es)
      .filter((key) => key === "nav.strategy" || key.startsWith("strategy."))
      .sort(),
  );
  const required = [
    "nav.strategy",
    "strategy.title",
    "strategy.kicker",
    "strategy.body",
    "strategy.budget",
    "strategy.goalMixed",
    "strategy.goalGrand",
    "strategy.goalCash",
    "strategy.heat",
    "strategy.grand",
    "strategy.cash",
    "strategy.fast",
    "strategy.spread",
    "strategy.fit",
    "strategy.walkPast",
    "strategy.verdict",
    "strategy.spent",
    "strategy.lookAt",
    "strategy.empty",
    "strategy.notOdds",
    "strategy.sampleSpend",
    "strategy.compareCta",
  ];
  for (const key of required) {
    assert.equal(typeof en[key], "string");
    assert.equal(typeof es[key], "string");
    assert.ok(en[key].length > 2);
    assert.ok(es[key].length > 2);
  }
  const banned =
    /expected value|\bEV\b|current odds|better odds|value score|\bROI\b/i;
  for (const key of strategyKeys) {
    assert.doesNotMatch(en[key], banned, key);
    assert.doesNotMatch(es[key], banned, key);
  }
  assert.match(en["strategy.body"], /Remaining counts do not improve your odds/);
  assert.match(en["strategy.body"], /Printed odds never change/);
  assert.match(en["strategy.body"], /Not a lottery/);
  assert.match(en["hero.titleAll"], /Three tickets to look at\. A list to walk past/);
});

test("look-at with count 0 is dropped; nothing spent is empty", () => {
  const { games, reports } = fixtureDesk();
  const grand = buildStrategyDesk({
    games,
    reports,
    filter: "50",
    budget: 20,
  }).grand;
  assert.equal(grand.lookAt.length, 0);
  assert.equal(grand.empty, true);
  assert.ok(grand.lookAt.every((row) => row.count > 0));
});

test("Budget $50 at all-price: Heat ticketCount >= 3; Grand concentrate can spend a single $50", () => {
  const { games, reports } = fixtureDesk();
  const desk = buildStrategyDesk({
    games,
    reports,
    filter: "all",
    budget: 50,
  });
  assert.ok(desk.heat.ticketCount >= 3);
  assert.ok(desk.heat.lookAt.every((row) => row.game.price === 5 || row.game.price === 10));
  assert.equal(desk.grand.lookAt[0].game.number, 201);
  assert.equal(desk.grand.lookAt[0].game.price, 50);
  assert.equal(desk.grand.lookAt[0].count, 1);
  assert.equal(desk.grand.spent, 50);
  assert.equal(desk.grand.ticketCount, 1);
});
