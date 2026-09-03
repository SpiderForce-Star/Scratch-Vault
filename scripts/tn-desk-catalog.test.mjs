import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { TN_MISSING_GAMES } from "../src/data/tn-missing.ts";
import { isNewCatalogGame, isUnpostedNewGame } from "../src/data/tn-snapshot.ts";
import { unionBundledGames } from "../src/data/states/parse.server.ts";
import { scoreGame } from "../src/lib/heat.server.ts";
import { pickNewGames, pickSkipGames, pickTripGames, reportMap } from "../src/lib/heat.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

test("TN catalog includes missing live games and keeps unique numbers", () => {
  const numbers = TN_MISSING_GAMES.map((g) => g.number);
  assert.equal(new Set(numbers).size, numbers.length);
  for (const n of [1395, 1397, 1401, 1388, 1383, 1851, 1393, 1394, 1396, 1365]) {
    assert.equal(TN_MISSING_GAMES.some((g) => g.number === n), true, `missing #${n}`);
  }
  assert.match(read("src/data/games.ts"), /TN_MISSING_GAMES/);
  const franklin = TN_MISSING_GAMES.find((g) => g.number === 1397);
  assert.equal(franklin?.name, "Jumbo Bucks Collectible");
  assert.equal(franklin?.price, 20);
  assert.equal(franklin?.topPrize, 1_000_000);
  assert.equal(franklin?.odds, 2.97);
  assert.equal(
    franklin?.tiers.every((tier) => tier.remaining == null),
    true,
  );
});

test("unposted new games score NEW and stay off SKIP THESE", () => {
  const franklin = TN_MISSING_GAMES.find((g) => g.number === 1397);
  assert.ok(franklin);
  assert.equal(isNewCatalogGame(franklin), true);
  assert.equal(isUnpostedNewGame(franklin), true);
  const heat = scoreGame(franklin);
  assert.equal(heat.band, "new");
  assert.equal(heat.vault, 0);
  assert.equal(heat.bust, false);

  const reports = reportMap({ 1397: heat });
  const skip = pickSkipGames([franklin], reports, "20", 5);
  assert.equal(skip.length, 0);
});

test("desk still recommends 3 review cards per $5–$50 price", () => {
  const extras = [
    { number: 1358, name: "$500 Frenzy", price: 5, topPrize: 500, odds: 4.19, source: "public-compiled", theme: "frenzy", tiers: [{ amount: 500, remaining: 245 }, { amount: 100, remaining: null }, { amount: 50, remaining: null }] },
    { number: 1372, name: "Jumbo Bucks Triple Play", price: 5, topPrize: 150000, odds: 4.01, source: "public-compiled", theme: "jumbo", tiers: [{ amount: 150000, remaining: 1 }, { amount: 5000, remaining: null }, { amount: 1000, remaining: null }] },
    { number: 1996, name: "Giant Jumbo Bucks", price: 5, topPrize: 150000, odds: 4, source: "tn-remaining", theme: "jumbo", tiers: [{ amount: 150000, remaining: 9 }, { amount: 5000, remaining: 12 }, { amount: 1000, remaining: 613 }] },
    { number: 1359, name: "$1,000 Frenzy", price: 10, topPrize: 1000, odds: 3.61, source: "public-compiled", theme: "frenzy", tiers: [{ amount: 1000, remaining: 611 }, { amount: 200, remaining: null }, { amount: 100, remaining: null }] },
    { number: 1373, name: "King's Ransom", price: 10, topPrize: 500000, odds: 3.16, source: "public-compiled", theme: "high", tiers: [{ amount: 500000, remaining: 2 }, { amount: 10000, remaining: null }, { amount: 1000, remaining: null }] },
    { number: 1369, name: "100X", price: 10, topPrize: 500000, odds: 3.55, source: "tn-remaining", theme: "multiplier", tiers: [{ amount: 500000, remaining: 2 }, { amount: 10000, remaining: 8 }, { amount: 1000, remaining: 360 }] },
    { number: 1355, name: "Mega Play Jumbo Bucks Crossword", price: 20, topPrize: 1000000, odds: 2.57, source: "public-compiled", theme: "crossword", tiers: [{ amount: 1000000, remaining: 3 }, { amount: 20000, remaining: null }, { amount: 5000, remaining: null }] },
    { number: 1360, name: "$2,000 Frenzy", price: 20, topPrize: 2000, odds: 3, source: "public-compiled", theme: "frenzy", tiers: [{ amount: 2000, remaining: 274 }, { amount: 500, remaining: null }, { amount: 200, remaining: null }] },
    { number: 1370, name: "200X", price: 20, topPrize: 1000000, odds: 3.33, source: "tn-remaining", theme: "multiplier", tiers: [{ amount: 1000000, remaining: 1 }, { amount: 40000, remaining: 0 }, { amount: 10000, remaining: 2 }] },
    { number: 1990, name: "Mega Millionaire Jumbo Bucks", price: 25, topPrize: 2000000, odds: 2.91, source: "tn-remaining", theme: "jumbo", tiers: [{ amount: 2000000, remaining: 1 }, { amount: 100000, remaining: 1 }, { amount: 20000, remaining: 6 }] },
    { number: 1265, name: "$3,000 Loaded", price: 30, topPrize: 3000, odds: 2.74, source: "public-compiled", theme: "frenzy", tiers: [{ amount: 3000, remaining: 68 }, { amount: 500, remaining: null }, { amount: 200, remaining: null }] },
    { number: 1350, name: "Jumbo Bucks Super Supreme", price: 30, topPrize: 3000000, odds: 2.89, source: "public-compiled", theme: "jumbo", tiers: [{ amount: 3000000, remaining: 2 }, { amount: 50000, remaining: null }, { amount: 10000, remaining: null }] },
    { number: 1247, name: "Deluxe Gold", price: 30, topPrize: 3000000, odds: 3.09, source: "public-compiled", theme: "high", tiers: [{ amount: 3000000, remaining: 1 }, { amount: 50000, remaining: null }, { amount: 10000, remaining: null }] },
    { number: 1310, name: "The Fastest Road To A $1 Million", price: 50, topPrize: 1000000, odds: 2.64, source: "public-compiled", theme: "high", tiers: [{ amount: 1000000, remaining: 3 }, { amount: 50000, remaining: null }, { amount: 10000, remaining: null }] },
    { number: 1364, name: "Jumbo Bucks Extravaganza", price: 50, topPrize: 5000000, odds: 2.76, source: "public-compiled", theme: "jumbo", tiers: [{ amount: 5000000, remaining: 1 }, { amount: 100000, remaining: null }, { amount: 20000, remaining: null }] },
  ];
  const catalog = [...extras, ...TN_MISSING_GAMES];
  const reports = new Map(catalog.map((game) => [game.number, scoreGame(game)]));
  for (const price of ["5", "10", "20", "25", "30", "50"]) {
    const trip = pickTripGames(catalog, reports, price, 3);
    const live = catalog.filter(
      (g) => g.price === Number(price) && scoreGame(g).band !== "new",
    );
    assert.ok(trip.length <= 3, `$${price} must not dump the full book`);
    assert.equal(trip.length, Math.min(3, live.length), `$${price} review count`);
    assert.equal(
      trip.every((g) => g.price === Number(price) && scoreGame(g).band !== "new"),
      true,
    );
  }
});

test("new games strip prefers unposted collectible tickets", () => {
  const reports = new Map(TN_MISSING_GAMES.map((game) => [game.number, scoreGame(game)]));
  const fresh = pickNewGames(TN_MISSING_GAMES, reports, 8);
  assert.ok(fresh.length >= 1);
  assert.equal(fresh.some((g) => g.number === 1397), true);
  assert.equal(fresh.every((g) => isNewCatalogGame(g)), true);
});

test("snapshot union adds bundled games without inventing remaining", () => {
  const snapshot = [
    {
      number: 1358,
      name: "$500 Frenzy",
      price: 5,
      topPrize: 500,
      odds: 4.19,
      source: "public-compiled",
      theme: "frenzy",
      tiers: [
        { amount: 500, remaining: 245 },
        { amount: 100, remaining: null },
        { amount: 50, remaining: null },
      ],
    },
  ];
  const merged = unionBundledGames(snapshot, TN_MISSING_GAMES);
  const frenzy = merged.find((g) => g.number === 1358);
  const collectible = merged.find((g) => g.number === 1397);
  assert.equal(frenzy?.tiers[0]?.remaining, 245);
  assert.ok(collectible);
  assert.equal(collectible.tiers[0]?.remaining, null);
  assert.ok(merged.length > snapshot.length);
});

test("skip copy and Franklin reconstruction are on the desk", () => {
  const en = JSON.parse(read("src/locales/en.json"));
  const es = JSON.parse(read("src/locales/es.json"));
  const home = read("src/routes/index.tsx");
  assert.equal(en["home.skipKicker"], "SKIP THESE");
  assert.equal(en["home.skipTitle"], "Don't waste money on a drained game.");
  assert.equal(es["home.skipKicker"], "SÁLTATE ESTOS");
  assert.equal(es["home.skipTitle"], "No desperdicies dinero en un juego agotado.");
  assert.match(home, /font-display text-4xl tracking-\[0\.16em\] text-gold/);
  assert.match(home, /to="\/games"/);
  assert.match(home, /home\.catalogLine/);
  assert.equal(existsSync(join(root, "public/tickets/1397.jpg")), true);
  assert.equal(existsSync(join(root, "public/tickets/1395.jpg")), true);
  assert.equal(existsSync(join(root, "public/tickets/1401.jpg")), true);
  assert.equal(existsSync(join(root, "public/tickets/1388.jpg")), true);
  assert.match(read("src/data/ticket-art.ts"), /1397/);
  assert.match(read("src/data/ticket-art.ts"), /1395/);
  assert.match(read("src/data/ticket-art.ts"), /1388/);
  assert.match(read("src/data/ticket-art.ts"), /1401/);
});
