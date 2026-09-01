import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { SKIP_TEASER_CLEAR, skipNameLocked } from "../src/lib/skip-teaser.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const HIDDEN = ["az", "mi", "oh", "ct", "il", "ma"];
const PUBLIC = ["tn", "ky", "sc", "ok", "nc", "pa", "tx", "mo", "ia", "id"];

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

test("public selector is the weekly-refreshable desks only", () => {
  const src = read("src/config/states.ts");
  const publicBlock = src.slice(
    src.indexOf("export const PUBLIC_STATE_IDS"),
    src.indexOf("export const HIDDEN_STATE_IDS"),
  );
  const hiddenBlock = src.slice(
    src.indexOf("export const HIDDEN_STATE_IDS"),
    src.indexOf("export const HIDDEN_RETURN_MIN_GAMES"),
  );
  for (const id of PUBLIC) {
    assert.match(publicBlock, new RegExp(`"${id}"`));
    assert.doesNotMatch(hiddenBlock, new RegExp(`"${id}"`));
  }
  for (const id of HIDDEN) {
    assert.match(hiddenBlock, new RegExp(`"${id}"`));
    assert.doesNotMatch(publicBlock, new RegExp(`"${id}"`));
    assert.match(src, new RegExp(`\\b${id}: \\{`));
  }
  assert.match(src, /HIDDEN_RETURN_MIN_GAMES = 3/);
  assert.match(src, /export function parsePublicStateId/);
  assert.match(src, /export const PUBLIC_STATE_LIST/);
});

test("selector and deep-links ignore hidden desks", () => {
  const selector = read("src/components/state-selector.tsx");
  const home = read("src/routes/index.tsx");
  const game = read("src/routes/game/$number.tsx");
  const desk = read("src/lib/desk.ts");
  const active = read("src/lib/active-state.tsx");
  assert.equal(selector.includes("PUBLIC_STATE_LIST.map"), true);
  assert.equal(/\bSTATE_LIST\b/.test(selector), false);
  assert.equal(home.includes("isPublicStateId"), true);
  assert.equal(game.includes("isPublicStateId"), true);
  assert.equal(desk.includes("parsePublicStateId"), true);
  assert.equal(active.includes("parsePublicStateId"), true);
});

test("IL and MA stay empty with no last-good JSON", () => {
  const il = read("src/data/states/il.ts");
  const ma = read("src/data/states/ma.ts");
  assert.match(il, /export const IL_GAMES: Game\[\] = \[\]/);
  assert.match(ma, /export const MA_GAMES: Game\[\] = \[\]/);
  assert.equal(existsSync(join(root, "src/data/states/last-good/il.json")), false);
  assert.equal(existsSync(join(root, "src/data/states/last-good/ma.json")), false);
});

test("SC last-good is 20 real games and MO last-good is 59", () => {
  const sc = JSON.parse(read("src/data/states/last-good/sc.json"));
  const mo = JSON.parse(read("src/data/states/last-good/mo.json"));
  assert.equal(sc.catalog.length, 20);
  assert.equal(sc.gameCount, 20);
  assert.equal(mo.catalog.length, 59);
  assert.equal(mo.gameCount, 59);
  assert.equal(
    sc.catalog.some((g) => /no longer available/i.test(g.name) || /\(#\s*\d+\s*\)/.test(g.name)),
    false,
  );
  assert.equal(
    mo.catalog.some((g) => g.name === "5" || g.number === 77777),
    false,
  );
});

test("guest skip shows two names and three blurred", () => {
  assert.equal(SKIP_TEASER_CLEAR, 2);
  assert.equal(skipNameLocked(0, false), false);
  assert.equal(skipNameLocked(1, false), false);
  assert.equal(skipNameLocked(2, false), true);
  assert.equal(skipNameLocked(3, false), true);
  assert.equal(skipNameLocked(4, false), true);
});

test("cards say Current and the desk uses one compiled-snapshot banner", () => {
  const en = JSON.parse(read("src/locales/en.json"));
  const card = read("src/components/ticket-card.tsx");
  const banner = read("src/components/data-mode-banner.tsx");
  assert.equal(en["card.updated"], "Current");
  assert.equal(card.includes('t("card.updated")'), true);
  assert.equal(banner.includes('t("banner.deskSnapshot")'), true);
  assert.equal(banner.includes("banner.lastGood"), false);
});

test("public home mounts remaining-prize radar beside the trip desk for phone and desktop", () => {
  const home = read("src/routes/index.tsx");
  const radar = read("src/components/radar-cash-hero.tsx");
  assert.equal(home.includes("RadarCashHero"), true);
  assert.equal(home.includes('id="desk"'), true);
  assert.equal(home.includes("lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]"), true);
  assert.equal(radar.includes("hidden lg:block"), false);
  assert.equal(radar.includes("playGoldBleeps"), true);
  assert.equal(radar.includes("DollarBill"), true);
  assert.equal(radar.includes("deskNotifyEnabled"), true);
  assert.equal(radar.includes("prefers-reduced-motion"), true);
});
