import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { isEndedGame } from "../src/data/ended-games.ts";
import { TN_MISSING_GAMES } from "../src/data/tn-missing.ts";
import { unionBundledGames } from "../src/data/states/parse.server.ts";
import { scoreGame } from "../src/lib/heat.server.ts";
import { pickTripGames } from "../src/lib/heat.ts";
import {
  FULL_CATALOG_NEXT,
  fullCatalogSignupSearch,
  isHomepageTeaseGame,
} from "../src/lib/catalog-lock.ts";
import { SKIP_TEASER_CLEAR, skipNameLocked } from "../src/lib/skip-teaser.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function scored(games) {
  const catalog = games.map((g) => ({ ...g, stateId: g.stateId ?? "tn" }));
  const reports = new Map(
    catalog.map((game) => [
      game.number,
      scoreGame(game, game.stateId === "tn" ? undefined : { topHoldback: 0 }),
    ]),
  );
  return { catalog, reports };
}

function tnCatalog() {
  const tn = JSON.parse(read("src/data/states/last-good/tn.json"));
  return unionBundledGames(
    tn.catalog.map((g) => ({ ...g, stateId: "tn" })),
    TN_MISSING_GAMES.map((g) => ({ ...g, stateId: "tn" })),
  );
}

test("unpaid catalog links share one signup next=/games path", () => {
  assert.equal(FULL_CATALOG_NEXT, "/games");
  assert.deepEqual(fullCatalogSignupSearch(), { next: "/games" });
  const link = read("src/components/full-catalog-link.tsx");
  const header = read("src/components/site-header.tsx");
  const home = read("src/routes/index.tsx");
  const games = read("src/routes/games.tsx");
  const detail = read("src/routes/game/$number.tsx");
  const signup = read("src/routes/signup.tsx");
  assert.match(link, /to="\/signup"/);
  assert.match(link, /fullCatalogSignupSearch/);
  assert.match(header, /FullCatalogLink/);
  assert.doesNotMatch(
    header.slice(header.indexOf("function NavLinks"), header.indexOf("function HeaderTrial")),
    /to="\/games"/,
  );
  assert.match(home, /FullCatalogLink/);
  assert.doesNotMatch(home, /to="\/games"/);
  assert.match(games, /LockedPanel/);
  assert.match(games, /locked \? \[\]/);
  assert.match(games, /snap\?\.paid/);
  assert.doesNotMatch(games, /catalog = snap\?\.games \?\? publicCatalog/);
  assert.match(detail, /isHomepageTeaseGame/);
  assert.match(detail, /!locked && better/);
  assert.match(detail, /!locked && skipAt/);
  assert.match(detail, /FullCatalogLink/);
  assert.match(signup, /next: safeNext\(search\.next\)/);
});

test("unpaid /games never mounts the board, search, or price chips", () => {
  const games = read("src/routes/games.tsx");
  const lockAt = games.indexOf("if (locked)");
  const boardAt = games.indexOf("<StateSelector");
  assert.ok(lockAt >= 0 && boardAt > lockAt);
  const lockedReturn = games.slice(lockAt, boardAt);
  assert.match(lockedReturn, /LockedPanel/);
  assert.doesNotMatch(lockedReturn, /GamesBoardView/);
  assert.doesNotMatch(lockedReturn, /TicketCard/);
  assert.doesNotMatch(lockedReturn, /catalog-q/);
  assert.doesNotMatch(lockedReturn, /priceFilters/);
  assert.doesNotMatch(lockedReturn, /publicCatalog/);
  assert.match(games, /GamesBoardView/);
});

test("homepage keeps radar, tonight's 3, and skip teaser for unpaid", () => {
  const home = read("src/routes/index.tsx");
  assert.match(home, /RadarCashHero/);
  assert.match(home, /pickTripGames/);
  assert.match(home, /skipNameLocked/);
  assert.match(home, /hero\.titleAll/);
  assert.match(home, /!locked && newGames/);
  assert.equal(SKIP_TEASER_CLEAR, 2);
  assert.equal(skipNameLocked(0, false), false);
  assert.equal(skipNameLocked(1, false), false);
  assert.equal(skipNameLocked(2, false), true);
});

test("isHomepageTeaseGame is tonight's 3 at that price only", () => {
  const { catalog, reports } = scored(tnCatalog().filter((g) => !isEndedGame(g)));
  const trip = pickTripGames(catalog, reports, "10", 3);
  assert.ok(trip.length >= 1);
  for (const game of trip) {
    assert.equal(isHomepageTeaseGame(catalog, reports, game.number), true);
  }
  const outside = catalog.find(
    (g) => g.price === 10 && !trip.some((row) => row.number === g.number),
  );
  assert.ok(outside);
  assert.equal(isHomepageTeaseGame(catalog, reports, outside.number), false);
  assert.equal(isHomepageTeaseGame(catalog, reports, 0), false);
});

test("remaining counts stay fail-closed under a lock", () => {
  const card = read("src/components/ticket-card.tsx");
  const panel = read("src/components/locked-panel.tsx");
  const desk = read("src/lib/desk.server.ts");
  assert.match(card, /if \(locked \|\| value == null\) return "—"/);
  assert.match(panel, /never render real remaining counts underneath/);
  assert.match(desk, /games: games\.map\(guestFacingGame\)/);
  assert.match(desk, /redactHeatReport/);
});

test("lock copy does not claim remaining counts improve odds", () => {
  const en = JSON.parse(read("src/locales/en.json"));
  const es = JSON.parse(read("src/locales/es.json"));
  assert.equal(en["games.lockedTitle"], "The full board is Full Access");
  assert.equal(
    en["games.lockedTeaser"],
    "Three tickets to look at. A list to walk past. Sign up to open every $5+ game.",
  );
  assert.equal(en["game.lockedTitle"], "This ticket is Full Access");
  assert.match(en["hero.titleAll"], /Three tickets to look at/);
  for (const key of ["games.lockedTitle", "games.lockedTeaser", "game.lockedTitle", "game.lockedTeaser"]) {
    assert.doesNotMatch(en[key], /improve odds|better odds|improve the odds/i);
    assert.doesNotMatch(es[key], /mejoran las probabilidades/i);
  }
  assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
});

test("public Heat recipe is listed and locales stay in lockstep", () => {
  const en = JSON.parse(read("src/locales/en.json"));
  const es = JSON.parse(read("src/locales/es.json"));
  const recipeKeys = [
    "heat.recipeTitle",
    "heat.recipeLead",
    "heat.recipe1",
    "heat.recipe2",
    "heat.recipe3",
    "heat.recipeWhy",
    "heat.statTitle",
    "heat.statLead",
    "heat.statStep1Title",
    "heat.statStep1Body",
    "heat.statStep2Title",
    "heat.statStep2Body",
    "heat.statStep3Title",
    "heat.statStep3Body",
    "heat.statExampleKicker",
    "heat.statExampleTitle",
    "heat.statPriorLabel",
    "heat.statNowLabel",
    "heat.statClaimedLabel",
    "heat.statDropLabel",
    "heat.statPaceLabel",
    "heat.statVaultLabel",
    "heat.statBumpLabel",
    "heat.statDeskLabel",
    "heat.statResult",
    "heat.statNote",
    "heat.statOdds",
    "heat.neonKicker",
    "heat.neonTitle",
    "heat.neonBody",
    "heat.neonFoot",
  ];
  const banned =
    /higher probability of winning|better odds|current odds|expected value|\bEV\b|tickets purchased|system to win|more likely to win/i;
  for (const key of recipeKeys) {
    assert.equal(typeof en[key], "string");
    assert.equal(typeof es[key], "string");
    assert.ok(en[key].length > 8);
    assert.doesNotMatch(en[key], banned);
    assert.doesNotMatch(es[key], banned);
  }
  assert.match(en["heat.recipeLead"], /aisle context/i);
  assert.match(en["heat.recipeLead"], /\$5, \$10, \$20, \$25, \$30, and \$50 cards/);
  assert.match(en["heat.recipeLead"], /leftover mix on that desk at that price/i);
  assert.match(en["heat.recipe1"], /Same recipe on all 10 public desks/);
  assert.match(en["heat.recipe2"], /prize amount, not the ticket price/);
  assert.match(en["heat.recipeLead"], /damped when the leftover book is thin/);
  assert.match(en["heat.recipe2"], /capped at Quiet/);
  assert.match(en["heat.recipe3"], /leftover mix \+ leftover-prize claim pace/);
  assert.match(en["heat.recipe3"], /damped when the leftover book is thin/);
  assert.match(en["heat.recipe3"], /Skip stays Skip/);
  assert.match(en["heat.neonBody"], /damped when the leftover book is thin/);
  assert.match(en["heat.recipeWhy"], /Printed odds never change/);
  assert.match(en["heat.recipeWhy"], /18\+/);
  assert.match(en["heat.statLead"], /\$5, \$10, \$20, \$25, \$30, and \$50 cards/);
  assert.match(en["heat.statLead"], /not “only \$50 tickets.”/);
  assert.match(en["heat.statLead"], /Printed odds never change/);
  assert.match(en["heat.statStep1Body"], /On each \$5–\$50 game/);
  assert.match(en["heat.statPriorLabel"], /prize rows of \$50\+/);
  assert.match(en["heat.statNowLabel"], /prize rows of \$50\+/);
  assert.match(en["heat.statResult"], /does not change the odds/);
  assert.match(en["heat.statNote"], /claims/);
  assert.match(en["heat.neonKicker"], /Every \$5–\$50 card/);
  assert.match(
    en["heat.neonTitle"],
    /every \$5, \$10, \$20, \$25, \$30, and \$50 game/,
  );
  assert.match(en["heat.neonBody"], /prize-row decay on every ticket price/);
  assert.match(en["heat.neonBody"], /not “only \$50 tickets.”/);
  assert.match(en["heat.neonFoot"], /not the ticket price/);
  assert.match(en["heat.neonFoot"], /18\+/);
  assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());

  const explainer = read("src/components/heat-explainer.tsx");
  assert.match(explainer, /export function HeatExplainer/);
  assert.match(explainer, /const \{ t \} = useI18n\(\)/);
  for (const key of recipeKeys) {
    assert.match(explainer, new RegExp(key.replace(".", "\\.")));
  }
  assert.match(read("src/routes/index.tsx"), /HeatExplainer neon/);
  assert.match(read("src/routes/index.tsx"), /LeftoverDecayStrip/);
  assert.match(read("src/routes/index.tsx"), /TonightHeatStrip/);
  assert.match(read("src/routes/games.tsx"), /HeatExplainer/);
  assert.match(read("src/routes/games.tsx"), /LeftoverDecayStrip/);
  assert.match(read("src/routes/game/$number.tsx"), /HeatExplainer/);
  const decayStrip = read("src/components/leftover-decay-strip.tsx");
  assert.match(decayStrip, /decay\.body/);
  assert.match(decayStrip, /decay\.foot/);
  assert.match(decayStrip, /decay\.heatLine/);

  const radar = read("src/components/radar-cash-hero.tsx");
  const scopeAt = radar.indexOf("function RadarScope");
  const tAt = radar.indexOf("const { t } = useI18n()", scopeAt);
  assert.ok(scopeAt >= 0 && tAt > scopeAt && tAt < scopeAt + 800);
});

test("leftover math stays prize-row $50+ on every loaded $5–$50 game", () => {
  const pace = read("src/lib/pace.ts");
  const heat = read("src/lib/heat.ts");
  const desk = read("src/lib/desk.server.ts");
  const states = read("src/config/states.ts");
  assert.match(pace, /const BOOK_MIN = 50/);
  assert.match(pace, /if \(tier\.amount < BOOK_MIN\) continue/);
  assert.doesNotMatch(pace, /game\.price\s*===?\s*50/);
  assert.doesNotMatch(pace, /PRICE_POINTS/);
  assert.match(pace, /for \(const game of current\)/);
  assert.match(pace, /leftoverConfidence/);
  assert.match(pace, /THIN_BOOK_TIERS = 8/);
  assert.match(heat, /export const PRICE_POINTS = \[5, 10, 20, 25, 30, 50\]/);
  assert.match(desk, /scoreCatalogRelative/);
  assert.match(desk, /scoreCatalogPace\(prior\?\.catalog, games, days/);
  assert.match(desk, /catalogHeatFromReports/);
  const heatServer = read("src/lib/heat.server.ts");
  assert.match(heatServer, /export function scoreCatalogRelative/);
  assert.doesNotMatch(heatServer, /medium >= 68/);
  assert.doesNotMatch(heatServer, /cash >= 72/);
  const publicBlock = states.slice(
    states.indexOf("export const PUBLIC_STATE_IDS"),
    states.indexOf("export const HIDDEN_STATE_IDS"),
  );
  const hiddenBlock = states.slice(
    states.indexOf("export const HIDDEN_STATE_IDS"),
    states.indexOf("export const HIDDEN_RETURN_MIN_GAMES"),
  );
  for (const id of ["tn", "ky", "sc", "ok", "nc", "pa", "tx", "mo", "ia", "id"]) {
    assert.match(publicBlock, new RegExp(`"${id}"`));
    assert.doesNotMatch(hiddenBlock, new RegExp(`"${id}"`));
  }
  for (const id of ["az", "mi", "oh", "ct", "il", "ma"]) {
    assert.match(hiddenBlock, new RegExp(`"${id}"`));
    assert.doesNotMatch(publicBlock, new RegExp(`"${id}"`));
  }
});

test("stripe webhook and prices are untouched by the catalog lock", () => {
  const webhook = read("src/routes/api/stripe/webhook.ts");
  const stripeServer = read("src/lib/stripe.server.ts");
  assert.match(webhook, /constructEvent/);
  assert.match(stripeServer, /STRIPE_SECRET_KEY/);
});
