import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

test("boot splash is once per session, 4s cap, skippable", () => {
  const src = readFileSync(join(ROOT, "src/components/boot-splash.tsx"), "utf8");
  const css = readFileSync(join(ROOT, "src/styles.css"), "utf8");
  assert.match(src, /BOOT_SHOWN_KEY = "vsv\.boot\.shown"/);
  assert.match(src, /BOOT_FORCE_MS = 4000/);
  assert.match(src, /prefers-reduced-motion/);
  assert.match(src, /onClick/);
  assert.match(src, /#c4a574/);
  assert.match(src, /#7c9a72/);
  assert.match(src, /Opening Scratch Vault/);
  assert.match(src, /function DollarBill/);
  assert.match(src, /sv-boot-stack/);
  assert.match(src, /sv-boot-fly/);
  assert.match(src, /r="78"/);
  assert.match(css, /sv-boot-fly/);
  assert.match(css, /72cqmin/);
  assert.match(css, /is-reduced \.sv-boot-fly/);
});

test("NativeRoot mounts BootSplash above AgeGate and holds the gate", () => {
  const src = readFileSync(join(ROOT, "src/routes/__root.tsx"), "utf8");
  assert.match(src, /import \{ BootSplash, BOOT_FORCE_MS \} from "@\/components\/boot-splash"/);
  const splash = src.indexOf("<BootSplash");
  const gate = src.indexOf("{introDone ? <AgeGate />");
  assert.ok(splash > 0 && gate > splash, "BootSplash must mount above AgeGate");
  assert.match(src, /data-sv-boot/);
  assert.match(src, /vsv\.boot\.shown/);
  assert.match(src, /#0B0F0C/);
});

test("age gate still shows 1-800-GAMBLER", () => {
  const src = readFileSync(join(ROOT, "src/components/age-gate.tsx"), "utf8");
  assert.match(src, /1-800-GAMBLER/);
  assert.match(src, /tel:18005224700/);
});

test("cards stay Current and the snapshot banner is not live inventory", () => {
  const en = JSON.parse(readFileSync(join(ROOT, "src/locales/en.json"), "utf8"));
  assert.equal(en["card.updated"], "Current");
  assert.match(en["banner.deskSnapshot"], /leftover-prize list/i);
  assert.match(en["banner.deskSnapshot"], /Not what’s in one store/i);
});
