/**
 * Compile official remaining-prize catalogs into Tennessee's 3-tier shape.
 * Run from the project root after downloading source files into tmp/.
 */
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import http from "node:http";

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
    ) ?? rows.find((p) => p !== top && p !== mid) ?? null;
  return [top, mid, cash].filter(Boolean);
}

function themeOf(name, price) {
  const n = name.toLowerCase();
  if (n.includes("crossword") || n.includes("cashword") || n.includes("bingo")) {
    return "crossword";
  }
  if (n.includes("frenzy") || n.includes("blowout") || /\$\d{2,3}\b/.test(name) && price <= 10) {
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

function emitState(id, asOf, games) {
  const drafts = [];
  const remaining = {};
  for (const game of games) {
    const tiers = pickThree(game.prizes);
    if (!tiers.length || !PRICES.has(game.price)) continue;
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

function writeRemaining(map) {
  const blocks = Object.entries(map).map(([id, rows]) => {
    const body = Object.entries(rows)
      .map(([num, triple]) => `    ${num}: [${triple.map((n) => (n == null ? "null" : n)).join(", ")}]`)
      .join(",\n");
    return `  ${id}: {\n${body}\n  }`;
  });
  const src = `/**
 * Compiled remaining overlays. Shape matches Tennessee: [top, mid, cash].
 */
import type { RemainingRow } from "./compile";

export const COMPILED_REMAINING: Record<
  "ky" | "sc" | "ok" | "mi" | "az",
  Record<number, RemainingRow>
> = {
${blocks.join(",\n")},
};

export const KY_REMAINING = COMPILED_REMAINING.ky;
export const SC_REMAINING = COMPILED_REMAINING.sc;
export const OK_REMAINING = COMPILED_REMAINING.ok;
export const MI_REMAINING = COMPILED_REMAINING.mi;
export const AZ_REMAINING = COMPILED_REMAINING.az;
`;
  fs.writeFileSync(path.join(ROOT, "compiled.remaining.server.ts"), src);
}

function kyPriceMap() {
  const html = fs.readFileSync("tmp/ky-all-games.html", "utf8");
  const map = new Map();
  const re = /\/apps\/scratch_offs\/games\/([^"/]+)_(\d+)/gi;
  let m;
  while ((m = re.exec(html))) {
    const slug = m[1];
    const number = Number(m[2]);
    const priced = slug.match(/^\$(\d+)(?=[A-Za-z])/);
    if (priced && PRICES.has(Number(priced[1]))) map.set(number, Number(priced[1]));
  }
  return map;
}

function parseKy(html) {
  const priced = kyPriceMap();
  const games = [];
  const chunks = html.split(/<h4 class="panel-title">/i).slice(1);
  for (const chunk of chunks) {
    const title = chunk.match(/([^<]+?)\s+-\s+(\d+)\s*</);
    if (!title) continue;
    const name = title[1]
      .replace(/<[^>]+>/g, "")
      .replace(/^\/?span>/i, "")
      .replace(/\s+/g, " ")
      .trim();
    const number = Number(title[2]);
    const prizes = [];
    const rowRe =
      /title="Prize Amount">\s*([^<]+)<\/td>[\s\S]*?title="Prizes Remaining">\s*([^<]+)<\/td>/gi;
    let m;
    while ((m = rowRe.exec(chunk))) {
      const amount = money(m[1]);
      const remaining = remainingCount(m[2]);
      if (amount != null) prizes.push({ amount, remaining });
    }
    if (!prizes.length) continue;
    let price = priced.get(number) ?? null;
    const named = name.match(/^\$(\d+)\s+(Set For Life|Break Fort Knox)\b/i);
    if (price == null && named && PRICES.has(Number(named[1]))) price = Number(named[1]);
    const min = Math.min(...prizes.map((p) => p.amount));
    if (price == null && PRICES.has(min)) price = min;
    if (price == null) continue;
    games.push({ number, name, price, prizes, odds: typicalOdds(price) });
  }
  return games;
}

function parseOk(json) {
  const games = [];
  for (const g of json.Games || []) {
    const price = Number(g.Price);
    if (!PRICES.has(price) || !g.IsActive) continue;
    const prizes = (g.Prizes || []).map((p) => ({
      amount: Number(p.PrizeAmount),
      remaining: Number(p.RemainingPrizes),
    }));
    const odds = Number(g.OverallOdds);
    games.push({
      number: Number(g.GameId),
      name: String(g.Name).trim(),
      price,
      prizes,
      odds: Number.isFinite(odds) && odds > 1 ? odds : typicalOdds(price),
    });
  }
  return games;
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; ScratchVault/1.0; remaining-prize compiler)",
          Accept: "text/html,application/json",
        },
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(fetchText(new URL(res.headers.location, url).href));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      },
    );
    req.on("error", reject);
    req.setTimeout(25000, () => req.destroy(new Error("timeout " + url)));
  });
}

function parseScGame(html, fallback) {
  const priceM = html.match(/<p class="label"[^>]*>Price:<\/p><br \/>\s*\$(\d+)/i);
  const nameM = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
  const oddsM = html.match(/Overall Odds:<\/strong>\s*1 in\s*([0-9.]+)/i);
  const prizes = [];
  const re =
    /data-th="Prize Amount By Prize Level">\s*([^<]+)<\/td>\s*<td data-th="Estimated Number of Unclaimed Prizes">\s*([^<]+)<\/td>/gi;
  let m;
  while ((m = re.exec(html))) {
    const amount = money(m[1]);
    const remaining = remainingCount(m[2]);
    if (amount != null) prizes.push({ amount, remaining });
  }
  const price = priceM ? Number(priceM[1]) : fallback.price;
  const name = (nameM ? nameM[1] : fallback.name)
    .replace(/\s*[|#].*$/, "")
    .replace(/South Carolina Education Lottery/i, "")
    .trim();
  const odds = oddsM ? Number(oddsM[1]) : typicalOdds(price);
  return { number: fallback.number, name, price, prizes, odds };
}

const SC_GAMES = [
  { number: 1690, name: "$200,000 Payday", price: 5 },
  { number: 1679, name: "Fivefold Lucky", price: 5 },
  { number: 1699, name: "Giant Jumbo Bucks", price: 5 },
  { number: 1671, name: "Hit $250", price: 5 },
  { number: 1618, name: "In the Green", price: 5 },
  { number: 1673, name: "SUPER LOTERIA", price: 5 },
  { number: 1688, name: "THE PRICE IS RIGHT", price: 5 },
  { number: 1668, name: "Star Power", price: 5 },
  { number: 1660, name: "$100, $200 or $300!", price: 10 },
  { number: 1691, name: "Big Match Bonus", price: 10 },
  { number: 1689, name: "Cash Money", price: 10 },
  { number: 1674, name: "Gold Vault Extra Play", price: 10 },
  { number: 1684, name: "Hit $500", price: 10 },
  { number: 1658, name: "Mighty Jumbo Bucks", price: 10 },
  { number: 1653, name: "Millionaire Bonus", price: 10 },
  { number: 1680, name: "Tenfold Lucky", price: 10 },
  { number: 1669, name: "Winning Spree", price: 10 },
  { number: 1665, name: "200X", price: 20 },
  { number: 1683, name: "Magnificent Jumbo Bucks", price: 20 },
  { number: 1692, name: "Ultimate Millions", price: 20 },
];

async function compileSc() {
  const games = [];
  for (const row of SC_GAMES) {
    const url = `https://www.sceducationlottery.com/Games/InstantGame?gameId=${row.number}`;
    try {
      const html = await fetchText(url);
      const parsed = parseScGame(html, row);
      if (parsed.prizes.length) games.push(parsed);
      else games.push({ ...row, prizes: [{ amount: 0, remaining: 0 }], odds: typicalOdds(row.price) });
    } catch (err) {
      console.error("SC fetch failed", row.number, err.message);
    }
  }
  return games.filter((g) => g.prizes.some((p) => p.amount > 0));
}

function fromRows(number, name, price, odds, rows) {
  return {
    number,
    name,
    price,
    odds,
    prizes: rows.map(([amount, remaining]) => ({ amount, remaining })),
  };
}

/** Official MI remaining tables published at michiganlottery.com remaining-prizes. */
const MI_OFFICIAL = [
  fromRows(758, "Stampede Payout", 5, 3.95, [[500_000, 3], [2_000, 9], [500, 111], [100, 3_815]]),
  fromRows(640, "Lincoln", 5, 3.95, [[500_000, 2], [5_000, 18], [2_000, 34], [500, 157]]),
  fromRows(706, "Money Rush", 5, 3.95, [[500_000, 2], [1_000, 19], [500, 453], [100, 1_106]]),
  fromRows(693, "Triple Red 777s", 5, 3.95, [[500_000, 1], [2_500, 11], [600, 21], [200, 87]]),
  fromRows(757, "Bonus Multiplier", 10, 3.45, [[1_000_000, 3], [10_000, 40], [2_000, 202], [500, 2_147]]),
  fromRows(643, "Hamilton", 10, 3.45, [[1_000_000, 2], [10_000, 15], [2_000, 76], [500, 718]]),
  fromRows(694, "$1,000,000 Instant Jackpot", 10, 3.45, [[1_000_000, 2], [10_000, 29], [2_000, 82], [500, 1_488]]),
  fromRows(691, "50X", 10, 3.45, [[1_000_000, 2], [10_000, 3], [2_000, 52], [500, 530]]),
  fromRows(677, "One Million Payday", 10, 3.81, [[1_000_000, 3], [1_000, 631], [500, 2_348], [200, 4_566]]),
  fromRows(709, "Win $50, $100 or $200", 10, 3.2, [[200, 18_085], [100, 85_778], [50, 266_768]]),
  fromRows(764, "$2 Million Royale", 20, 3.18, [[2_000_000, 3], [2_000, 1_217], [400, 2_729], [200, 56_219]]),
  fromRows(759, "Big Money Pay Day", 20, 3.18, [[2_000_000, 3], [10_000, 13], [2_000, 193], [500, 1_553]]),
  fromRows(648, "Jackson", 20, 3.18, [[2_000_000, 1], [20_000, 13], [2_000, 193], [500, 758]]),
  fromRows(600, "Ace of Spades", 20, 3.18, [[2_000_000, 2], [2_000, 559], [400, 1_228], [200, 25_386]]),
  fromRows(683, "100X", 20, 3.18, [[2_000_000, 1], [10_000, 1], [2_000, 17], [500, 69]]),
  fromRows(755, "Diamond 7s", 30, 2.9, [[4_000_000, 3], [15_000, 17], [3_000, 544], [1_500, 708]]),
  fromRows(719, "Two Million Dollar Cashword", 30, 2.9, [[2_000_000, 2], [10_000, 13], [5_000, 82], [600, 9_630]]),
  fromRows(695, "$6,000,000 WEALTH", 50, 2.7, [[6_000_000, 2], [10_000, 36], [2_000, 2_208], [500, 37_173]]),
  fromRows(630, "500X Money Maker", 50, 2.7, [[6_000_000, 1], [50_000, 1], [5_000, 20], [500, 1_627]]),
];

/** Official AZ top-prize remaining (arizonalottery.com). Mid-tiers omitted when unpublished. */
const AZ_OFFICIAL = [
  fromRows(1520, "50X The Cash", 5, 3.71, [[50_000, 2]]),
  fromRows(1479, "Sizzling Red Hot 7's", 5, 3.68, [[50_000, 1]]),
  fromRows(1497, "Lotería Grande", 5, 3.42, [[50_000, 4]]),
  fromRows(1444, "Cactus Crossword", 5, 3.43, [[50_000, 2]]),
  fromRows(1530, "Rodeo Riches Crossword", 5, 3.43, [[50_000, 15]]),
  fromRows(1545, "Lotería Grande", 5, 3.42, [[50_000, 9]]),
  fromRows(1521, "100X The Cash", 10, 3.44, [[100_000, 4]]),
  fromRows(1489, "Money", 10, 3.44, [[100_000, 5]]),
  fromRows(1508, "Triple Red 7's", 10, 3.45, [[100_000, 7]]),
  fromRows(1512, "Cash King", 10, 3.51, [[100_000, 1]]),
  fromRows(1549, "Perfect 10s", 10, 3.43, [[100_000, 4]]),
  fromRows(1515, "Triple Cash Payout", 10, 3.45, [[100_000, 2]]),
  fromRows(1522, "200X The Cash", 20, 3.05, [[500_000, 4]]),
  fromRows(1496, "Strike It Rich", 20, 3.06, [[500_000, 4]]),
  fromRows(1537, "Jumbo Bucks", 20, 3.09, [[1_000_000, 2]]),
  fromRows(1502, "Ultimate Riches", 30, 2.76, [[3_500_000, 1]]),
  fromRows(1401, "Set For Life", 50, 2.18, [[5_000_000, 2]]),
  fromRows(1480, "$5,000,000 Luxe", 50, 2.83, [[5_000_000, 2]]),
  fromRows(1523, "500X The Cash", 50, 2.55, [[5_000_000, 3]]),
];

const kyHtml = fs.readFileSync("tmp/ky-remaining.html", "utf8");
const okJson = JSON.parse(fs.readFileSync("tmp/ok-scratchers.json", "utf8"));
const ky = emitState("ky", "2026-08-19", parseKy(kyHtml));
const ok = emitState("ok", "2026-08-20", parseOk(okJson));
const scGames = await compileSc();
const sc = emitState("sc", "2026-08-20", scGames);
const mi = emitState("mi", "2026-08-15", MI_OFFICIAL);
const az = emitState("az", "2026-08-21", AZ_OFFICIAL);

console.log("KY", ky.drafts.length, "OK", ok.drafts.length, "SC", sc.drafts.length, "MI", mi.drafts.length, "AZ", az.drafts.length);

writeCatalog("ky.ts", "KY", ky.asOf, ky.drafts);
writeCatalog("ok.ts", "OK", ok.asOf, ok.drafts);
writeCatalog("sc.ts", "SC", sc.asOf, sc.drafts);
writeCatalog("mi.ts", "MI", mi.asOf, mi.drafts);
writeCatalog("az.ts", "AZ", az.asOf, az.drafts);
writeRemaining({
  ky: ky.remaining,
  sc: sc.remaining,
  ok: ok.remaining,
  mi: mi.remaining,
  az: az.remaining,
});
console.log("wrote compiled catalogs + remaining overlays");

