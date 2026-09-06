import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

test("guests bounce home from pricing after the age gate, not while shopping later", () => {
  const gate = read("src/components/age-gate.tsx");
  const native = read("src/lib/native.ts");
  const splash = read("src/components/boot-splash.tsx");
  const css = read("src/styles.css");

  assert.match(native, /export function guestShouldLandHome/);
  assert.match(native, /"\/pricing"/);
  assert.match(native, /"\/signup"/);
  assert.match(native, /"\/login"/);
  assert.match(native, /export function freezeUiClicks/);
  assert.match(native, /export async function openExternalUrl/);
  assert.match(native, /data-sv-freeze/);

  assert.match(gate, /guestShouldLandHome\(window\.location\.pathname\)/);
  assert.match(gate, /navigate\(\{ to: "\/", replace: true \}\)/);
  assert.match(gate, /freezeUiClicks\(\)/);
  assert.match(gate, /useCurrentUser/);

  assert.match(splash, /from "react"/);
  assert.match(splash, /freezeUiClicks\(\)/);

  assert.match(css, /html\[data-sv-freeze\] a/);
  assert.match(css, /pointer-events: none/);
});

test("radar markers are teller-strapped cash stacks", () => {
  const hero = read("src/components/radar-cash-hero.tsx");
  assert.match(hero, /data-radar-stack="teller"/);
  assert.match(hero, /data-radar-hub="cash-strap"/);
  assert.match(hero, /function DollarBill/);
  assert.match(hero, /<DollarBill/);
});
