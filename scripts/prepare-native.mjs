#!/usr/bin/env node
/**
 * Copy the Vite/Nitro client output into `dist/` so Capacitor has a webDir.
 * Store builds must ship local files (capacitor.config.ts leaves server.url unset).
 */
import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const staticDir = join(root, ".vercel", "output", "static");
const publicDir = join(root, "public");

mkdirSync(dist, { recursive: true });

if (existsSync(publicDir)) {
  cpSync(publicDir, dist, { recursive: true });
}

if (existsSync(staticDir)) {
  cpSync(staticDir, dist, { recursive: true });
}

const assetsDir = join(dist, "assets");
const css =
  existsSync(assetsDir) &&
  readdirSync(assetsDir).find((name) => name.endsWith(".css"));

const stylesheet = css
  ? `<link rel="stylesheet" href="./assets/${css}" />`
  : `<style>
      html,body{margin:0;background:#0a0a0b;color:#f1f1f2;font-family:Georgia,serif}
      main{max-width:40rem;margin:0 auto;padding:3rem 1.25rem}
      p{line-height:1.55;color:#9a9aa3}
      a{color:#f1f1f2}
    </style>`;

writeFileSync(
  join(dist, "index.html"),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#0a0a0b" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Scratch Vault" />
    <title>Scratch Vault</title>
    <link rel="manifest" href="./manifest.webmanifest" />
    <link rel="apple-touch-icon" href="./icons/apple-touch-icon.png" />
    ${stylesheet}
  </head>
  <body>
    <main>
      <p style="font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#6d6d76">
        Independent remaining-prize desk
      </p>
      <h1 style="font-size:2rem;margin:.75rem 0 0">Scratch Vault</h1>
      <p>
        Independent remaining-prize information. Not a lottery, not a ticket
        seller, and not affiliated with any state lottery.
      </p>
      <p>18+ only. Remaining counts do not improve the odds of winning any prize.</p>
      <p>
        If gambling is a problem, call or text
        <a href="tel:18005224700">1-800-GAMBLER</a>
        or Tennessee REDLINE
        <a href="tel:18008899789">1-800-889-9789</a>.
      </p>
      <p>
        For the live desk use
        <code>CAP_LIVE_RELOAD=1</code>
        against <code>npm run dev</code>, or open
        <a href="https://volunteer-scratch-vault.vercel.app">the website</a>.
        Native in-app purchase is the next store slice.
      </p>
    </main>
  </body>
</html>
`,
);

console.log("[prepare-native] wrote", dist);
