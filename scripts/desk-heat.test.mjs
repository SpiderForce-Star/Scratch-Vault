import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { persistPrizeTiers } from "../src/data/states/parse.server.ts";
import {
  isSkipGame,
  isSkipCandidate,
} from "../src/lib/heat.ts";
import {
  scoreCatalogRelative,
  scoreDeskHeat,
  scoreGame,
} from "../src/lib/heat.server.ts";
import { leftoverBook, overlapLeftover } from "../src/lib/pace.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const NO_HOLDBACK = { topHoldback: 0 };

function game(number, price, tiers, extra = {}) {
  return {
    number,
    name: `Game ${number}`,
    price,
    topPrize: tiers[0]?.amount ?? 100000,
    odds: 3.9,
    source: "official-remaining",
    theme: "cash",
    stateId: "ky",
    tiers,
    ...extra,
  };
}

test("a desk of 10 fat $10 books is not all Hot; top quintile Hot, bottom Cold", () => {
  const mids = [12, 24, 36, 48, 60, 80, 100, 140, 180, 240];
  const games = mids.map((mid, i) =>
    game(112 + i, 10, [
      { amount: 200_000, remaining: 3 },
      { amount: 5_000, remaining: mid },
      { amount: 500, remaining: 400 },
      { amount: 100, remaining: 800 },
    ]),
  );
  const reports = scoreDeskHeat(games, NO_HOLDBACK);
  const bands = games.map((g) => reports.get(g.number).band);
  assert.equal(bands.every((b) => b === "hot"), false);
  const ranked = [...games].sort(
    (a, b) => (reports.get(b.number).vault ?? 0) - (reports.get(a.number).vault ?? 0),
  );
  const topTwo = ranked.slice(0, 2);
  const bottomTwo = ranked.slice(-2);
  for (const g of topTwo) {
    assert.equal(reports.get(g.number).band, "hot");
    assert.equal(isSkipGame(reports.get(g.number)), false);
  }
  for (const g of bottomTwo) {
    const heat = reports.get(g.number);
    assert.equal(heat.band, "cool");
    assert.equal(isSkipGame(heat), true);
  }
});

test("cash remaining 400 with empty retail top stays Skip", () => {
  const g = game(848, 10, [
    { amount: 200_000, remaining: 0 },
    { amount: 5_000, remaining: 80 },
    { amount: 500, remaining: 400 },
  ]);
  const heat = scoreGame(g, NO_HOLDBACK);
  assert.equal(heat.effectiveTop, 0);
  assert.equal(heat.band === "hot" || heat.band === "warm", false);
  assert.equal(isSkipGame(heat), true);
  assert.equal(isSkipCandidate(g, heat), true);
  const relative = scoreCatalogRelative([g], new Map([[g.number, heat]]));
  assert.equal(isSkipGame(relative.get(g.number)), true);
});

test("NEW stays NEW and bust stays bust after desk-relative mix", () => {
  const fresh = game(
    160,
    10,
    [
      { amount: 200_000, remaining: null },
      { amount: 5_000, remaining: null },
    ],
    { fresh: true },
  );
  const busted = game(848, 10, [
    { amount: 200_000, remaining: 0 },
    { amount: 10_000, remaining: 0 },
    { amount: 500, remaining: 10 },
  ]);
  const live = game(153, 10, [
    { amount: 200_000, remaining: 4 },
    { amount: 5_000, remaining: 40 },
    { amount: 500, remaining: 80 },
  ]);
  const reports = scoreDeskHeat([fresh, busted, live], NO_HOLDBACK);
  assert.equal(reports.get(160).band, "new");
  assert.equal(reports.get(848).bust, true);
  assert.equal(reports.get(848).band, "bust");
  assert.equal(reports.get(153).band === "new", false);
});

test("TX-style null top + published mid scores from mid/cash; top stays null", () => {
  const tx = game(
    2712,
    10,
    [
      { amount: 1_000_000, remaining: null },
      { amount: 10_000, remaining: 40 },
      { amount: 500, remaining: 200 },
    ],
    { stateId: "tx" },
  );
  const heat = scoreGame(tx, NO_HOLDBACK);
  assert.equal(heat.topRemaining, null);
  assert.equal(heat.effectiveTop, null);
  assert.equal(heat.midRemaining, 40);
  assert.equal(heat.remainingUnknown, false);
  assert.ok(heat.medium > 36);
  const peers = [
    tx,
    game(2589, 10, [
      { amount: 500_000, remaining: 8 },
      { amount: 10_000, remaining: 8 },
      { amount: 500, remaining: 20 },
    ], { stateId: "tx" }),
    game(2671, 10, [
      { amount: 500_000, remaining: 6 },
      { amount: 10_000, remaining: 12 },
      { amount: 500, remaining: 40 },
    ], { stateId: "tx" }),
    game(2655, 10, [
      { amount: 500_000, remaining: 1 },
      { amount: 10_000, remaining: 2 },
      { amount: 500, remaining: 5 },
    ], { stateId: "tx" }),
  ];
  const reports = scoreDeskHeat(peers, NO_HOLDBACK);
  const next = reports.get(2712);
  assert.equal(next.topRemaining, null);
  assert.equal(next.effectiveTop, null);
  assert.equal(next.band === "new", false);
});

test("unpublished top and mid defaults do not Hot a game by themselves", () => {
  const unknown = game(848, 10, [
    { amount: 200_000, remaining: null },
    { amount: 5_000, remaining: null },
  ]);
  const heat = scoreGame(unknown, NO_HOLDBACK);
  assert.equal(heat.remainingUnknown, true);
  assert.equal(heat.band, "cool");
  const fat = Array.from({ length: 6 }, (_, i) =>
    game(112 + i, 10, [
      { amount: 200_000, remaining: 4 },
      { amount: 5_000, remaining: 80 + i * 10 },
      { amount: 500, remaining: 200 },
    ]),
  );
  const reports = scoreDeskHeat([unknown, ...fat], NO_HOLDBACK);
  assert.equal(reports.get(848).band, "cool");
  assert.equal(reports.get(848).remainingUnknown, true);
});

test("overlap leftover uses more than three $50+ rows when published", () => {
  const tiers = [
    { amount: 200_000, remaining: 2 },
    { amount: 10_000, remaining: 10 },
    { amount: 5_000, remaining: 20 },
    { amount: 1_000, remaining: 30 },
    { amount: 500, remaining: 40 },
    { amount: 100, remaining: 50 },
    { amount: 50, remaining: 60 },
    { amount: 20, remaining: 9999 },
  ];
  const persisted = persistPrizeTiers(tiers);
  assert.ok(persisted.length > 3);
  assert.equal(persisted.some((t) => t.amount === 20), false);
  const prior = game(848, 10, persisted);
  const liveTiers = persisted.map((t) => ({
    amount: t.amount,
    remaining: t.remaining == null ? null : Math.max(0, t.remaining - 2),
  }));
  const live = game(848, 10, liveTiers);
  assert.ok(leftoverBook(live).size > 3);
  const overlap = overlapLeftover(prior, live);
  assert.ok(overlap);
  assert.equal(overlap.prior, 2 + 10 + 20 + 30 + 40 + 50 + 60);
});

test("persistPrizeTiers keeps the top even when remaining is null and caps at 12", () => {
  const rows = [
    { amount: 1_000_000, remaining: null },
    ...Array.from({ length: 20 }, (_, i) => ({ amount: 50 + i * 10, remaining: i })),
  ];
  const kept = persistPrizeTiers(rows);
  assert.equal(kept[0].amount, 1_000_000);
  assert.equal(kept[0].remaining, null);
  assert.equal(kept.length, 12);
  assert.equal(kept.some((t) => t.amount < 50 && t.amount !== 1_000_000), false);
});

test("PUBLIC_STATE_IDS and leftover mix wiring stay locked", () => {
  const states = readFileSync(join(root, "src/config/states.ts"), "utf8");
  const publicBlock = states.slice(
    states.indexOf("export const PUBLIC_STATE_IDS"),
    states.indexOf("export const HIDDEN_STATE_IDS"),
  );
  const hiddenBlock = states.slice(
    states.indexOf("export const HIDDEN_STATE_IDS"),
    states.indexOf("export const HIDDEN_RETURN_MIN_GAMES"),
  );
  for (const id of ["tn", "ky", "sc", "ok", "nc", "pa", "tx", "mo", "ia", "id", "mi", "oh"]) {
    assert.match(publicBlock, new RegExp(`"${id}"`));
    assert.doesNotMatch(hiddenBlock, new RegExp(`"${id}"`));
  }
  for (const id of ["az", "ct", "il", "ma"]) {
    assert.match(hiddenBlock, new RegExp(`"${id}"`));
    assert.doesNotMatch(publicBlock, new RegExp(`"${id}"`));
  }
  const heat = readFileSync(join(root, "src/lib/heat.server.ts"), "utf8");
  assert.doesNotMatch(heat, /medium >= 68/);
  assert.doesNotMatch(heat, /cash >= 72/);
  assert.match(heat, /export function scoreCatalogRelative/);
  const desk = readFileSync(join(root, "src/lib/desk.server.ts"), "utf8");
  assert.match(desk, /scoreCatalogRelative/);
  const compile = readFileSync(join(root, "scripts/compile-state-remaining.mjs"), "utf8");
  assert.match(compile, /function pickLeftoverBook/);
  assert.doesNotMatch(compile, /function pickThree/);
});
