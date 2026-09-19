import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

test("home decay marquee explains leftover-prize pace on the Hot / Cold meter", () => {
  const en = JSON.parse(read("src/locales/en.json"));
  const es = JSON.parse(read("src/locales/es.json"));
  const marquee = read("src/components/decay-marquee.tsx");
  const home = read("src/routes/index.tsx");
  const promo = read("src/components/promo-marquee.tsx");

  assert.equal(en["decayMarquee.meter"], "Hot / Warm / Cold includes leftover-prize decay.");
  assert.equal(
    en["decayMarquee.overlap"],
    "Overlap leftover $50+ prize rows — prize amount, not ticket price.",
  );
  assert.equal(en["decayMarquee.window"], "Drop scaled to 16 days. Missing live tiers are ignored.");
  assert.equal(
    en["decayMarquee.bands"],
    "Still · Quiet · Moving · Fast. Fast +10 · Moving +6 · Still −3.",
  );
  assert.equal(en["decayMarquee.skip"], "Skip stays Skip. Printed odds never change.");
  assert.equal(
    en["decayMarquee.aria"],
    "Hot / Warm / Cold includes leftover-prize decay. Overlapping $50+ prize rows are scaled to 16 days. Claims, not tickets sold. Printed odds never change.",
  );

  assert.equal(es["decayMarquee.meter"], "Caliente / Tibio / Frío incluye la decadencia de restantes.");
  assert.match(es["decayMarquee.overlap"], /\$50\+/);
  assert.match(es["decayMarquee.window"], /16 días/);
  assert.match(es["decayMarquee.bands"], /Rápido \+10/);
  assert.match(es["decayMarquee.skip"], /probabilidades impresas nunca cambian/i);
  assert.match(es["decayMarquee.aria"], /reclamos/i);

  assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());

  const decayKeys = Object.keys(en).filter((key) => key.startsWith("decayMarquee."));
  assert.deepEqual(decayKeys.sort(), [
    "decayMarquee.aria",
    "decayMarquee.bands",
    "decayMarquee.meter",
    "decayMarquee.overlap",
    "decayMarquee.skip",
    "decayMarquee.window",
  ]);

  const banned =
    /improve odds|better odds|higher probability|expected value|\bEV\b|tickets purchased|more likely to win|guaranteed/i;
  for (const key of decayKeys) {
    assert.doesNotMatch(en[key], banned, key);
    assert.doesNotMatch(es[key], banned, key);
  }

  assert.match(en["decayMarquee.meter"], /leftover-prize decay/);
  assert.match(en["decayMarquee.overlap"], /\$50\+/);
  assert.match(en["decayMarquee.window"], /16 days/);
  assert.match(en["decayMarquee.window"], /Missing live tiers/);
  assert.match(en["decayMarquee.bands"], /Fast \+10/);
  assert.match(en["decayMarquee.skip"], /Printed odds never change/);
  assert.match(en["decayMarquee.aria"], /Claims, not tickets sold/);

  assert.match(marquee, /export function DecayMarquee/);
  assert.match(marquee, /t\("decayMarquee\.meter"\)/);
  assert.match(marquee, /t\("decayMarquee\.overlap"\)/);
  assert.match(marquee, /t\("decayMarquee\.window"\)/);
  assert.match(marquee, /t\("decayMarquee\.bands"\)/);
  assert.match(marquee, /t\("decayMarquee\.skip"\)/);
  assert.match(marquee, /sv-marquee-static/);
  assert.match(marquee, /sv-marquee-track/);
  assert.match(marquee, /\{t\("decayMarquee\.meter"\)\} · \{t\("decayMarquee\.skip"\)\}/);
  assert.match(marquee, /to="\/methods"/);
  assert.doesNotMatch(marquee, /bg-plum[\s\S]*hidden/);

  const linkOpen = marquee.match(/<Link\s+to="\/methods"\s+className="([^"]+)"/);
  assert.ok(linkOpen, "DecayMarquee Link to /methods must have a className");
  assert.match(linkOpen[1], /bg-plum/);
  assert.match(linkOpen[1], /text-gold/);
  assert.match(linkOpen[1], /border-gold\/35/);
  assert.doesNotMatch(linkOpen[1], /\bhidden\b/);

  const promoOpen = promo.match(/<Link\s+to="\/pricing"\s+className="([^"]+)"/);
  assert.ok(promoOpen);
  assert.equal(linkOpen[1], promoOpen[1], "decay tape must reuse promo marquee chrome");

  assert.match(home, /from "@\/components\/decay-marquee"/);
  assert.match(home, /<DecayMarquee/);
  const deskAt = home.indexOf('id="desk"');
  const decayAt = home.indexOf("<DecayMarquee");
  const skipAt = home.indexOf('id="skip"');
  assert.ok(deskAt >= 0 && decayAt > deskAt && skipAt > decayAt);

  assert.doesNotMatch(home, /DeskRibbon/);
  assert.doesNotMatch(read("src/routes/__root.tsx"), /DecayMarquee/);
});
