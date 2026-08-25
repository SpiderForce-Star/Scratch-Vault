/**
 * Compile IL, MA, IA, ID, CT remaining-prize catalogs.
 * Uses downloaded official pages/JSON in tmp/. Fail closed if a source is missing.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("src/data/states");
const PRICES = new Set([5, 10, 20, 25, 30, 50]);

function money(s) {
  const n = Number(String(s).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function remainingCount(s) {
  if (s == null || s === "") return null;
  if (/Last Top Prize Claimed/i.test(String(s))) return 0;
  const n = Number(String(s).replace(/[^0-9-]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function pickThree(prizes) {
  const rows = prizes
    .filter((p) => p.amount != null && p.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  if (!rows.length) return [];
  const top = rows[0];
  const mid =
    rows.find((p) => p.amount > 3_000 && p.amount < top.amount) ?? rows[1] ?? null;
  const cash =
    rows.find(
      (p) => p !== top && p !== mid && p.amount >= 50 && p.amount <= 3_000,
    ) ??
    rows.find((p) => p !== top && p !== mid) ??
    null;
  return [top, mid, cash].filter(Boolean);
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

function decode(s) {
  return String(s)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function emitState(id, asOf, games) {
  const drafts = [];
  const remaining = {};
  const seen = new Set();
  for (const game of games) {
    const tiers = pickThree(game.prizes || []);
    if (!tiers.length || !PRICES.has(game.price)) continue;
    if (!game.number || !game.name) continue;
    if (seen.has(game.number)) continue;
    seen.add(game.number);
    drafts.push({
      number: game.number,
      name: game.name,
      price: game.price,
      topPrize: tiers[0].amount,
      odds: game.odds ?? typicalOdds(game.price),
      theme: themeOf(game.name, game.price),
      tiers: tiers.map((t) => ({ amount: t.amount })),
    });
    remaining[game.number] = [
      tiers[0]?.remaining ?? null,
      tiers[1]?.remaining ?? null,
      tiers[2]?.remaining ?? null,
    ];
  }
  drafts.sort((a, b) => a.price - b.price || b.topPrize - a.topPrize);
  return { id, asOf, drafts, remaining };
}

function writeCatalog(file, exportName, asOf, drafts) {
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
 * Compiled from the official remaining-prizes table as of ${asOf}.
 * Remaining overlays live in compiled.remaining.server.ts.
 */
import { compiledGame } from "./compile";
import type { Game } from "@/data/games";

export const ${exportName}_AS_OF = ${JSON.stringify(asOf)};

export const ${exportName}_GAMES: Game[] = [
${rows.length ? rows.join(",\n") + ",\n" : ""}];
`;
  fs.writeFileSync(path.join(ROOT, file), src);
}

function parseIa(html) {
  const asOf =
    html.match(/DataAsOf[^>]*>([0-9/]+)</)?.[1] ||
    html.match(/end of day on[^<]*>([0-9/]+)</i)?.[1];
  const gamesByNumber = new Map();
  const rowRe =
    /<tr>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(html))) {
    const type = decode(m[2]);
    if (!/^Scratch/i.test(type)) continue;
    const nameCell = decode(m[1]);
    const numM = nameCell.match(/\((\d+)\)\s*$/);
    const number = numM ? Number(numM[1]) : null;
    const name = nameCell.replace(/\(\d+\)\s*$/, "").trim();
    const price = money(m[3]);
    const amount = money(m[4]);
    const remaining = remainingCount(m[6]);
    if (!number || !name || !PRICES.has(price) || amount == null) continue;
    if (!gamesByNumber.has(number)) {
      gamesByNumber.set(number, { number, name, price, prizes: [], odds: typicalOdds(price) });
    }
    gamesByNumber.get(number).prizes.push({ amount, remaining });
  }
  return { asOf, games: [...gamesByNumber.values()] };
}

function parseId(html) {
  const games = [];
  const chunks = html.split(/class="print-game"/i).slice(1);
  for (const chunk of chunks) {
    const number = Number(chunk.match(/data-game-id="(\d+)"/)?.[1]);
    const name = decode(chunk.match(/print_game__title">\s*([^<]+)/i)?.[1] || "");
    const price = money(chunk.match(/print_game__info-price">\s*([^<]+)/i)?.[1] || "");
    if (!number || !name || !PRICES.has(price)) continue;
    const prizes = [];
    const rowRe =
      /class="prizes-prize">([^<]+)<\/span>[\s\S]*?class="prizes-remaining">([^<]+)<\/td>/gi;
    let m;
    while ((m = rowRe.exec(chunk))) {
      const amount = money(m[1]);
      const remaining = remainingCount(m[2]);
      if (amount != null) prizes.push({ amount, remaining });
    }
    if (!prizes.length) continue;
    games.push({ number, name, price, prizes, odds: typicalOdds(price) });
  }
  return games;
}

function parseMaCash(label) {
  const text = String(label);
  const yr = text.match(/\$([\d,.]+)\s*K\/YR\/(\d+)\s*YRS/i);
  if (yr) return money(yr[1]) * 1000 * Number(yr[2]);
  const mo = text.match(/\$([\d,.]+)\s*K\/MO\/(\d+)\s*YRS/i);
  if (mo) return money(mo[1]) * 1000 * 12 * Number(mo[2]);
  const cash = text.match(/cash(?:\s*option)?[:\s]*\$([\d,.]+)/i);
  if (cash) return money(cash[1]);
  return money(text.split("(")[0]);
}

const results = {};

if (fs.existsSync("tmp/ia-raw.html") && fs.readFileSync("tmp/ia-raw.html", "utf8").includes("RemainPrizes_JS_DATATABLE")) {
  const iaParsed = parseIa(fs.readFileSync("tmp/ia-raw.html", "utf8"));
  const asOf = iaParsed.asOf
    ? iaParsed.asOf.replace(/(\d+)\/(\d+)\/(\d+)/, (_, m, d, y) => {
        const year = y.length === 2 ? "20" + y : y;
        return `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      })
    : "2026-08-20";
  results.ia = emitState("ia", asOf, iaParsed.games);
} else {
  results.ia = { id: "ia", asOf: null, drafts: [], remaining: {}, failed: true };
}

if (fs.existsSync("tmp/id-print.html") && fs.readFileSync("tmp/id-print.html", "utf8").includes("prizes-remaining")) {
  results.id = emitState("id", "2026-08-21", parseId(fs.readFileSync("tmp/id-print.html", "utf8")));
} else {
  results.id = { id: "id", asOf: null, drafts: [], remaining: {}, failed: true };
}

for (const id of ["il", "ma", "ct"]) {
  results[id] = { id, asOf: null, drafts: [], remaining: {}, failed: true };
}

if (fs.existsSync("tmp/ct-jsonapi-1.json")) {
  // Index-only fallback is not used: remaining tiers live on per-game tables.
}

for (const state of Object.values(results)) {
  console.log(
    state.id,
    state.failed ? "FAILED" : `${state.drafts.length} games asOf ${state.asOf}`,
  );
  if (state.drafts[0]) console.log("  sample", state.drafts[0]);
}

for (const [id, state] of Object.entries(results)) {
  if (state.failed || !state.drafts.length) {
    writeCatalog(`${id}.ts`, id.toUpperCase(), "unavailable", []);
    continue;
  }
  writeCatalog(`${id}.ts`, id.toUpperCase(), state.asOf, state.drafts);
}

function formatRemaining(rows) {
  return Object.entries(rows)
    .map(([num, triple]) => `    ${num}: [${triple.map((n) => (n == null ? "null" : n)).join(", ")}]`)
    .join(",\n");
}

const extra = `/**
 * Compiled remaining overlays for IL, MA, IA, ID, CT.
 * Shape matches Tennessee: [top, mid, cash]. Empty object = fetch/parse failure.
 */
import type { RemainingRow } from "./compile";

export const FIVE_COMPILED_REMAINING: Record<
  "il" | "ma" | "ia" | "id" | "ct",
  Record<number, RemainingRow>
> = {
  il: {
${results.il.failed ? "" : formatRemaining(results.il.remaining)}
  },
  ma: {
${results.ma.failed ? "" : formatRemaining(results.ma.remaining)}
  },
  ia: {
${results.ia.failed ? "" : formatRemaining(results.ia.remaining)}
  },
  id: {
${results.id.failed ? "" : formatRemaining(results.id.remaining)}
  },
  ct: {
${results.ct.failed ? "" : formatRemaining(results.ct.remaining)}
  },
};
`;
fs.writeFileSync(path.join(ROOT, "compiled.remaining.five.server.ts"), extra);
console.log("wrote IL/MA/IA/ID/CT catalogs");
