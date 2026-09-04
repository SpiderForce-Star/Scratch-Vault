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
  sanitizeGameName,
  looksLikeDateName,
  unionBundledGames,
} from "../src/data/states/parse.server.ts";

test("sanitizeGameName strips leftover HTML fragments", () => {
  assert.equal(sanitizeGameName("/span> $5 Set For Life"), "$5 Set For Life");
  assert.equal(sanitizeGameName("Wild Cash 50X"), "Wild Cash 50X");
  const cleaned = trustedCatalog([
    {
      number: 153,
      name: "/span> $5 Set For Life",
      price: 5,
      topPrize: 343000,
      odds: 3.95,
      source: "official-remaining",
      theme: "cash",
      tiers: [{ amount: 343000, remaining: 3 }],
    },
  ]);
  assert.equal(cleaned[0].name, "$5 Set For Life");
});

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

test("looksLikeDateName flags Texas start dates", () => {
  assert.equal(looksLikeDateName("01/05/26"), true);
  assert.equal(looksLikeDateName("9/16/24"), true);
  assert.equal(looksLikeDateName("50X The Cash"), false);
  assert.equal(isImportedJunkGame({ number: 2712, name: "01/05/26" }), true);
  assert.equal(isImportedJunkGame({ number: 2712, name: "50X The Cash" }), false);
});

test("parseTx reads Game Name after Start Date, remaining = printed − claimed", () => {
  const html = `
    <table>
      <thead><tr>
        <th>Game Number</th><th>Start Date</th><th>Ticket Price</th><th>&nbsp;</th>
        <th>Game Name</th><th>Prize Amount</th><th>Prizes Printed</th><th>Prizes Claimed</th>
      </tr></thead>
      <tbody>
        <tr>
          <td><a>2712</a></td>
          <td>01/05/26</td>
          <td>$5</td>
          <td>&nbsp;</td>
          <td>50X The Cash</td>
          <td>$200,000</td>
          <td>4</td>
          <td>2</td>
        </tr>
        <tr>
          <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
          <td>$5,000</td>
          <td>8</td>
          <td>5</td>
        </tr>
        <tr>
          <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
          <td>$500</td>
          <td>871</td>
          <td>522</td>
        </tr>
      </tbody>
    </table>
  `;
  const parsed = parseOfficialRemaining("tx", html);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].number, 2712);
  assert.equal(parsed[0].name, "50X The Cash");
  assert.equal(parsed[0].price, 5);
  assert.equal(looksLikeDateName(parsed[0].name), false);
  assert.deepEqual(
    parsed[0].prizes.map((p) => [p.amount, p.remaining]),
    [
      [200000, 2],
      [5000, 3],
      [500, 349],
    ],
  );
});

test("unionBundledGames yields date snapshot names to bundled names and keeps remaining", () => {
  const snapshot = [
    {
      number: 2712,
      name: "01/05/26",
      price: 5,
      topPrize: 200000,
      odds: 3.95,
      source: "official-remaining",
      theme: "multiplier",
      tiers: [
        { amount: 200000, remaining: 2 },
        { amount: 5000, remaining: 3 },
      ],
    },
  ];
  const bundled = [
    {
      number: 2712,
      name: "50X The Cash",
      price: 5,
      topPrize: 200000,
      odds: 3.95,
      source: "official-remaining",
      theme: "multiplier",
      tiers: [
        { amount: 200000, remaining: null },
        { amount: 5000, remaining: null },
      ],
    },
  ];
  const unioned = unionBundledGames(snapshot, bundled);
  assert.equal(unioned.length, 1);
  assert.equal(unioned[0].name, "50X The Cash");
  assert.equal(unioned[0].tiers[0].remaining, 2);
  assert.equal(unioned[0].tiers[1].remaining, 3);
});

test("parseId reads remaining from the live remaining-prizes cards", () => {
  const html = `
    <ul class="games">
      <li class="game js-checkbox-parent" data-game-id="1847">
        <h5 class="game__title">$1,000,000 King</h5>
        <span class="game__info-price">$50.00</span>
        <table class="scratch-prizes">
          <tr>
            <td>$<span class="prizes-prize">1000000</span></td>
            <td class="prizes-remaining">1</td>
          </tr>
          <tr>
            <td>$<span class="prizes-prize">10000</span></td>
            <td class="prizes-remaining">0</td>
          </tr>
          <tr>
            <td>$<span class="prizes-prize">1000</span></td>
            <td class="prizes-remaining">4</td>
          </tr>
        </table>
      </li>
    </ul>
  `;
  const parsed = parseOfficialRemaining("id", html);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].number, 1847);
  assert.equal(parsed[0].name, "$1,000,000 King");
  assert.equal(parsed[0].price, 50);
  assert.deepEqual(
    parsed[0].prizes.map((p) => [p.amount, p.remaining]),
    [
      [1000000, 1],
      [10000, 0],
      [1000, 4],
    ],
  );
});
