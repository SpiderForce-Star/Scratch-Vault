import assert from "node:assert/strict";
import { test } from "node:test";
import { applyPace } from "../src/lib/pace.ts";
import {
  catalogHeat,
  catalogHeatFromReports,
  leftoverDecayStats,
  pickTonightHeat,
  scoreGame,
} from "../src/lib/heat.server.ts";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const NO_HOLDBACK = { topHoldback: 0 };

function game(number, tiers, extra = {}) {
  return {
    number,
    name: `Game ${number}`,
    price: 10,
    topPrize: tiers[0]?.amount ?? 200000,
    odds: 3.45,
    source: "official-remaining",
    theme: "cash",
    stateId: "ky",
    tiers,
    ...extra,
  };
}

function jackpot(number, mid, extra = {}) {
  return game(
    number,
    [
      { amount: 200_000, remaining: 4 },
      { amount: 5_000, remaining: mid },
      { amount: 500, remaining: 80 },
    ],
    extra,
  );
}

test("catalogHeatFromReports uses paced deskScore, not raw remaining mix", () => {
  const a = jackpot(1, 40);
  const raw = scoreGame(a, NO_HOLDBACK);
  const paced = applyPace(raw, {
    band: "fast",
    leftoverPct: 9,
    leftoverDaily: 9 / 16,
    leftoverNow: 92,
    leftoverPrior: 100,
    days: 16,
    lift: 10,
  });
  const reports = new Map([[1, paced]]);
  const stats = catalogHeatFromReports([a], reports);
  assert.equal(stats.heat, paced.deskScore);
  assert.ok(stats.heat > raw.vault);
  assert.equal(stats.leftover.fast, 1);
  assert.equal(stats.leftover.movers, 1);
  assert.equal(stats.leftover.meanPct16, 9);
  const remainingOnly = catalogHeat([a], (g) => scoreGame(g, NO_HOLDBACK));
  assert.equal(remainingOnly.grand, raw.grand);
  assert.equal(remainingOnly.games, 1);
});

test("leftoverDecayStats counts Still Quiet Moving Fast and ignores unknown in the mean", () => {
  const leftover = leftoverDecayStats([
    { paceBand: "fast", leftoverPct: 10 },
    { paceBand: "moving", leftoverPct: 4 },
    { paceBand: "quiet", leftoverPct: 1 },
    { paceBand: "still", leftoverPct: 0.2 },
    { paceBand: "unknown", leftoverPct: 99 },
    { leftoverPct: null },
  ]);
  assert.equal(leftover.fast, 1);
  assert.equal(leftover.moving, 1);
  assert.equal(leftover.quiet, 1);
  assert.equal(leftover.still, 1);
  assert.equal(leftover.unknown, 2);
  assert.equal(leftover.movers, 2);
  assert.equal(leftover.meanPct16, (10 + 4 + 1 + 0.2) / 4);
});

test("under-$5 games do not count toward leftover decay that ranks the $5–$50 desk", () => {
  const ten = jackpot(21, 20);
  const dollar = game(
    22,
    [
      { amount: 200_000, remaining: 4 },
      { amount: 5_000, remaining: 20 },
      { amount: 500, remaining: 80 },
    ],
    { price: 1, topPrize: 200_000 },
  );
  const tenHeat = applyPace(scoreGame(ten, NO_HOLDBACK), {
    band: "still",
    leftoverPct: 0.2,
    leftoverDaily: 0.2 / 16,
    leftoverNow: 104,
    leftoverPrior: 104,
    days: 16,
    lift: -3,
  });
  const dollarHeat = applyPace(scoreGame(dollar, NO_HOLDBACK), {
    band: "fast",
    leftoverPct: 12,
    leftoverDaily: 12 / 16,
    leftoverNow: 80,
    leftoverPrior: 91,
    days: 16,
    lift: 10,
  });
  const stats = catalogHeatFromReports(
    [ten, dollar],
    new Map([
      [21, tenHeat],
      [22, dollarHeat],
    ]),
  );
  assert.equal(stats.leftover.fast, 0);
  assert.equal(stats.leftover.still, 1);
  assert.equal(stats.leftover.movers, 0);
  assert.equal(stats.heat, tenHeat.deskScore);
  assert.equal(stats.games, 2);
});

test("Tonight ranks leftover mix + pace (deskScore) ahead of fatter secondary remaining", () => {
  const still = jackpot(10, 20);
  const fast = jackpot(11, 20);
  const slowHeat = applyPace(scoreGame(still, NO_HOLDBACK), {
    band: "still",
    leftoverPct: 0.2,
    leftoverDaily: 0.2 / 16,
    leftoverNow: 100,
    leftoverPrior: 100,
    days: 16,
    lift: -3,
  });
  const fastHeat = applyPace(scoreGame(fast, NO_HOLDBACK), {
    band: "fast",
    leftoverPct: 9,
    leftoverDaily: 9 / 16,
    leftoverNow: 80,
    leftoverPrior: 88,
    days: 16,
    lift: 10,
  });
  const reports = new Map([
    [10, slowHeat],
    [11, fastHeat],
  ]);
  const { cards, depleted } = pickTonightHeat([still, fast], reports, 2);
  assert.equal(depleted, false);
  assert.ok(fastHeat.deskScore > slowHeat.deskScore);
  assert.equal(cards[0].number, 11);
  assert.equal(cards[1].number, 10);
});

test("retail-top-gone stays off Tonight look-ats even when leftover is Fast", () => {
  const gone = game(12, [
    { amount: 200_000, remaining: 0 },
    { amount: 5_000, remaining: 40 },
    { amount: 500, remaining: 400 },
  ]);
  const live = jackpot(13, 12);
  const goneHeat = applyPace(scoreGame(gone, NO_HOLDBACK), {
    band: "fast",
    leftoverPct: 12,
    leftoverDaily: 12 / 16,
    leftoverNow: 80,
    leftoverPrior: 91,
    days: 16,
    lift: -6,
  });
  const liveHeat = scoreGame(live, NO_HOLDBACK);
  const { cards, depleted } = pickTonightHeat(
    [gone, live],
    new Map([
      [12, goneHeat],
      [13, liveHeat],
    ]),
    3,
  );
  assert.equal(depleted, false);
  assert.equal(cards[0].number, 13);
  assert.ok(cards.every((card) => card.number !== 12));
});

test("PUBLIC_STATE_IDS stay locked and decay copy forbids odds language", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const en = JSON.parse(readFileSync(join(root, "src/locales/en.json"), "utf8"));
  const es = JSON.parse(readFileSync(join(root, "src/locales/es.json"), "utf8"));
  assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
  const banned =
    /higher probability|better odds|current odds|expected value|\bEV\b|tickets purchased|more likely to win/i;
  for (const key of ["decay.body", "decay.foot", "decay.heatLine", "heatTonight.sub"]) {
    assert.doesNotMatch(en[key], banned);
    assert.doesNotMatch(es[key], banned);
  }
  assert.match(en["decay.body"], /Printed odds never change/);
  assert.match(en["decay.body"], /Claims, not tickets sold/);
  assert.match(en["decay.foot"], /leftover-prize pace \(claims\)/);
  assert.match(en["decay.heatLine"], /Mean Heat/);
  assert.match(en["heatTonight.sub"], /leftover mix plus leftover-prize pace/);
  assert.match(es["decay.body"], /probabilidades impresas nunca cambian/i);
  assert.match(es["decay.body"], /reclamos/);
  assert.match(es["decay.foot"], /ritmo de premios restantes/);
  assert.match(es["decay.heatLine"], /Heat medio/);
  assert.match(es["heatTonight.sub"], /mezcla de restantes/);
  const states = readFileSync(join(root, "src/config/states.ts"), "utf8");
  const publicBlock = states.slice(
    states.indexOf("export const PUBLIC_STATE_IDS"),
    states.indexOf("export const HIDDEN_STATE_IDS"),
  );
  for (const id of ["tn", "ky", "sc", "ok", "nc", "pa", "tx", "mo", "ia", "id", "mi", "oh"]) {
    assert.match(publicBlock, new RegExp(`"${id}"`));
  }
  const desk = readFileSync(join(root, "src/lib/desk.server.ts"), "utf8");
  assert.match(desk, /catalogHeatFromReports/);
  assert.match(desk, /scoreCatalogPace/);
  assert.match(desk, /meanPct16: null/);
  const home = readFileSync(join(root, "src/routes/index.tsx"), "utf8");
  const games = readFileSync(join(root, "src/routes/games.tsx"), "utf8");
  const heatServer = readFileSync(join(root, "src/lib/heat.server.ts"), "utf8");
  const firstScreen = home.slice(home.indexOf("return ("), home.indexOf('id="skip"'));
  assert.doesNotMatch(firstScreen, /LeftoverDecayStrip/);
  assert.doesNotMatch(firstScreen, /TonightHeatStrip/);
  assert.match(games, /LeftoverDecayStrip/);
  assert.match(games, /TonightHeatStrip/);
  assert.match(heatServer, /if \(bHeat !== aHeat\) return bHeat - aHeat/);
  assert.match(heatServer, /isDeskPrice\(game\.price\)/);
});
