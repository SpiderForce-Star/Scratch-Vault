/**
 * Compile Connecticut remaining-prize catalog from official per-game tables.
 * Index of game numbers: Drupal JSONAPI. Remaining: ctlottery.com scratch pages.
 * Fail closed (empty catalog) if no trusted remaining table is parsed.
 */
import https from "node:https";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "src/data/states");
const PRICES = new Set([5, 10, 20, 25, 30, 50]);

const agent = new https.Agent({ keepAlive: true, maxSockets: 6 });

function fetchText(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 8) return reject(new Error("too many redirects " + url));
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(
      url,
      {
        agent: url.startsWith("https") ? agent : undefined,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "text/html,application/vnd.api+json,application/json,*/*",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
        },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(
            fetchText(new URL(res.headers.location, url).href, redirects + 1),
          );
        }
        const enc = res.headers["content-encoding"];
        const chunks = [];
        const stream =
          enc === "gzip"
            ? res.pipe(zlib.createGunzip())
            : enc === "br"
              ? res.pipe(zlib.createBrotliDecompress())
              : enc === "deflate"
                ? res.pipe(zlib.createInflate())
                : res;
        stream.on("data", (c) => chunks.push(c));
        stream.on("end", () =>
          resolve({
            status: res.statusCode,
            url,
            type: res.headers["content-type"] || "",
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
        stream.on("error", reject);
      },
    );
    req.on("error", reject);
    req.setTimeout(45000, () => req.destroy(new Error("timeout " + url)));
  });
}

function decode(s) {
  return String(s)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function money(s) {
  const cash = String(s).match(/cash option[:\s]*\$?([\d,]+(?:\.\d+)?)/i);
  if (cash) {
    const n = Number(cash[1].replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(String(s).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function remainingCount(s) {
  if (s == null || s === "") return null;
  const t = String(s).replace(/,/g, "").trim();
  if (!t || t === "—" || t === "-" || /n\/a/i.test(t)) return null;
  const n = Number(t.replace(/[^0-9-]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function themeOf(name, price) {
  const n = name.toLowerCase();
  if (n.includes("crossword") || n.includes("cashword") || n.includes("bingo")) {
    return "crossword";
  }
  if (n.includes("frenzy") || n.includes("blowout") || (/\$\d{2,3}\b/.test(name) && price <= 10)) {
    return "frenzy";
  }
  if (n.includes("x ") || n.includes("multiplier") || /\d+x/.test(n)) return "multiplier";
  if (price >= 30 || n.includes("million")) return "high";
  if (n.includes("jumbo") || n.includes("gold")) return "jumbo";
  return "cash";
}

function typicalOdds(price) {
  if (price >= 50) return 2.7;
  if (price >= 30) return 2.9;
  if (price >= 25) return 2.97;
  if (price >= 20) return 3.18;
  if (price >= 10) return 3.45;
  return 3.95;
}

async function listDrupalGames() {
  const games = [];
  let url =
    "https://app-clc-prod-drupal.azurewebsites.net/jsonapi/node/scratch_games?page[limit]=50";
  while (url) {
    const r = await fetchText(url);
    if (r.status !== 200) throw new Error("Drupal JSONAPI " + r.status);
    const json = JSON.parse(r.body);
    for (const node of json.data || []) {
      const a = node.attributes || {};
      if (a.status === false || a.field_scratch_hidden === true) continue;
      const number = Number(a.field_game_no);
      if (!Number.isFinite(number)) continue;
      const name = decode(
        a.field_scratch_name_override?.processed ||
          String(a.title || "").replace(/\s*\(#\d+\)\s*$/, ""),
      );
      const odds = Number(a.field_scratch_overall_odds);
      games.push({
        number,
        name,
        odds: Number.isFinite(odds) && odds > 0 ? odds : null,
      });
    }
    url = json.links?.next?.href || null;
  }
  return games;
}

function parseGamePage(html, fallback) {
  const name =
    decode(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "") || fallback.name;
  const meta = html.match(
    /<meta name="description" content="([^"]+)"/i,
  )?.[1];
  const priceM = (meta || "").match(/\$(\d+)(?:\.\d+)? scratch ticket/i);
  const price = priceM ? Number(priceM[1]) : null;
  const asOf = html.match(/As of\s*(?:<!-- -->)?\s*([A-Za-z]+ \d+, \d{4})/i)?.[1];
  const idx = html.indexOf("scratch-prizes-table");
  if (idx < 0) return null;
  const slice = html.slice(idx, idx + 20000);
  const prizes = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(slice))) {
    const cells = [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) =>
      decode(c[1]),
    );
    if (cells.length < 3) continue;
    if (/prize amount/i.test(cells[0])) continue;
    const amount = money(cells[0]);
    const remaining = remainingCount(cells[2]);
    if (amount == null || amount <= 0) continue;
    prizes.push({ amount, remaining });
  }
  if (!prizes.length) return null;
  prizes.sort((a, b) => b.amount - a.amount);
  return {
    number: fallback.number,
    name,
    price,
    odds: fallback.odds,
    asOf,
    prizes,
  };
}

async function poolMap(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

function writeCatalog(asOf, drafts) {
  const rows = drafts.map((g) => {
    const theme = g.theme && g.theme !== "cash" ? `\n    theme: ${JSON.stringify(g.theme)},` : "";
    const tiers = g.tiers.map((t) => `{ amount: ${t.amount} }`).join(", ");
    return `  compiledGame({
    number: ${g.number},
    name: ${JSON.stringify(g.name)},
    price: ${g.price},
    topPrize: ${g.topPrize},
    odds: ${g.odds},
    tiers: [${tiers}],${theme}
  })`;
  });
  const src = `/**
 * Compiled from official Connecticut per-game remaining tables as of ${asOf}.
 * Remaining overlays live in compiled.remaining.server.ts.
 */
import { compiledGame } from "./compile";
import type { Game } from "@/data/games";

export const CT_AS_OF = ${JSON.stringify(asOf)};

export const CT_GAMES: Game[] = [
${rows.length ? rows.join(",\n") + ",\n" : ""}];
`;
  fs.writeFileSync(path.join(OUT, "ct.ts"), src);
}

const listed = await listDrupalGames();
console.log("Drupal games", listed.length);

const pages = await poolMap(listed, 5, async (game) => {
  const url = `https://ctlottery.com/games/scratch-games/${game.number}`;
  try {
    const r = await fetchText(url);
    if (r.status !== 200) {
      console.log("skip", game.number, r.status);
      return null;
    }
    return parseGamePage(r.body, game);
  } catch (e) {
    console.log("err", game.number, e.message);
    return null;
  }
});

const parsed = pages.filter(Boolean);
console.log("parsed remaining tables", parsed.length);

const drafts = [];
const remaining = {};
const seen = new Set();
let asOf = "2026-08-20";
for (const game of parsed) {
  if (!PRICES.has(game.price)) continue;
  if (!game.number || !game.name) continue;
  if (!game.prizes.length) continue;
  if (seen.has(game.number)) continue;
  seen.add(game.number);
  const topPrize = game.prizes[0].amount;
  if (!topPrize) continue;
  drafts.push({
    number: game.number,
    name: game.name,
    price: game.price,
    topPrize,
    odds: game.odds ?? typicalOdds(game.price),
    theme: themeOf(game.name, game.price),
    tiers: game.prizes.map((p) => ({ amount: p.amount })),
  });
  remaining[game.number] = game.prizes.map((p) => p.remaining);
  if (game.asOf) {
    const d = Date.parse(game.asOf);
    if (Number.isFinite(d)) {
      asOf = new Date(d).toISOString().slice(0, 10);
    }
  }
}

drafts.sort((a, b) => a.price - b.price || b.topPrize - a.topPrize);
writeCatalog(asOf, drafts);
fs.writeFileSync(
  path.join(ROOT, "tmp/ct-compiled.json"),
  JSON.stringify({ asOf, games: drafts.length, remaining }, null, 2),
);
console.log("compiled", drafts.length, "asOf", asOf);
console.log(
  "prices",
  drafts.reduce((acc, g) => {
    acc[g.price] = (acc[g.price] || 0) + 1;
    return acc;
  }, {}),
);
