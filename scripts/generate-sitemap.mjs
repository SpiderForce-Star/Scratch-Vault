/**
 * Writes public/sitemap.xml from the game catalog.
 * Run after src/data/games.ts changes: node scripts/generate-sitemap.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const origin = "https://scratch-vault.com";
const gamesSrc = readFileSync(join(root, "src/data/games.ts"), "utf8");
const extraSrc = readFileSync(join(root, "src/data/tn-missing.ts"), "utf8");

const numbers = [
  ...new Set([
    ...[...gamesSrc.matchAll(/^\s+number:\s+(\d+),/gm)].map((m) => m[1]),
    ...[...extraSrc.matchAll(/\bg\((\d+),/g)].map((m) => m[1]),
  ]),
];

// Prize pages follow the Tennessee catalog stamp, not the build clock.
// A build-date lastmod would call months-old prize lists current.
const metaSrc = readFileSync(join(root, "src/data/desk-meta.ts"), "utf8");
const publishedMatch = metaSrc.match(/publishedAt:\s*"([^"]+)"/);
const published = (publishedMatch?.[1] ?? "2026-09-03T12:00:00-05:00").slice(0, 10);

const staticPaths = ["/", "/games", "/strategy", "/methods", "/pricing", "/privacy", "/terms", "/disclaimer", "/legal"];

const urls = [
  ...staticPaths.map((path) => ({ path, lastmod: published, priority: path === "/" ? "1.0" : "0.6" })),
  ...numbers.map((n) => ({ path: `/game/${n}`, lastmod: published, priority: "0.5" })),
];

const body = urls
  .map(
    ({ path, lastmod, priority }) => `  <url>
    <loc>${origin}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`,
  )
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

writeFileSync(join(root, "public/sitemap.xml"), xml);
console.log(`sitemap.xml: ${urls.length} URLs, lastmod ${published}`);
