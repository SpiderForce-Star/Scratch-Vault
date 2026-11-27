import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { TN_MISSING_GAMES } from "../src/data/tn-missing.ts";
import { looksLikeDateName, unionBundledGames } from "../src/data/states/parse.server.ts";
import { hasNamedFace, ticketArt } from "../src/data/ticket-art.ts";
import { isDeskPrice } from "../src/lib/heat.ts";
import {
  FAMILY_PALETTES,
  ticketChrome,
  ticketChromeFingerprint,
  ticketFamily,
  ticketMotif,
} from "../src/lib/ticket-chrome.ts";
import { hexDistance, paletteFromRgba } from "../src/lib/ticket-palette.ts";
import { lookupTicketFace } from "../src/lib/ticket-faces.ts";
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
  const frenzy = game({
    number: 1359,
    name: "$1,000 Frenzy",
    price: 10,
    theme: "frenzy",
    stateId: "tn",
  });
  const or500 = game({
    number: 1363,
    name: "$50, $100 OR $500!",
    price: 10,
    theme: "frenzy",
    stateId: "tn",
  });
  const fever = game({
    number: 1391,
    name: "$500 Fever",
    price: 10,
    theme: "frenzy",
    stateId: "tn",
  });
  const win200x = game({
    number: 1315,
    name: "200X The Win",
    price: 20,
    theme: "multiplier",
    stateId: "tn",
  });
  const twoHundredX = game({
    number: 1370,
    name: "200X",
    price: 20,
    theme: "multiplier",
    stateId: "tn",
  });
  const collectible5 = game({
    number: 1395,
    name: "Jumbo Bucks Collectible",
    price: 5,
    theme: "jumbo",
    stateId: "tn",
  });
  const collectible10 = game({
    number: 1396,
    name: "Jumbo Bucks Collectible",
    price: 10,
    theme: "jumbo",
    stateId: "tn",
  });
  const seasons = game({
    number: 1401,
    name: "Jumbo Bucks Seasons",
    price: 3,
    theme: "jumbo",
    stateId: "tn",
  });
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
    game({
      number: 1856,
      name: "Jumbo Bucks Crossword",
      theme: "crossword",
      price: 20,
      stateId: "tn",
    }),
    game({ number: 1348, name: "Money Rush", theme: "cash", price: 5, stateId: "tn" }),
    game({
      number: 1364,
      name: "Jumbo Bucks Extravaganza",
      theme: "jumbo",
      price: 50,
      stateId: "tn",
    }),
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
  for (const id of [
    "ky",
    "sc",
    "ok",
    "mi",
    "az",
    "nc",
    "pa",
    "tx",
    "mo",
    "oh",
    "il",
    "ma",
    "ia",
    "id",
    "ct",
  ]) {
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
  const a = ticketChrome(
    game({ number: 1363, name: "$50, $100 OR $500!", theme: "frenzy", price: 10, stateId: "tn" }),
  );
  const b = ticketChrome(
    game({ number: 1391, name: "$500 Fever", theme: "frenzy", price: 10, stateId: "tn" }),
  );
  const c = ticketChrome(
    game({ number: 1359, name: "$1,000 Frenzy", theme: "frenzy", price: 10, stateId: "tn" }),
  );
  const ky = ticketChrome(
    game({ number: 1363, name: "$50, $100 OR $500!", theme: "frenzy", price: 10, stateId: "ky" }),
  );
  const visual = (s) => `${s.family}|${s.sashAngle}|${s.extraCount}|${s.nudge}`;
  assert.notEqual(visual(a), visual(b));
  assert.notEqual(visual(a), visual(c));
  assert.notEqual(visual(b), visual(c));
  assert.notEqual(visual(a), visual(ky));
  assert.equal(a.number, 1363);
  assert.equal(ky.state, "ky");
});

test("spot-check case-match packs for public desks", () => {
  const merry = ticketChrome(
    game({
      number: 107,
      name: "Merry Multiplier",
      theme: "multiplier",
      price: 5,
      topPrize: 100000,
      stateId: "ky",
    }),
  );
  const holiday = ticketChrome(
    game({
      number: 1346,
      name: "Holiday Bonus",
      theme: "cash",
      price: 20,
      topPrize: 500000,
      stateId: "tn",
    }),
  );
  const jumbo = ticketChrome(
    game({
      number: 1699,
      name: "Giant Jumbo Bucks",
      theme: "jumbo",
      price: 5,
      topPrize: 250000,
      stateId: "sc",
    }),
  );
  const loteria = ticketChrome(
    game({
      number: 2765,
      name: "Loteria Azul",
      theme: "cash",
      price: 5,
      topPrize: 100000,
      stateId: "tx",
    }),
  );
  const cowboys = ticketChrome(
    game({
      number: 2754,
      name: "Cowboys",
      theme: "cash",
      price: 5,
      topPrize: 100000,
      stateId: "tx",
    }),
  );
  const texans = ticketChrome(
    game({
      number: 2755,
      name: "Houston Texans",
      theme: "cash",
      price: 5,
      topPrize: 100000,
      stateId: "tx",
    }),
  );
  const ultimate = ticketChrome(
    game({
      number: 637,
      name: "Ultimate Millions",
      theme: "high",
      price: 50,
      topPrize: 3000000,
      stateId: "ok",
    }),
  );
  assert.equal(merry.family, "holiday");
  assert.equal(holiday.family, "holiday");
  if (merry.paletteSource === "family") {
    assert.equal(merry.palette.bg, FAMILY_PALETTES.holiday.bg);
    assert.notEqual(merry.palette.bg, FAMILY_PALETTES.multiplier.bg);
  }
  if (holiday.paletteSource === "family") {
    assert.equal(holiday.palette.bg, FAMILY_PALETTES.holiday.bg);
    assert.notEqual(holiday.palette.bg, FAMILY_PALETTES.cash.bg);
  }
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
  if (cowboys.paletteSource === "family" && texans.paletteSource === "family") {
    assert.notEqual(cowboys.palette.bg, texans.palette.bg);
  }
  assert.equal(ultimate.family, "high");
  assert.equal(merry.winUpTo.includes("100,000") || merry.winUpTo.includes("100000"), true);
});

test("every public-state $5+ game gets a unique chrome fingerprint", () => {
  const desks = ["tn", "ky", "sc", "ok", "nc", "pa", "tx", "mo", "ia", "id", "mi", "oh"];
  const seen = new Set();
  let count = 0;
  for (const id of desks) {
    const snap = JSON.parse(
      readFileSync(join(root, `src/data/states/last-good/${id}.json`), "utf8"),
    );
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
      const face = ticketChrome(row);
      assert.match(face.palette.bg, /^#[0-9A-Fa-f]{6}$/);
      assert.match(face.palette.accent, /^#[0-9A-Fa-f]{6}$/);
      assert.match(face.palette.ink, /^#[0-9A-Fa-f]{6}$/);
      assert.ok(face.aspect > 0.2 && face.aspect < 3);
      assert.ok(["grid", "diamonds", "circles", "crossword"].includes(face.motif));
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
  const label = readFileSync(join(root, "src/components/skip-game-label.tsx"), "utf8");
  assert.equal(home.includes('to="/pricing"'), true);
  assert.equal(home.includes("skipNameLocked"), true);
  assert.equal(home.includes("SkipGameLabel"), true);
  assert.equal(label.includes("home.skipHidden"), true);
  assert.match(label, /#\{game\.number\}/);
  assert.match(label, /hideName \?/);
});

test("ticket faces caption independent reconstructions", () => {
  const face = readFileSync(join(root, "src/components/ticket-face.tsx"), "utf8");
  const chrome = readFileSync(join(root, "src/components/ticket-chrome.tsx"), "utf8");
  const card = readFileSync(join(root, "src/components/ticket-card.tsx"), "utf8");
  const en = JSON.parse(readFileSync(join(root, "src/locales/en.json"), "utf8"));
  assert.equal(en["card.reconstruction"], "Independent reconstruction — not official ticket art.");
  assert.equal(face.includes("card.reconstruction"), true);
  assert.equal(card.includes("card.reconstruction"), false);
  assert.equal(card.includes("function Meter"), false);
  assert.equal(card.includes("card.grandPrize"), true);
  assert.equal(card.includes("card.middleNone"), true);
  assert.equal(chrome.includes("Independent reconstruction — not official ticket art."), true);
  assert.equal(chrome.includes("WIN UP TO"), true);
  assert.equal(chrome.includes("GAME "), true);
  assert.equal(chrome.includes("data-ticket-motif"), true);
  assert.equal(face.includes("aspectRatio"), true);
  assert.equal(face.includes("aspect-[3/2]"), false);
  assert.equal(face.includes("aspect-[5/2]"), false);
  assert.equal(face.includes("object-contain object-left"), true);
  assert.equal(face.includes("object-cover"), false);
  assert.equal(face.includes("object-center"), false);
  assert.equal(face.includes("absolute bottom-1.5 left-1.5"), false);
  assert.equal(card.includes("OfficialTableControl"), true);
  assert.equal(card.includes("absolute top-3"), false);
  assert.equal(card.includes("card.reconstruction"), false);
  assert.equal(/Kentucky Lottery|Lottery Tennessee|ScratchSmarter|LottoEdge/i.test(chrome), false);
  const radar = readFileSync(join(root, "src/components/radar-cash-hero.tsx"), "utf8");
  assert.equal(radar.includes("hero.radarKicker"), false);
  assert.equal(chrome.toLowerCase().includes("chevron"), false);
  assert.equal(existsSync(join(root, "public/tickets/1395.jpg")), true);
  assert.equal(existsSync(join(root, "public/tickets/1396.jpg")), true);
  assert.equal(existsSync(join(root, "public/tickets/1397.jpg")), true);
  assert.equal(existsSync(join(root, "public/tickets/1401.jpg")), true);
  assert.equal(existsSync(join(root, "public/tickets/1388.jpg")), true);
});

test("store-rack named bills contain left and phone desk stays one column", () => {
  const face = readFileSync(join(root, "src/components/ticket-face.tsx"), "utf8");
  const card = readFileSync(join(root, "src/components/ticket-card.tsx"), "utf8");
  const home = readFileSync(join(root, "src/routes/index.tsx"), "utf8");
  const header = readFileSync(join(root, "src/components/site-header.tsx"), "utf8");
  const board = readFileSync(join(root, "src/components/games-board.tsx"), "utf8");
  const chrome = readFileSync(join(root, "src/lib/ticket-chrome.ts"), "utf8");
  const en = JSON.parse(readFileSync(join(root, "src/locales/en.json"), "utf8"));

  assert.match(face, /aspectRatio/);
  assert.match(face, /max-w-\[14\.5rem\]/);
  assert.match(face, /object-contain object-left/);
  assert.doesNotMatch(face, /aspect-\[5\/2\]/);
  assert.doesNotMatch(face, /aspect-\[3\/2\]/);
  assert.doesNotMatch(face, /object-cover/);
  assert.doesNotMatch(face, /absolute bottom-1\.5 left-1\.5/);
  assert.match(card, /OfficialTableControl/);
  assert.match(card, /min-h-10/);
  assert.match(card, /line-clamp-2/);
  assert.match(card, /break-normal/);
  assert.match(home, /sticky top-14/);
  assert.doesNotMatch(home, /w-56 shrink-0/);
  assert.doesNotMatch(home, /home\.newKicker/);
  assert.match(board, /sm:grid-cols-2 lg:grid-cols-3/);
  assert.doesNotMatch(board, /(?<!sm:)(?<!lg:)grid-cols-2/);
  assert.match(header, /hidden sm:inline-flex/);
  assert.match(header, /cta\.trialCompact|HeaderTrial/);
  assert.match(header, />Scratch Vault</);
  assert.match(header, /header\.deskChip/);
  assert.ok(home.indexOf("trip.kicker") > 0, "tonight’s 3 stay on home");
  assert.match(home, /home\.listCurrent/);
  assert.match(home, /hidden lg:block/);
  assert.match(home, /sm:grid-cols-2 lg:grid-cols-3/);
  assert.equal(en["home.skipTitle"], "Don't waste money on a drained game.");
  assert.equal(en["hero.titleAll"], "Three tickets to look at. A list to walk past.");
  assert.equal(en["home.listCurrent"], "{{state}} list · Current");
  assert.equal(en["header.deskChip"], "{{short}} · Current");
  assert.match(chrome, /holiday/);
  assert.doesNotMatch(chrome, /lottery seal|official jpeg|tnlottery\.com\/.*\.jpg/i);
});

function paint(width, height, specs) {
  const data = new Uint8ClampedArray(width * height * 4);
  const total = width * height;
  let cursor = 0;
  for (const spec of specs) {
    const n = Math.round(total * spec.share);
    const raw = spec.hex.replace("#", "");
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    for (let i = 0; i < n && cursor < total; i += 1, cursor += 1) {
      const offset = cursor * 4;
      data[offset] = r;
      data[offset + 1] = g;
      data[offset + 2] = b;
      data[offset + 3] = 255;
    }
  }
  while (cursor < total) {
    const offset = cursor * 4;
    data[offset] = 246;
    data[offset + 1] = 9;
    data[offset + 2] = 40;
    data[offset + 3] = 255;
    cursor += 1;
  }
  return data;
}

test("distinctive saturated color wins accent even when it is not the largest cluster", () => {
  const data = paint(48, 48, [
    { hex: "#FFFFFF", share: 0.08 },
    { hex: "#101010", share: 0.05 },
    { hex: "#8E8E8E", share: 0.07 },
    { hex: "#F60928", share: 0.3 },
    { hex: "#F392AD", share: 0.27 },
    { hex: "#2156A1", share: 0.13 },
    { hex: "#A61E30", share: 0.08 },
  ]);
  const palette = paletteFromRgba(data, 48, 48);
  assert.ok(
    hexDistance(palette.accent, "#2156A1") <= 28,
    `accent ${palette.accent} too far from #2156A1`,
  );
});

test("TX #2714 measured accent stays near #2156A1", () => {
  const face = lookupTicketFace("tx", 2714);
  assert.ok(face, "sidecar missing tx:2714");
  assert.equal(face.orientation, "portrait");
  assert.ok(face.aspect < 0.7, `expected a tall ticket, aspect ${face.aspect}`);
  assert.ok(
    hexDistance(face.accent, "#2156A1") <= 36,
    `accent ${face.accent} too far from #2156A1`,
  );
});

test("scratch motifs follow the name, not a traced illustration", () => {
  assert.equal(ticketMotif("Grand Stacks", "cash", "cash"), "grid");
  assert.equal(ticketMotif("200X The Cash", "cash", "multiplier"), "diamonds");
  assert.equal(ticketMotif("Fat Stacks", "cash", "cash"), "circles");
  assert.equal(ticketMotif("Crossword Deluxe", "crossword", "crossword"), "crossword");
  assert.equal(ticketMotif("Bonus Spot", "cash", "cash"), "circles");
});

const FORBIDDEN_CLIENT = [
  "sceducationlottery.com/images/games",
  "Content/Images/Instant/nc",
  "palottery.pa.gov/uploadedimages",
  "/Images/scratchoffs/",
  "_img1.gif",
  "molottery.com/media/scratchers",
  "tnlottery.com/wp-content/uploads",
  "ctfassets.net",
  "d2kx0heugfrx3y.cloudfront.net",
  "api-solutions.ohiolottery.com",
  "authapi-solutions.ohiolottery.com",
  "gameGraphicURL",
  "KYLottery_ScratchOffs",
];

function walkFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist" || entry === ".output") continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) walkFiles(path, acc);
    else if (/\.(tsx?|jsx?|mjs|js|json|css|html)$/.test(entry) && !entry.endsWith(".server.ts"))
      acc.push(path);
  }
  return acc;
}

test("official image URLs and bytes stay out of the client sources", () => {
  const files = [
    ...walkFiles(join(root, "src/components")),
    ...walkFiles(join(root, "src/routes")),
    ...walkFiles(join(root, "src/lib")),
    ...walkFiles(join(root, "src/data")),
  ];
  assert.ok(files.length > 20);
  for (const path of files) {
    const text = readFileSync(path, "utf8");
    for (const needle of FORBIDDEN_CLIENT) {
      assert.equal(text.includes(needle), false, `${path} contains ${needle}`);
    }
  }
  const faces = readFileSync(join(root, "src/data/ticket-faces.json"), "utf8");
  assert.equal(/https?:\/\//.test(faces), false);
  assert.equal(/\.(?:jpg|jpeg|png|gif|webp)/i.test(faces), false);
  const coveragePath = join(root, "src/data/ticket-faces.coverage.json");
  if (existsSync(coveragePath)) {
    const coverage = readFileSync(coveragePath, "utf8");
    assert.equal(/https?:\/\//.test(coverage), false);
  }
  for (const built of ["dist", ".output", ".vercel/output/static"]) {
    const dir = join(root, built);
    if (!existsSync(dir)) continue;
    for (const path of walkFiles(dir)) {
      if (!/\.(js|mjs|css|html|json)$/.test(path)) continue;
      if (path.includes(`${built}/server`) || path.includes("/server/")) continue;
      const text = readFileSync(path, "utf8");
      for (const needle of FORBIDDEN_CLIENT) {
        assert.equal(text.includes(needle), false, `${path} contains ${needle}`);
      }
    }
  }
});
