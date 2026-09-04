import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { TN_MISSING_GAMES } from "../src/data/tn-missing.ts";
import { looksLikeDateName, unionBundledGames } from "../src/data/states/parse.server.ts";
import { hasNamedFace, ticketArt } from "../src/data/ticket-art.ts";
import { isDeskPrice } from "../src/lib/heat.ts";
import {
  ticketChrome,
  ticketChromeFingerprint,
  ticketFamily,
} from "../src/lib/ticket-chrome.ts";
import { skipNameLocked, SKIP_TEASER_CLEAR } from "../src/lib/skip-teaser.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function game(overrides = {}) {
  return {
    number: 1363,
    name: "$50, $100 OR $500!",
    price: 10,
    topPrize: 500,
    odds: 7.89,
    tiers: [{ amount: 500, remaining: null }],
    source: "public-compiled",
    theme: "frenzy",
    ...overrides,
  };
}

test("named TN photos are only used for that exact game number", () => {
  const frenzy = game({ number: 1359, name: "$1,000 Frenzy", price: 10, theme: "frenzy", stateId: "tn" });
  const or500 = game({ number: 1363, name: "$50, $100 OR $500!", price: 10, theme: "frenzy", stateId: "tn" });
  const fever = game({ number: 1391, name: "$500 Fever", price: 10, theme: "frenzy", stateId: "tn" });
  const win200x = game({ number: 1315, name: "200X The Win", price: 20, theme: "multiplier", stateId: "tn" });
  const twoHundredX = game({ number: 1370, name: "200X", price: 20, theme: "multiplier", stateId: "tn" });
  const collectible5 = game({ number: 1395, name: "Jumbo Bucks Collectible", price: 5, theme: "jumbo", stateId: "tn" });
  const collectible10 = game({ number: 1396, name: "Jumbo Bucks Collectible", price: 10, theme: "jumbo", stateId: "tn" });
  const seasons = game({ number: 1401, name: "Jumbo Bucks Seasons", price: 3, theme: "jumbo", stateId: "tn" });
  const payMe = game({ number: 1388, name: "Pay Me!", price: 1, theme: "cash", stateId: "tn" });

  assert.equal(ticketArt(frenzy), "/tickets/1359.jpg");
  assert.equal(hasNamedFace(frenzy), true);
  assert.equal(ticketArt(collectible5), "/tickets/1395.jpg");
  assert.equal(ticketArt(collectible10), "/tickets/1396.jpg");
  assert.equal(ticketArt(seasons), "/tickets/1401.jpg");
  assert.equal(ticketArt(payMe), "/tickets/1388.jpg");

  assert.equal(ticketArt(or500), null);
  assert.equal(hasNamedFace(or500), false);
  assert.notEqual(ticketArt(or500), "/tickets/1359.jpg");

  assert.equal(ticketArt(fever), null);
  assert.equal(ticketArt(win200x), null);
  assert.equal(ticketArt(twoHundredX), "/tickets/1370.jpg");

  const collectible = game({
    number: 1397,
    name: "Jumbo Bucks Collectible",
    price: 20,
    theme: "jumbo",
    stateId: "tn",
  });
  assert.equal(ticketArt(collectible), "/tickets/1397.jpg");
  assert.equal(hasNamedFace(collectible), true);
});

test("ticketArt never returns another game's jpg", () => {
  const catalog = [
    game({ number: 1359, name: "$1,000 Frenzy", stateId: "tn" }),
    game({ number: 1363, name: "$50, $100 OR $500!", stateId: "tn" }),
    game({ number: 1315, name: "200X The Win", theme: "multiplier", price: 20, stateId: "tn" }),
    game({ number: 1856, name: "Jumbo Bucks Crossword", theme: "crossword", price: 20, stateId: "tn" }),
    game({ number: 1348, name: "Money Rush", theme: "cash", price: 5, stateId: "tn" }),
    game({ number: 1364, name: "Jumbo Bucks Extravaganza", theme: "jumbo", price: 50, stateId: "tn" }),
  ];
  for (const row of catalog) {
    const art = ticketArt(row);
    if (art == null) {
      assert.equal(hasNamedFace(row), false);
      continue;
    }
    assert.equal(art, `/tickets/${row.number}.jpg`);
    assert.match(art, /^\/tickets\/\d+\.jpg$/);
  }
});

test("non-TN desks never reuse a Tennessee reconstruction", () => {
  const kySameNumber = game({
    number: 1359,
    name: "Kentucky Frenzy",
    stateId: "ky",
    theme: "frenzy",
    price: 10,
  });
  const scJumbo = game({
    number: 1699,
    name: "Giant Jumbo Bucks",
    stateId: "sc",
    theme: "jumbo",
    price: 5,
  });
  for (const id of ["ky", "sc", "ok", "mi", "az", "nc", "pa", "tx", "mo", "oh", "il", "ma", "ia", "id", "ct"]) {
    const row = game({ number: 1364, name: "Other Jumbo", stateId: id, theme: "jumbo", price: 50 });
    assert.equal(hasNamedFace(row), false);
    assert.equal(ticketArt(row), null);
  }
  assert.equal(ticketArt(kySameNumber), null);
  assert.equal(ticketArt(scJumbo), null);
});

test("header match label and theme fallbacks are gone", () => {
  const face = readFileSync(join(root, "src/components/ticket-face.tsx"), "utf8");
  const data = readFileSync(join(root, "src/data/ticket-art.ts"), "utf8");
  const games = readFileSync(join(root, "src/data/games.ts"), "utf8");
  assert.equal(face.includes("header match"), false);
  assert.equal(data.includes("header match"), false);
  assert.equal(games.includes("header match"), false);
  assert.equal(data.includes('return "/tickets/1370.jpg"'), false);
  assert.equal(data.includes("game.theme ==="), false);
  assert.equal(games.includes("game.theme ==="), false);
});

test("every catalog number gets a unique chrome fingerprint", () => {
  const src = readFileSync(join(root, "src/data/games.ts"), "utf8");
  const numbers = [...src.matchAll(/^\s+number: (\d+),/gm)].map((m) => Number(m[1]));
  assert.ok(numbers.includes(1363));
  assert.ok(numbers.includes(1359));
  const seen = new Set();
  for (const number of numbers) {
    const row = game({ number, name: `Game ${number}`, stateId: "tn" });
    const key = ticketChromeFingerprint(row);
    assert.equal(seen.has(key), false, `duplicate chrome ${key}`);
    seen.add(key);
  }
  assert.equal(seen.size, numbers.length);
});

test("chrome family follows ticket name vibe", () => {
  assert.equal(ticketFamily("$1,000 Frenzy", "frenzy"), "frenzy");
  assert.equal(ticketFamily("Queen of Hearts", "cash"), "hearts");
  assert.equal(ticketFamily("Lincoln", "cash"), "currency");
  assert.equal(ticketFamily("Wild Cash 50X", "multiplier"), "wild");
  assert.equal(ticketFamily("Lucky Horseshoe Crossword", "crossword"), "crossword");
  assert.equal(ticketFamily("Jumbo Bucks Extravaganza", "jumbo"), "gold");
  assert.equal(ticketFamily("Merry Multiplier", "multiplier"), "holiday");
  assert.equal(ticketFamily("Holiday Bonus", "cash"), "holiday");
  assert.equal(ticketFamily("Jumbo Bucks Crossword", "crossword"), "crossword");
  assert.equal(ticketFamily("Cowboys", "cash"), "sports");
  assert.equal(ticketFamily("Houston Texans", "cash"), "sports");
  assert.equal(ticketFamily("Loteria Azul", "cash"), "loteria");
  assert.equal(ticketFamily("Ultimate Millions", "high"), "high");
  assert.equal(ticketFamily("Mega Super Hot 7s", "cash"), "sevens");
});

test("same theme and price still get different chrome", () => {
  const a = ticketChrome(game({ number: 1363, name: "$50, $100 OR $500!", theme: "frenzy", price: 10, stateId: "tn" }));
  const b = ticketChrome(game({ number: 1391, name: "$500 Fever", theme: "frenzy", price: 10, stateId: "tn" }));
  const c = ticketChrome(game({ number: 1359, name: "$1,000 Frenzy", theme: "frenzy", price: 10, stateId: "tn" }));
  const ky = ticketChrome(game({ number: 1363, name: "$50, $100 OR $500!", theme: "frenzy", price: 10, stateId: "ky" }));
  const visual = (s) => `${s.family}|${s.sashAngle}|${s.extraCount}|${s.nudge}`;
  assert.notEqual(visual(a), visual(b));
  assert.notEqual(visual(a), visual(c));
  assert.notEqual(visual(b), visual(c));
  assert.notEqual(visual(a), visual(ky));
  assert.equal(a.number, 1363);
  assert.equal(ky.state, "ky");
});

test("spot-check case-match packs for public desks", () => {
  const merry = ticketChrome(game({ number: 107, name: "Merry Multiplier", theme: "multiplier", price: 5, topPrize: 100000, stateId: "ky" }));
  const holiday = ticketChrome(game({ number: 1346, name: "Holiday Bonus", theme: "cash", price: 20, topPrize: 500000, stateId: "tn" }));
  const jumbo = ticketChrome(game({ number: 1699, name: "Giant Jumbo Bucks", theme: "jumbo", price: 5, topPrize: 250000, stateId: "sc" }));
  const loteria = ticketChrome(game({ number: 2765, name: "Loteria Azul", theme: "cash", price: 5, topPrize: 100000, stateId: "tx" }));
  const cowboys = ticketChrome(game({ number: 2754, name: "Cowboys", theme: "cash", price: 5, topPrize: 100000, stateId: "tx" }));
  const texans = ticketChrome(game({ number: 2755, name: "Houston Texans", theme: "cash", price: 5, topPrize: 100000, stateId: "tx" }));
  const ultimate = ticketChrome(game({ number: 637, name: "Ultimate Millions", theme: "high", price: 50, topPrize: 3000000, stateId: "ok" }));
  assert.equal(merry.family, "holiday");
  assert.equal(holiday.family, "holiday");
  assert.notEqual(
    `${merry.sashAngle}|${merry.extraCount}|${merry.nudge}`,
    `${holiday.sashAngle}|${holiday.extraCount}|${holiday.nudge}`,
  );
  assert.equal(jumbo.family, "gold");
  assert.equal(loteria.family, "loteria");
  assert.equal(cowboys.family, "sports");
  assert.equal(cowboys.sportsKind, "cowboys");
  assert.equal(texans.family, "sports");
  assert.equal(texans.sportsKind, "texans");
  assert.notEqual(cowboys.palette.bg, texans.palette.bg);
  assert.equal(ultimate.family, "high");
  assert.equal(merry.winUpTo.includes("100,000") || merry.winUpTo.includes("100000"), true);
});

test("every public-state $5+ game gets a unique chrome fingerprint", () => {
  const desks = ["tn", "ky", "sc", "ok", "nc", "pa", "tx", "mo", "ia", "id"];
  const seen = new Set();
  let count = 0;
  for (const id of desks) {
    const snap = JSON.parse(readFileSync(join(root, `src/data/states/last-good/${id}.json`), "utf8"));
    const bundled = id === "tn" ? TN_MISSING_GAMES.map((g) => ({ ...g, stateId: "tn" })) : [];
    const catalog = unionBundledGames(
      snap.catalog.map((g) => ({ ...g, stateId: id })),
      bundled,
    );
    for (const row of catalog) {
      if (!isDeskPrice(row.price)) continue;
      const key = ticketChromeFingerprint(row);
      assert.equal(seen.has(key), false, `duplicate chrome ${key}`);
      seen.add(key);
      count += 1;
      assert.equal(looksLikeDateName(row.name), false, `${id} #${row.number} date name`);
    }
  }
  assert.ok(count > 80);
});

test("guest skip teaser shows two names and locks the rest", () => {
  assert.equal(SKIP_TEASER_CLEAR, 2);
  assert.equal(skipNameLocked(0, false), false);
  assert.equal(skipNameLocked(1, false), false);
  assert.equal(skipNameLocked(2, false), true);
  assert.equal(skipNameLocked(3, false), true);
  assert.equal(skipNameLocked(4, false), true);
  for (let i = 0; i < 5; i += 1) {
    assert.equal(skipNameLocked(i, true), false);
  }
});

test("homepage skip rows send locked names to pricing", () => {
  const home = readFileSync(join(root, "src/routes/index.tsx"), "utf8");
  assert.equal(home.includes('to="/pricing"'), true);
  assert.equal(home.includes("skipNameLocked"), true);
  assert.equal(home.includes("home.skipHidden"), true);
});

test("ticket faces caption independent reconstructions", () => {
  const face = readFileSync(join(root, "src/components/ticket-face.tsx"), "utf8");
  const chrome = readFileSync(join(root, "src/components/ticket-chrome.tsx"), "utf8");
  const card = readFileSync(join(root, "src/components/ticket-card.tsx"), "utf8");
  const en = JSON.parse(readFileSync(join(root, "src/locales/en.json"), "utf8"));
  assert.equal(en["card.reconstruction"], "Independent reconstruction — not official ticket art.");
  assert.equal(face.includes("card.reconstruction"), true);
  assert.equal(chrome.includes("Independent reconstruction — not official ticket art."), true);
  assert.equal(chrome.includes('viewBox="0 0 360 480"'), true);
  assert.equal(chrome.includes("WIN UP TO"), true);
  assert.equal(face.includes("aspect-[3/4]"), true);
  assert.equal(face.includes("aspect-[360/216]"), true);
  assert.equal(card.includes("absolute top-3"), false);
  assert.equal(/Kentucky Lottery|Lottery Tennessee|ScratchSmarter|LottoEdge/i.test(chrome), false);
  assert.equal(existsSync(join(root, "public/tickets/1395.jpg")), true);
  assert.equal(existsSync(join(root, "public/tickets/1396.jpg")), true);
  assert.equal(existsSync(join(root, "public/tickets/1401.jpg")), true);
  assert.equal(existsSync(join(root, "public/tickets/1388.jpg")), true);
});
