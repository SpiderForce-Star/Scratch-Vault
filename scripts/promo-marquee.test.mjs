import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

test("promo marquee is on every viewport with five locked English beats", () => {
  const en = JSON.parse(read("src/locales/en.json"));
  const es = JSON.parse(read("src/locales/es.json"));
  const marquee = read("src/components/promo-marquee.tsx");
  const rootSrc = read("src/routes/__root.tsx");
  const footer = read("src/components/site-footer.tsx");

  assert.equal(en["marquee.dead"], "Don't spend on a drained book.");
  assert.equal(en["marquee.posted"], "We watch the official leftover-prize list.");
  assert.equal(en["marquee.intel"], "Tonight's three — and what to skip.");
  assert.equal(en["marquee.sweep"], "We constantly sweep for the best prize data.");
  assert.equal(en["marquee.trial"], "Try 7 days free");
  assert.equal(en["marquee.aria"], "Don't spend on a drained book. Try 7 days free");

  assert.equal(es["marquee.dead"], "No gastes en un libro agotado.");
  assert.equal(es["marquee.posted"], "Vigilamos la lista oficial de premios que quedan.");
  assert.equal(es["marquee.intel"], "Los tres de esta noche — y qué saltarte.");
  assert.equal(es["marquee.sweep"], "Barremos sin parar en busca de los mejores datos de premios.");
  assert.equal(es["marquee.trial"], "Prueba 7 días gratis");
  assert.equal(es["marquee.aria"], "No gastes en un libro agotado. Prueba 7 días gratis");

  assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());

  const marqueeKeys = Object.keys(en).filter((key) => key.startsWith("marquee."));
  assert.deepEqual(marqueeKeys.sort(), [
    "marquee.aria",
    "marquee.dead",
    "marquee.intel",
    "marquee.posted",
    "marquee.sweep",
    "marquee.trial",
  ]);
  for (const key of marqueeKeys) {
    assert.doesNotMatch(en[key], /improve odds|better odds/i);
    assert.doesNotMatch(es[key], /improve odds|better odds/i);
    assert.doesNotMatch(en[key], /guaranteed|dead tickets never win/i);
  }

  const linkOpen = marquee.match(/<Link\s+to="\/pricing"\s+className="([^"]+)"/);
  assert.ok(linkOpen, "PromoMarquee Link to /pricing must have a className");
  assert.doesNotMatch(linkOpen[1], /\bhidden\b/);
  assert.doesNotMatch(linkOpen[1], /\bsm:block\b/);

  const native = rootSrc.slice(rootSrc.indexOf("function NativeRoot"));
  const headerAt = native.indexOf("<SiteHeader");
  const outletAt = native.indexOf("<Outlet");
  assert.ok(headerAt >= 0 && outletAt > headerAt);
  const chrome = native.slice(headerAt, outletAt);
  assert.match(chrome, /<PromoMarquee/);
  assert.doesNotMatch(chrome, /hidden sm:block/);
  assert.doesNotMatch(chrome, /TicketCopyright/);
  assert.doesNotMatch(rootSrc, /from "@\/components\/ticket-copyright"/);

  assert.match(footer, /from "@\/components\/ticket-copyright"/);
  assert.match(footer, /<TicketCopyright/);
  assert.match(footer, /footer\.legal/);
  assert.match(footer, /to="\/disclaimer"/);
  assert.match(footer, /to="\/privacy"/);
  assert.match(footer, /to="\/terms"/);

  const copyright = read("src/components/ticket-copyright.tsx");
  assert.match(copyright, /to="\/disclaimer"/);
  assert.match(copyright, /nav\.responsible/);

  assert.match(marquee, /t\("marquee\.sweep"\)/);
  assert.match(marquee, /sv-marquee-static/);
  assert.match(marquee, /\{t\("marquee\.dead"\)\} · \{t\("marquee\.trial"\)\}/);
  assert.match(rootSrc, /<AgeGate/);
  assert.match(rootSrc, /<BootSplash/);
});
