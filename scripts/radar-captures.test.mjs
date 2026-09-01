import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  RADAR_STATE_IDS,
  assembleRadarScope,
  captureBleeps,
  detectGrandCaptures,
  hashRadarPos,
  isGrandJackpot,
  isMonitoredDesk,
  publishedTopRemaining,
  quietJackpotContacts,
} from "../src/lib/radar.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function jackpot(overrides = {}) {
  return {
    number: 2001,
    name: "Vault Jackpot",
    price: 10,
    topPrize: 500_000,
    odds: 3.2,
    tiers: [
      { amount: 500_000, remaining: 3 },
      { amount: 10_000, remaining: 8 },
      { amount: 1_000, remaining: 40 },
    ],
    source: "official-remaining",
    theme: "high",
    stateId: "tn",
    ...overrides,
  };
}

function cashOut(overrides = {}) {
  return jackpot({
    number: 9,
    name: "$500 Frenzy",
    price: 5,
    topPrize: 500,
    tiers: [
      { amount: 500, remaining: 40 },
      { amount: 100, remaining: 80 },
      { amount: 50, remaining: 100 },
    ],
    ...overrides,
  });
}

const meta = { stateId: "tn", shortName: "TN", snapshotAt: "2026-08-31T12:00:00Z" };

test("radar monitors the 10 public desks and never hidden ones", () => {
  const src = readFileSync(join(root, "src/config/states.ts"), "utf8");
  const publicBlock = src.slice(
    src.indexOf("export const PUBLIC_STATE_IDS"),
    src.indexOf("export const HIDDEN_STATE_IDS"),
  );
  for (const id of RADAR_STATE_IDS) {
    assert.equal(isMonitoredDesk(id), true);
    assert.match(publicBlock, new RegExp(`"${id}"`));
  }
  for (const id of ["az", "mi", "oh", "ct", "il", "ma"]) {
    assert.equal(isMonitoredDesk(id), false);
    assert.doesNotMatch(publicBlock, new RegExp(`"${id}"`));
  }
});

test("cash-out tickets are not grand jackpots", () => {
  assert.equal(isGrandJackpot(jackpot()), true);
  assert.equal(isGrandJackpot(cashOut()), false);
});

test("a top-tier remaining drop is a capture", () => {
  const prior = [jackpot({ tiers: [{ amount: 500_000, remaining: 3 }, { amount: 10_000, remaining: 8 }, { amount: 1_000, remaining: 40 }] })];
  const current = [jackpot({ tiers: [{ amount: 500_000, remaining: 2 }, { amount: 10_000, remaining: 8 }, { amount: 1_000, remaining: 40 }] })];
  const hits = detectGrandCaptures(prior, current, meta);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].dropped, 1);
  assert.equal(hits[0].stack, 1);
  assert.equal(hits[0].shortName, "TN");
  assert.equal(hits[0].amount, 500_000);
  assert.equal(captureBleeps(hits), 1);
});

test("drop of two or more tops stacks two bills and bleeps twice", () => {
  const prior = [jackpot({ remaining: undefined, tiers: [{ amount: 500_000, remaining: 4 }, { amount: 10_000, remaining: 8 }, { amount: 1_000, remaining: 40 }] })];
  const current = [jackpot({ tiers: [{ amount: 500_000, remaining: 2 }, { amount: 10_000, remaining: 8 }, { amount: 1_000, remaining: 40 }] })];
  const hits = detectGrandCaptures(prior, current, meta);
  assert.equal(hits[0].dropped, 2);
  assert.equal(hits[0].stack, 2);
  assert.equal(captureBleeps(hits), 2);
});

test("two games dropping also bleep twice", () => {
  const prior = [
    jackpot({ number: 1, tiers: [{ amount: 500_000, remaining: 2 }, { amount: 10_000, remaining: 1 }, { amount: 1_000, remaining: 1 }] }),
    jackpot({ number: 2, name: "Second", tiers: [{ amount: 400_000, remaining: 3 }, { amount: 10_000, remaining: 1 }, { amount: 1_000, remaining: 1 }] }),
  ];
  const current = [
    jackpot({ number: 1, tiers: [{ amount: 500_000, remaining: 1 }, { amount: 10_000, remaining: 1 }, { amount: 1_000, remaining: 1 }] }),
    jackpot({ number: 2, name: "Second", topPrize: 400_000, tiers: [{ amount: 400_000, remaining: 2 }, { amount: 10_000, remaining: 1 }, { amount: 1_000, remaining: 1 }] }),
  ];
  const hits = detectGrandCaptures(prior, current, meta);
  assert.equal(hits.length, 2);
  assert.equal(captureBleeps(hits), 2);
});

test("does not invent captures from null remaining, increases, or cash-out drops", () => {
  const prior = [
    jackpot({ number: 1, tiers: [{ amount: 500_000, remaining: null }, { amount: 10_000, remaining: 1 }, { amount: 1_000, remaining: 1 }] }),
    jackpot({ number: 2, tiers: [{ amount: 500_000, remaining: 1 }, { amount: 10_000, remaining: 1 }, { amount: 1_000, remaining: 1 }] }),
    cashOut({ number: 3, tiers: [{ amount: 500, remaining: 40 }, { amount: 100, remaining: 1 }, { amount: 50, remaining: 1 }] }),
  ];
  const current = [
    jackpot({ number: 1, tiers: [{ amount: 500_000, remaining: 0 }, { amount: 10_000, remaining: 1 }, { amount: 1_000, remaining: 1 }] }),
    jackpot({ number: 2, tiers: [{ amount: 500_000, remaining: 2 }, { amount: 10_000, remaining: 1 }, { amount: 1_000, remaining: 1 }] }),
    cashOut({ number: 3, tiers: [{ amount: 500, remaining: 10 }, { amount: 100, remaining: 1 }, { amount: 50, remaining: 1 }] }),
  ];
  assert.deepEqual(detectGrandCaptures(prior, current, meta), []);
});

test("hidden desks never produce captures", () => {
  const prior = [jackpot({ tiers: [{ amount: 500_000, remaining: 3 }, { amount: 10_000, remaining: 1 }, { amount: 1_000, remaining: 1 }] })];
  const current = [jackpot({ tiers: [{ amount: 500_000, remaining: 1 }, { amount: 10_000, remaining: 1 }, { amount: 1_000, remaining: 1 }] })];
  for (const id of ["az", "mi", "oh", "ct", "il", "ma"]) {
    assert.deepEqual(
      detectGrandCaptures(prior, current, { stateId: id, shortName: id.toUpperCase(), snapshotAt: meta.snapshotAt }),
      [],
    );
  }
});

test("new capture hash moves off the previous snapshot blip", () => {
  const a = hashRadarPos("ky", 105, "2026-08-27T12:00:00Z");
  const b = hashRadarPos("ky", 105, "2026-08-31T12:00:00Z");
  assert.equal(a.angle === b.angle && a.radius === b.radius, false);
  assert.equal(hashRadarPos("ky", 105, "2026-08-31T12:00:00Z").angle, b.angle);
});

test("quiet remaining jackpots stay on the scope when nothing dropped", () => {
  const games = [
    jackpot({ number: 1, tiers: [{ amount: 500_000, remaining: 2 }, { amount: 10_000, remaining: 1 }, { amount: 1_000, remaining: 1 }] }),
    cashOut({ number: 2 }),
    jackpot({ number: 3, tiers: [{ amount: 200_000, remaining: 0 }, { amount: 5_000, remaining: 1 }, { amount: 500, remaining: 1 }] }),
  ];
  const quiet = quietJackpotContacts(games, { stateId: "tn", shortName: "TN" }, new Set());
  assert.equal(quiet.length, 1);
  assert.equal(quiet[0].id, "quiet-tn-1");
  assert.equal(publishedTopRemaining(games[0]), 2);
  const scope = assembleRadarScope([], quiet);
  assert.equal(scope.bleeps, 0);
  assert.equal(scope.captures.length, 0);
  assert.equal(scope.contacts.length, 1);
});

test("assembleRadarScope keeps two stacked captures and fades extras", () => {
  const captures = detectGrandCaptures(
    [
      jackpot({ number: 1, topPrize: 500_000, tiers: [{ amount: 500_000, remaining: 5 }, { amount: 10_000, remaining: 1 }, { amount: 1_000, remaining: 1 }] }),
      jackpot({ number: 2, name: "B", topPrize: 300_000, tiers: [{ amount: 300_000, remaining: 2 }, { amount: 10_000, remaining: 1 }, { amount: 1_000, remaining: 1 }] }),
      jackpot({ number: 3, name: "C", topPrize: 200_000, tiers: [{ amount: 200_000, remaining: 2 }, { amount: 10_000, remaining: 1 }, { amount: 1_000, remaining: 1 }] }),
    ],
    [
      jackpot({ number: 1, topPrize: 500_000, tiers: [{ amount: 500_000, remaining: 2 }, { amount: 10_000, remaining: 1 }, { amount: 1_000, remaining: 1 }] }),
      jackpot({ number: 2, name: "B", topPrize: 300_000, tiers: [{ amount: 300_000, remaining: 1 }, { amount: 10_000, remaining: 1 }, { amount: 1_000, remaining: 1 }] }),
      jackpot({ number: 3, name: "C", topPrize: 200_000, tiers: [{ amount: 200_000, remaining: 1 }, { amount: 10_000, remaining: 1 }, { amount: 1_000, remaining: 1 }] }),
    ],
    meta,
  );
  const scope = assembleRadarScope(captures, []);
  assert.equal(captures.length, 3);
  assert.equal(scope.captures.length, 2);
  assert.equal(scope.captures[0].dropped, 3);
  assert.equal(scope.contacts.length, 1);
  assert.equal(scope.bleeps, 2);
});
