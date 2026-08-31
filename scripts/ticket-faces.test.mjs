import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { hasNamedFace, ticketArt } from "../src/data/ticket-art.ts";
import {
  ticketChrome,
  ticketChromeFingerprint,
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

  assert.equal(ticketArt(frenzy), "/tickets/1359.jpg");
  assert.equal(hasNamedFace(frenzy), true);

  assert.equal(ticketArt(or500), null);
  assert.equal(hasNamedFace(or500), false);
  assert.notEqual(ticketArt(or500), "/tickets/1359.jpg");

  assert.equal(ticketArt(fever), null);
  assert.equal(ticketArt(win200x), null);
  assert.equal(ticketArt(twoHundredX), "/tickets/1370.jpg");
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

test("same theme and price still get different chrome", () => {
  const a = ticketChrome(game({ number: 1363, name: "$50, $100 OR $500!", theme: "frenzy", price: 10, stateId: "tn" }));
  const b = ticketChrome(game({ number: 1391, name: "$500 Fever", theme: "frenzy", price: 10, stateId: "tn" }));
  const c = ticketChrome(game({ number: 1359, name: "$1,000 Frenzy", theme: "frenzy", price: 10, stateId: "tn" }));
  const ky = ticketChrome(game({ number: 1363, name: "$50, $100 OR $500!", theme: "frenzy", price: 10, stateId: "ky" }));
  const visual = (s) => `${s.paletteIndex}|${s.sashIndex}|${s.pattern}|${s.rotate}|${s.phase}`;
  assert.notEqual(visual(a), visual(b));
  assert.notEqual(visual(a), visual(c));
  assert.notEqual(visual(b), visual(c));
  assert.notEqual(visual(a), visual(ky));
  assert.equal(a.number, 1363);
  assert.equal(ky.state, "ky");
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
