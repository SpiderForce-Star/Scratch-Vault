/**
 * Writes public/sitemap.xml from the game catalog.
 * Run after src/data/games.ts changes: node scripts/generate-sitemap.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const origin = "https://volunteer-scratch-vault.vercel.app";
const gamesSrc = readFileSync(join(root, "src/data/games.ts"), "utf8");
const metaSrc = readFileSync(join(root, "src/data/desk-meta.ts"), "utf8");

const numbers = [
  ...gamesSrc.matchAll(/^\s+number:\s+(\d+),/gm),
].map((m) => m[1]);

const published =
  metaSrc.match(/publishedAt:\s*"([^"]+)"/)?.[1]?.slice(0, 10) ??
  new Date().toISOString().slice(0, 10);

const staticPaths = ["/", "/pricing", "/privacy", "/terms", "/disclaimer"];

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
