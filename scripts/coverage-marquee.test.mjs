import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OTHER_TEN = [
  "Tennessee",
  "Kentucky",
  "South Carolina",
  "Oklahoma",
  "North Carolina",
  "Pennsylvania",
  "Texas",
  "Missouri",
  "Iowa",
  "Idaho",
];

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

test("home coverage ribbon sits under the leftover intro and uses copper chrome", () => {
  const en = JSON.parse(read("src/locales/en.json"));
  const es = JSON.parse(read("src/locales/es.json"));
  const marquee = read("src/components/coverage-marquee.tsx");
  const home = read("src/routes/index.tsx");
  const ribbon = read("src/components/desk-ribbon.tsx");
  const promo = read("src/components/promo-marquee.tsx");
  const states = read("src/config/states.ts");

  assert.equal(en["coverage.miOh"], "Prize lists we show.");
  assert.equal(en["coverage.plusTen"], "Inside the update window: {{count}}.");
  assert.equal(en["coverage.recipe"], "Older lists keep their as-of time.");
  assert.equal(
    en["coverage.aria"],
    "Prize lists we show. Inside the update window: {{count}}.",
  );
  assert.equal(es["coverage.miOh"], "Listas de premios que mostramos.");
  assert.match(es["coverage.plusTen"], /ventana de actualización/);
  assert.match(es["coverage.aria"], /Listas de premios/);
  assert.doesNotMatch(en["coverage.miOh"], /12 states|all states|every game/i);
  assert.doesNotMatch(en["coverage.aria"], /Michigan and Ohio/);

  for (const key of ["coverage.miOh", "coverage.plusTen", "coverage.recipe", "coverage.aria"]) {
    assert.doesNotMatch(en[key], /\bdesk\b/i, key);
    assert.doesNotMatch(es[key], /\bmesa\b/i, key);
  }

  assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());

  const coverageKeys = Object.keys(en).filter((key) => key.startsWith("coverage."));
  assert.deepEqual(coverageKeys.sort(), [
    "coverage.aria",
    "coverage.miOh",
    "coverage.plusTen",
    "coverage.recipe",
  ]);
  const banned = /improve odds|better odds|guaranteed|Florida|Arizona|Connecticut/i;
  for (const key of coverageKeys) {
    assert.doesNotMatch(en[key], banned, key);
    assert.doesNotMatch(es[key], banned, key);
  }

  const publicBlock = states.slice(
    states.indexOf("export const PUBLIC_STATE_IDS"),
    states.indexOf("export const HIDDEN_STATE_IDS"),
  );
  const hiddenBlock = states.slice(
    states.indexOf("export const HIDDEN_STATE_IDS"),
    states.indexOf("export const HIDDEN_RETURN_MIN_GAMES"),
  );
  assert.match(publicBlock, /"mi"/);
  assert.match(publicBlock, /"oh"/);
  assert.doesNotMatch(hiddenBlock, /"mi"/);
  assert.doesNotMatch(hiddenBlock, /"oh"/);

  assert.match(marquee, /export function CoverageMarquee/);
  assert.match(marquee, /PUBLIC_STATE_LIST/);
  assert.match(marquee, /freshPublicStateIds/);
  assert.match(marquee, /PUBLIC_STATE_LIST/);
  assert.match(marquee, /t\("coverage\.miOh"\)/);
  assert.match(marquee, /t\("coverage\.plusTen"/);
  assert.doesNotMatch(marquee, /NEW_DESK_IDS/);
  assert.match(marquee, /sv-desk-ribbon-track/);
  assert.match(marquee, /sv-desk-ribbon-static/);
  assert.match(marquee, /hash="states"/);
  assert.doesNotMatch(marquee, /bg-plum/);
  assert.doesNotMatch(marquee, /sv-marquee-track/);
  assert.doesNotMatch(marquee, /Arizona|Connecticut|Illinois|Massachusetts|Florida/);

  const linkOpen = marquee.match(/<Link\s+to="\/"\s+hash="states"\s+className="([^"]+)"/);
  assert.ok(linkOpen, "CoverageMarquee Link must reuse copper desk-ribbon chrome");
  const ribbonOpen = ribbon.match(/<Link\s+to="\/pricing"\s+className="([^"]+)"/);
  assert.ok(ribbonOpen);
  assert.equal(linkOpen[1], ribbonOpen[1]);
  const promoOpen = promo.match(/<Link\s+to="\/pricing"\s+className="([^"]+)"/);
  assert.ok(promoOpen);
  assert.notEqual(linkOpen[1], promoOpen[1]);

  assert.match(home, /from "@\/components\/coverage-marquee"/);
  assert.match(home, /<CoverageMarquee/);
  const selectorAt = home.indexOf("<StateSelector");
  const bannerAt = home.indexOf("<DataModeBanner");
  const coverageAt = home.indexOf("<CoverageMarquee");
  const calloutAt = home.indexOf("<MethodsCallout");
  const decayAt = home.indexOf("<DecayMarquee");
  assert.ok(selectorAt >= 0 && bannerAt > selectorAt);
  assert.ok(coverageAt > bannerAt && calloutAt > coverageAt);
  assert.ok(decayAt > calloutAt);

  for (const name of OTHER_TEN) {
    assert.equal(marquee.includes(`"${name}"`), false, `do not hardcode ${name}`);
  }
});
