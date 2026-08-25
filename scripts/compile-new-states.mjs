/**
 * Compile NC, PA, TX, MO, OH remaining-prize catalogs into Tennessee's 3-tier shape.
 * Reads downloaded official pages from tmp/.
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
  if (/Last Top Prize Claimed/i.test(String(s))) return 0;
  const n = Number(String(s).replace(/[^0-9]/g, ""));
  return Number.isFinite(n) ? n : null;
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
      (p) =>
        p !== top &&
        p !== mid &&
        p.amount >= 50 &&
        p.amount <= 3_000,
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

function parseOdds(s) {
  const m = String(s || "").match(/1\s*in\s*([0-9.]+)/i);
  const n = m ? Number(m[1]) : Number(String(s).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 1 ? n : null;
}

function emitState(id, asOf, games) {
  const drafts = [];
  const remaining = {};
  const seen = new Set();
  for (const game of games) {
    const tiers = pickThree(game.prizes);
    if (!tiers.length || !PRICES.has(game.price)) continue;
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
${rows.join(",\n")},
];
`;
  fs.writeFileSync(path.join(ROOT, file), src);
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

function parseNc(html) {
  const games = [];
  const chunks = html.split(/class="box cloudfx databox price_/i).slice(1);
  for (const chunk of chunks) {
    const price = Number(chunk.match(/^(\d+)/)?.[1]);
    const number = Number(chunk.match(/Game Number:<\/b>\s*(\d+)/i)?.[1]);
    const name = decode(chunk.match(/class="gamename"><a[^>]*>([^<]+)</i)?.[1] || "");
    if (!PRICES.has(price) || !number || !name) continue;
    const prizes = [];
    const rowRe =
      /class="PrizeValue">([^<]+)<\/span>[\s\S]*?class="PrizeCountRemaining">([^<]+)<\/span>/gi;
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

function parsePa(html) {
  const games = [];
  const tbody = html.match(/id="remaining-prizes"[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i)?.[1] || html;
  const rows = tbody.split(/<tr>/i).slice(1);
  for (const row of rows) {
    const number = Number(
      row.match(/data-order="(\d+)"/)?.[1] || row.match(/class="new-game">(\d+)/)?.[1],
    );
    const name = decode(
      row.match(/underline-link"[^>]*>([^<]+)</i)?.[1] ||
        row.match(/data-order="([^"]+)"><a class="underline-link"/i)?.[1] ||
        "",
    ).replace(/^0+(?=\$)/, "");
    const price = Number(row.match(/data-order="(\d+)">\$\d+/i)?.[1] || money(row.match(/\$(\d+)/)?.[0]));
    if (!PRICES.has(price) || !number || !name) continue;
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
    if (cells.length < 5) continue;
    const amounts = [...cells[3].matchAll(/<div>([^<]+)<\/div>/gi)].map((m) => money(m[1]));
    const lefts = [...cells[4].matchAll(/<div>([^<]+)<\/div>/gi)].map((m) => remainingCount(m[1]));
    const prizes = amounts
      .map((amount, i) => ({ amount, remaining: lefts[i] ?? null }))
      .filter((p) => p.amount != null);
    if (!prizes.length) continue;
    games.push({ number, name, price, prizes, odds: typicalOdds(price) });
  }
  return games;
}

function parseTx(html) {
  const games = [];
  let current = null;
  const rows = html.split(/<tr>/i).slice(1);
  for (const row of rows) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
      decode(m[1].replace(/<[^>]+>/g, " ")),
    );
    if (cells.length < 3) continue;
    const number = Number(cells[0].replace(/[^\d]/g, ""));
    if (Number.isFinite(number) && number > 0) {
      if (current) games.push(current);
      const price = money(cells[2]);
      const name = cells[4] || cells[3] || "";
      const amount = money(cells[5] ?? cells[cells.length - 3]);
      const printed = remainingCount(cells[6] ?? cells[cells.length - 2]);
      const claimed = remainingCount(cells[7] ?? cells[cells.length - 1]);
      current = {
        number,
        name,
        price,
        odds: typicalOdds(price),
        prizes: [],
      };
      if (amount != null) {
        current.prizes.push({
          amount,
          remaining:
            printed != null && claimed != null ? Math.max(0, printed - claimed) : printed,
        });
      }
      continue;
    }
    if (!current) continue;
    const amount = money(cells[0] || cells[1] || cells[cells.length - 3]);
    const printed = remainingCount(cells[cells.length - 2]);
    const claimed = remainingCount(cells[cells.length - 1]);
    if (amount != null) {
      current.prizes.push({
        amount,
        remaining:
          printed != null && claimed != null ? Math.max(0, printed - claimed) : printed,
      });
    }
  }
  if (current) games.push(current);
  return games.filter((g) => PRICES.has(g.price) && g.prizes.length);
}

function parseMo(html) {
  const games = [];
  const chunks = html.split(/scratchers-list__item/).slice(1);
  for (const chunk of chunks) {
    const number = Number(
      chunk.match(/scratchers\.do\?method=d&game=(\d+)/)?.[1] ||
        chunk.match(/scratchers-list__num">\s*#\s*(\d+)/)?.[1],
    );
    const name = decode(
      chunk.match(/scratchers-list__title">\s*<span>([^<]+)<\/span>/i)?.[1] || "",
    );
    const priceBlock = chunk.match(/Ticket Price:<\/div>\s*<div class="scratchers-list__value">\s*([^<]+)/i);
    const price = money(priceBlock?.[1] || "");
    if (!PRICES.has(price) || !number || !name) continue;
    const prizes = [];
    const table = chunk.match(/scratchers-list__table[\s\S]*?<\/table>/i)?.[0] || "";
    const rowRe = /<tr>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>/gi;
    let m;
    while ((m = rowRe.exec(table))) {
      const amount = money(m[1]);
      const remaining = remainingCount(m[3]);
      if (amount != null) prizes.push({ amount, remaining });
    }
    if (!prizes.length) continue;
    games.push({ number, name, price, prizes, odds: typicalOdds(price) });
  }
  return games;
}

function ohioAmount(prize) {
  const desc = String(prize.description || "");
  const yr = desc.match(/\/YR FOR (\d+) YRS/i);
  if (yr && prize.prizeValue) return prize.prizeValue * Number(yr[1]);
  const cash = desc.match(/cash option[:\s]*\$?\s*([\d,]+)/i);
  if (cash) return money(cash[1]);
  return prize.prizeValue;
}

function parseOh(remainingJson, allJson) {
  const remaining = remainingJson.data || [];
  const all = Object.values(allJson.data || {}).flat();
  const oddsByNumber = new Map();
  for (const g of all) {
    const n = Number(g.gameNumber);
    const odds = parseOdds(g.oddsOfWinning);
    if (Number.isFinite(n) && odds) oddsByNumber.set(n, odds);
  }
  const games = [];
  for (const g of remaining) {
    const price = Number(g.ticketPrice);
    const number = Number(g.gameCode);
    if (!PRICES.has(price) || !number) continue;
    const prizes = (g.prizeRemainingValues || [])
      .map((p) => ({
        amount: ohioAmount(p),
        remaining: Number.isFinite(p.prizesLeft) ? p.prizesLeft : remainingCount(p.prizesLeft),
      }))
      .filter((p) => p.amount != null && p.amount > 0);
    if (!prizes.length) continue;
    games.push({
      number,
      name: decode(g.gameName),
      price,
      prizes,
      odds: oddsByNumber.get(number) ?? typicalOdds(price),
    });
  }
  return games;
}

const nc = emitState("nc", "2026-08-20", parseNc(fs.readFileSync("tmp/nc-raw.html", "utf8")));
const pa = emitState("pa", "2026-08-18", parsePa(fs.readFileSync("tmp/pa-raw.html", "utf8")));
const tx = emitState("tx", "2026-08-20", parseTx(fs.readFileSync("tmp/tx-print.html", "utf8")));
const mo = emitState("mo", "2026-08-21", parseMo(fs.readFileSync("tmp/mo-raw.html", "utf8")));
const oh = emitState(
  "oh",
  "2026-08-21",
  parseOh(
    JSON.parse(fs.readFileSync("tmp/oh-remaining.json", "utf8")),
    JSON.parse(fs.readFileSync("tmp/oh-all.json", "utf8")),
  ),
);

for (const state of [nc, pa, tx, mo, oh]) {
  console.log(state.id, state.drafts.length, "games");
  const byPrice = {};
  for (const g of state.drafts) byPrice[g.price] = (byPrice[g.price] || 0) + 1;
  console.log(" ", byPrice);
  console.log("  sample", state.drafts[0]);
}

writeCatalog("nc.ts", "NC", nc.asOf, nc.drafts);
writeCatalog("pa.ts", "PA", pa.asOf, pa.drafts);
writeCatalog("tx.ts", "TX", tx.asOf, tx.drafts);
writeCatalog("mo.ts", "MO", mo.asOf, mo.drafts);
writeCatalog("oh.ts", "OH", oh.asOf, oh.drafts);

function formatRemaining(rows) {
  return Object.entries(rows)
    .map(([num, triple]) => `    ${num}: [${triple.map((n) => (n == null ? "null" : n)).join(", ")}]`)
    .join(",\n");
}

const extra = `/**
 * Compiled remaining overlays for NC, PA, TX, MO, OH.
 * Shape matches Tennessee: [top, mid, cash].
 */
import type { RemainingRow } from "./compile";

export const EXTRA_COMPILED_REMAINING: Record<
  "nc" | "pa" | "tx" | "mo" | "oh",
  Record<number, RemainingRow>
> = {
  nc: {
${formatRemaining(nc.remaining)}
  },
  pa: {
${formatRemaining(pa.remaining)}
  },
  tx: {
${formatRemaining(tx.remaining)}
  },
  mo: {
${formatRemaining(mo.remaining)}
  },
  oh: {
${formatRemaining(oh.remaining)}
  },
};
`;
fs.writeFileSync(path.join(ROOT, "compiled.remaining.extra.server.ts"), extra);
console.log("wrote NC/PA/TX/MO/OH catalogs + extra remaining overlays");
