import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BANNED = /purchase and avoid|improve odds|better odds/i;
const HIDDEN_NAMES = [
  "Arizona",
  "Michigan",
  "Ohio",
  "Connecticut",
  "Illinois",
  "Massachusetts",
];
const PUBLIC_NAMES = [
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

function publicDeskNames() {
  const src = read("src/config/states.ts");
  const publicBlock = src.slice(
    src.indexOf("export const PUBLIC_STATE_IDS"),
    src.indexOf("export const HIDDEN_STATE_IDS"),
  );
  const ids = [...publicBlock.matchAll(/"([a-z]{2})"/g)].map((match) => match[1]);
  const names = ids.map((id) => {
    const blockStart = src.indexOf(`  ${id}: {`);
    assert.ok(blockStart >= 0, id);
    const block = src.slice(blockStart, src.indexOf("lotteryName:", blockStart));
    const name = block.match(/name: "([^"]+)"/);
    assert.ok(name, id);
    return name[1];
  });
  return { ids, names };
}

test("homepage leftover banner and desk ribbon copy stay locked", () => {
  const en = JSON.parse(read("src/locales/en.json"));
  const es = JSON.parse(read("src/locales/es.json"));
  const banner = read("src/components/data-mode-banner.tsx");
  const ribbon = read("src/components/desk-ribbon.tsx");
  const home = read("src/routes/index.tsx");
  const css = read("src/styles.css");

  assert.equal(en["marquee.dead"], "Don't spend on a drained game.");
  assert.equal(en["marquee.intel"], "Current Top 3 and what to skip.");
  assert.equal(
    en["banner.leftover"],
    "The lottery’s leftover-prize list — not what’s in one store. We keep scanning official updates and give you leftover-prize intel on which games to look at and which to skip.",
  );
  assert.equal(
    es["banner.leftover"],
    "La lista de premios que quedan según la lotería — no lo que hay en una tienda. Seguimos escaneando las actualizaciones oficiales y te damos información de premios restantes sobre qué juegos mirar y cuáles saltarte.",
  );
  assert.equal(en["ribbon.access"], "Full Access on {{count}} desks");
  assert.equal(en["ribbon.trial"], "One trial opens every public desk.");
  assert.equal(es["ribbon.trial"], "Una prueba abre cada mesa pública.");

  assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());

  const copyKeys = [
    "banner.leftover",
    "ribbon.access",
    "ribbon.aria",
    "ribbon.trial",
    "marquee.dead",
    "marquee.intel",
    "marquee.aria",
  ];
  for (const key of copyKeys) {
    assert.doesNotMatch(en[key], BANNED);
    assert.doesNotMatch(es[key], BANNED);
    assert.doesNotMatch(en[key], /guaranteed|dead tickets never win|best tickets to purchase/i);
  }

  assert.match(banner, /leftover/);
  assert.match(banner, /banner\.leftover/);
  assert.match(banner, /banner\.deskSnapshot/);
  assert.match(home, /leftover/);
  assert.match(home, /<DeskRibbon/);

  const bannerAt = home.indexOf("<DataModeBanner");
  const ribbonAt = home.indexOf("<DeskRibbon");
  const deskAt = home.indexOf('id="desk"');
  assert.ok(bannerAt >= 0 && ribbonAt > bannerAt && deskAt > ribbonAt);

  assert.match(ribbon, /PUBLIC_STATE_LIST/);
  assert.match(ribbon, /to="\/pricing"/);
  assert.match(ribbon, /sv-desk-ribbon-static/);
  assert.match(ribbon, /sv-desk-ribbon-track/);
  assert.doesNotMatch(ribbon, /bg-plum/);
  assert.doesNotMatch(ribbon, /via-\[#243d28\]/);
  assert.match(ribbon, /via-\[#c45c18\]/);
  assert.doesNotMatch(ribbon, /HIDDEN_STATE/);
  assert.match(css, /sv-desk-ribbon-track/);
  assert.match(css, /animation: sv-marquee 72s linear infinite/);
  assert.match(css, /\.sv-desk-ribbon-static/);
});

test("desk ribbon names are the 10 public desks and hide AZ MI OH CT IL MA", () => {
  const ribbon = read("src/components/desk-ribbon.tsx");
  const en = JSON.parse(read("src/locales/en.json"));
  const es = JSON.parse(read("src/locales/es.json"));
  const { ids, names } = publicDeskNames();

  assert.deepEqual(ids, ["tn", "ky", "sc", "ok", "nc", "pa", "tx", "mo", "ia", "id"]);
  assert.deepEqual(names, PUBLIC_NAMES);
  assert.equal(names.length, 10);
  assert.match(ribbon, /PUBLIC_STATE_LIST\.map/);

  for (const name of PUBLIC_NAMES) {
    assert.equal(ribbon.includes(`"${name}"`), false, `do not hardcode ${name}`);
  }
  for (const name of HIDDEN_NAMES) {
    assert.doesNotMatch(ribbon, new RegExp(name));
    assert.doesNotMatch(en["ribbon.access"], new RegExp(name));
    assert.doesNotMatch(en["ribbon.trial"], new RegExp(name));
    assert.doesNotMatch(en["ribbon.aria"], new RegExp(name));
    assert.doesNotMatch(es["ribbon.access"], new RegExp(name));
    assert.doesNotMatch(es["ribbon.trial"], new RegExp(name));
    assert.doesNotMatch(es["ribbon.aria"], new RegExp(name));
    assert.doesNotMatch(en["banner.leftover"], new RegExp(name));
    assert.doesNotMatch(es["banner.leftover"], new RegExp(name));
  }
});

test("desk ribbon is homepage-only", () => {
  const home = read("src/routes/index.tsx");
  const rootSrc = read("src/routes/__root.tsx");
  assert.match(home, /from "@\/components\/desk-ribbon"/);
  assert.match(home, /<DeskRibbon/);
  assert.doesNotMatch(rootSrc, /DeskRibbon/);
  for (const page of ["signup", "login", "pricing", "account", "games"]) {
    const src = read(`src/routes/${page}.tsx`);
    assert.doesNotMatch(src, /DeskRibbon/);
    assert.doesNotMatch(src, /desk-ribbon/);
  }
});
