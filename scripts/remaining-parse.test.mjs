import assert from "node:assert/strict";
import { test } from "node:test";
import {
  money,
  remainingCount,
  parseOfficialRemaining,
  gamesFromParse,
  mergeKnownGames,
  toCatalog,
  isImportedJunkGame,
  trustedCatalog,
} from "../src/data/states/parse.server.ts";

test("remaining counts stay published integers or null", () => {
  assert.equal(remainingCount("12"), 12);
  assert.equal(remainingCount("1,204"), 1204);
  assert.equal(remainingCount("0"), 0);
  assert.equal(remainingCount("—"), null);
  assert.equal(remainingCount(""), null);
  assert.equal(remainingCount("unknown"), null);
  assert.equal(remainingCount("n/a"), null);
  assert.equal(money("$5,000"), 5000);
});

test("Iowa scratch table maps Unclaimed and ignores pull-tabs", () => {
  const html = `
    <table id="RemainPrizes_JS_DATATABLE">
      <tr>
        <td>$50,000 JACKPOT (700)</td>
        <td>Scratch</td>
        <td>$5</td>
        <td>$50,000</td>
        <td>2</td>
        <td>3</td>
      </tr>
      <tr>
        <td>$50,000 JACKPOT (700)</td>
        <td>Scratch</td>
        <td>$5</td>
        <td>$1,000</td>
        <td>4</td>
        <td>8</td>
      </tr>
      <tr>
        <td>Lucky Tab (9)</td>
        <td>Pull-tab</td>
        <td>$1</td>
        <td>$500</td>
        <td>1</td>
        <td>9</td>
      </tr>
    </table>
  `;
  const parsed = parseOfficialRemaining("ia", html);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].number, 700);
  assert.equal(parsed[0].price, 5);
  assert.deepEqual(
    parsed[0].prizes.map((p) => p.remaining),
    [3, 8],
  );
  const games = gamesFromParse("ia", parsed, []);
  assert.equal(games.length, 1);
  assert.equal(games[0].tiers[0].remaining, 3);
});

test("merge overlays remaining onto known games without inventing price or missing counts", () => {
  const known = [
    {
      number: 700,
      name: "$50,000 JACKPOT",
      price: 5,
      topPrize: 50000,
      odds: 3.95,
      source: "official-remaining",
      theme: "cash",
      tiers: [
        { amount: 50000, remaining: 9 },
        { amount: 1000, remaining: 4 },
        { amount: 200, remaining: null },
      ],
    },
  ];
  const merged = mergeKnownGames(
    known,
    [
      {
        number: 700,
        name: "$50,000 JACKPOT",
        price: 5,
        prizes: [
          { amount: 50000, remaining: 3 },
          { amount: 1000, remaining: 8 },
        ],
      },
    ],
    "ia",
  );
  assert.equal(merged[0].price, 5);
  assert.equal(merged[0].tiers[0].remaining, 3);
  assert.equal(merged[0].tiers[1].remaining, 8);
  assert.equal(merged[0].tiers[2].remaining, null);
});

test("unpublished remaining is not invented when converting catalogs", () => {
  const games = toCatalog(
    [
      {
        number: 10,
        name: "Partial",
        price: 10,
        prizes: [
          { amount: 100000, remaining: 2 },
          { amount: 5000, remaining: null },
        ],
      },
    ],
    "official-remaining",
  );
  assert.equal(games[0].tiers[1].remaining, null);
  assert.equal(games[0].tiers[0].remaining, 2);
});

test("SC garbled extras and MO prize-amount rows are junk", () => {
  assert.equal(
    isImportedJunkGame({
      number: 1,
      name: "100X (# 1664 ) No longer available to purchase.",
    }),
    true,
  );
  assert.equal(isImportedJunkGame({ number: 77777, name: "5" }), true);
  assert.equal(isImportedJunkGame({ number: 5000, name: "50" }), true);
  assert.equal(isImportedJunkGame({ number: 1699, name: "Giant Jumbo Bucks" }), false);
  assert.equal(isImportedJunkGame({ number: 536, name: "$100,000 TAXES PAID" }), false);
});

test("merge does not import SC/MO junk extras onto a clean catalog", () => {
  const known = [
    {
      number: 1699,
      name: "Giant Jumbo Bucks",
      price: 5,
      topPrize: 250000,
      odds: 3.97,
      source: "official-remaining",
      theme: "jumbo",
      tiers: [{ amount: 250000, remaining: 6 }],
    },
    {
      number: 77777,
      name: "5",
      price: 5,
      topPrize: 77777,
      odds: 3.95,
      source: "official-remaining",
      theme: "cash",
      tiers: [{ amount: 77777, remaining: 2 }],
    },
  ];
  const merged = mergeKnownGames(
    known,
    [
      {
        number: 1699,
        name: "Giant Jumbo Bucks",
        price: 5,
        prizes: [{ amount: 250000, remaining: 5 }],
      },
      {
        number: 451,
        name: "$100, $200 or $300! (# 1660 )",
        price: 10,
        prizes: [{ amount: 300, remaining: 451 }],
      },
      {
        number: 77777,
        name: "5",
        price: 5,
        prizes: [{ amount: 77777, remaining: 1 }],
      },
    ],
    "sc",
  );
  assert.equal(merged.length, 1);
  assert.equal(merged[0].number, 1699);
  assert.equal(merged[0].tiers[0].remaining, 5);
  assert.equal(trustedCatalog(known).length, 1);
  const fromParse = gamesFromParse("mo", [], known);
  assert.equal(fromParse.length, 1);
});
