import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

test("methods page exists; home callout sits above three tickets", () => {
  const methods = read("src/routes/methods.tsx");
  const home = read("src/routes/index.tsx");
  const callout = read("src/components/methods-callout.tsx");
  const tree = read("src/routeTree.gen.ts");
  const footer = read("src/components/site-footer.tsx");
  const sitemap = read("scripts/generate-sitemap.mjs");

  assert.match(methods, /createFileRoute\("\/methods"\)/);
  assert.match(methods, /HeatExplainer neon/);
  assert.match(methods, /methods\.s1Title/);
  assert.match(methods, /methods\.honestTitle/);
  assert.match(methods, /to="\/strategy"/);
  assert.match(tree, /path: '\/methods'/);
  assert.match(callout, /to="\/methods"/);
  assert.match(callout, /methods\.explain/);
  assert.match(home, /MethodsCallout/);
  assert.match(footer, /to="\/methods"/);
  assert.match(sitemap, /\/methods/);

  const bannerAt = home.indexOf("<DataModeBanner");
  const calloutAt = home.indexOf("<MethodsCallout");
  const deskAt = home.indexOf('id="desk"');
  const skipAt = home.indexOf('id="skip"');
  assert.ok(bannerAt >= 0 && calloutAt > bannerAt && deskAt > calloutAt && skipAt > deskAt);
});

test("methods copy locksteps en/es and forbids odds language", () => {
  const en = JSON.parse(read("src/locales/en.json"));
  const es = JSON.parse(read("src/locales/es.json"));
  assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());

  const required = [
    "footer.methods",
    "methods.kicker",
    "methods.homeTitle",
    "methods.homeBody",
    "methods.explain",
    "methods.title",
    "methods.lead",
    "methods.s1Kicker",
    "methods.s1Title",
    "methods.s1Body",
    "methods.s2Kicker",
    "methods.s2Title",
    "methods.s2Body",
    "methods.s3Kicker",
    "methods.s3Title",
    "methods.s3Body",
    "methods.s4Kicker",
    "methods.s4Title",
    "methods.s4Body",
    "methods.honestKicker",
    "methods.honestTitle",
    "methods.honestBody",
    "methods.ctaDesk",
    "methods.ctaStrategy",
    "methods.foot",
  ];
  const banned =
    /expected value|\bEV\b|current odds|better odds|value score|\bROI\b|start-to-now prize curve drawn as odds/i;
  for (const key of required) {
    assert.equal(typeof en[key], "string", key);
    assert.equal(typeof es[key], "string", key);
    assert.ok(en[key].length > 2, key);
    assert.ok(es[key].length > 2, key);
    assert.doesNotMatch(en[key], banned, key);
    assert.doesNotMatch(es[key], banned, key);
  }
  assert.match(en["methods.s1Body"], /historical leftover/);
  assert.match(en["methods.s2Body"], /three bands/);
  assert.match(en["methods.s3Body"], /not a curve drawn back to the first day of sale/);
  assert.match(en["methods.s3Body"], /16-day/);
  assert.match(en["methods.honestTitle"], /do not improve your odds/);
  assert.match(en["methods.lead"], /do not improve your odds/);
  assert.match(en["methods.foot"], /Printed odds never change/);
  assert.match(en["methods.lead"], /Not a lottery/);
  assert.doesNotMatch(es["methods.honestTitle"], /mejoran las probabilidades de forma/i);
  assert.match(en["hero.titleAll"], /Three tickets to look at/);
});

test("methods page does not change Heat math or Stripe", () => {
  const methods = read("src/routes/methods.tsx");
  const heatServer = read("src/lib/heat.server.ts");
  const webhook = read("src/routes/api/stripe/webhook.ts");
  assert.doesNotMatch(methods, /MIX_GRAND|scoreCatalogRelative|STRIPE/);
  assert.match(heatServer, /export const MIX_GRAND = 0.28/);
  assert.match(webhook, /constructEvent/);
});
