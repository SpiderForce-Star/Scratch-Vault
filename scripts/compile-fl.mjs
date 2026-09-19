/**
 * Compile Florida leftover catalog from the official top-remaining table.
 * Remaining “N of M” → leftover N. $1/$2/$3 stay off the desk.
 *
 * Official columns: Game, Top Prize, Remaining, Ticket Price.
 * Mid/cash only when a second $50+ row is published on that table.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const dirname = path.dirname;
import {
  parseOfficialRemaining,
  toCatalog,
  persistPrizeTiers,
} from "../src/data/states/parse.server.ts";

const root = path.join(dirname(fileURLToPath(import.meta.url)), "..");
const AS_OF = "2026-09-18";
const FETCHED = "2026-09-18T12:00:00-04:00";
const SOURCE = "https://floridalottery.com/games/scratch-offs/top-remaining-prizes";

/** Official leftover rows captured 2026-09-18 from floridalottery.com top-remaining-prizes. */
const ROWS = `
THE PERFECT GIFT(#7028)|$5,000,000|2 of 4|$20
CA$H IN HAND(#5063)|$1,370,000|4 of 4|$10
FIND THE 7S(#5060)|$50,000|0 of 8|$2
THE CASH WHEEL(#5059)|$1,000,000|2 of 6|$5
MILLIONAIRE MAKER(#5058)|$1,000,000|0 of 6|$5
EASY MONEY(#5057)|$50,000|3 of 8|$2
JEOPARDY(#5056)|$1,000,000|4 of 10|$5
EMERALD MINE 9X(#5055)|$500,000|1 of 10|$5
FLORIDA 300X THE CASH(#5048)|$15,000,000|1 of 4|$30
FLORIDA 300X THE CASH(#5048)|$1,000,000|2 of 24|$30
20X THE CASH(#5027)|$100,000|6 of 20*|$2
$500,000 CASH BLITZ(#1642)|$500,000|60 of 60|$50
POWER 20X(#1641)|$606,600|4 of 4|$5
MEGA BUCKS(#1640)|$5,000,000|4 of 4|$20
JUMBO BUCKS(#1639)|$2,000,000|3 of 4|$10
GIANT BUCKS(#1638)|$1,000,000|3 of 4|$5
BIG BUCKS(#1637)|$50,000|9 of 12|$2
LUCKY BUCKS(#1636)|$10,000|19 of 24|$1
AMERICA 250 FLORIDA(#1635)|$1,000,000|3 of 4|$5
MEGA 7's(#1634)|$3,089,000|3 of 4|$20
$1,000,000 CASH STACKS(#1633)|$616,700|2 of 4|$5
GOLD MINE(#1632)|$150,000|3 of 4|$3
RED, WHITE & BLUE CASH(#1631)|$50,000|3 of 4|$2
$2,000,000 FORTUNE(#1630)|$2,000,000|1 of 4|$10
PRECIOUS METALS GOLD MULTIPLIE(#1629)|$1,000,000|0 of 4|$5
SILVER & GOLD CROSSWORD(#1628)|$500,000|2 of 4|$5
500X THE CASH(#1627)|$25,000,000|1 of 2|$50
500X THE CASH(#1627)|$1,000,000|19 of 28|$50
BONUS BLOWOUT(#1626)|$500|1,404 of 6,116|$5
LUCKY CLOVERS(#1625)|$50,000|1 of 4|$2
FAST $50's(#1624)|$5,000|2 of 12|$1
200X THE CASH(#1623)|$5,000,000|1 of 4|$20
100X THE CASH(#1622)|$2,000,000|0 of 4|$10
50X THE CASH(#1621)|$1,000,000|2 of 6|$5
20X THE CASH(#1620)|$100,000|1 of 10|$2
10X THE CASH(#1619)|$10,000|12 of 32|$1
DOUBLE DIAMOND CASHWORD(#1618)|$2,000,000|2 of 4|$10
BONUS BOX BINGO(#1617)|$150,000|2 of 4|$3
LOTERIA(#1616)|$150,000|1 of 6|$3
HAPPY NEW YEAR 2026(#1615)|$50,000|1 of 6|$2
WIN IT ALL!(#1614)|$50,000|0 of 6|$2
$1,000,000 HOLIDAY CA$H(#1613)|$1,000,000|1 of 4|$20
$500,000 HOLIDAY CA$H(#1612)|$500,000|1 of 4|$10
$250,000 HOLIDAY CA$H(#1611)|$250,000|2 of 4|$5
$10,000 HOLIDAY CA$H(#1609)|$10,000|1 of 4|$1
$15MM DIAMOND SPECTACULAR(#1608)|$15,000,000|1 of 2|$30
$15MM DIAMOND SPECTACULAR(#1608)|$1,000,000|3 of 4|$30
$50, $100 & $500 BLOWOUT(#1607)|$500|8,720 of 33,725*|$10
BREAK THE BANK(#1606)|$1,000,000|1 of 4|$5
$150,000 CROSSWORD BONUS(#1605)|$150,000|3 of 8|$3
$500,000 CASH BLOWOUT!(#1604)|$500,000|49 of 100|$50
$10,000 A WEEK FOR LIFE(#1602)|$10,000.00/WK/LIFE|1 of 4|$20
$5,000 A WEEK FOR LIFE(#1601)|$5,000.00 WK/LIFE|1 of 4|$10
$2,500 A WEEK FOR LIFE(#1600)|$2,500.00 WK/LIFE|1 of 4|$5
$1,000 A WEEK FOR LIFE(#1599)|$1,000.00 WK/LIFE|2 of 4|$2
$500 A WEEK FOR LIFE(#1598)|$500.00 WK/LIFE|1 of 4|$1
SCORCHING HOT 7s(#1597)|$2,000,000|1 of 4|$10
GUY HARVEY $1M FLORIDA BIG BILLS(#1596)|$1,000,000|1 of 3|$5
$5,000,000 CA$H MONEY(#1594)|$5,000,000|1 of 4|$20
MONEY MATCH(#1593)|$1,000,000|1 of 4|$5
ADD IT UP(#1591)|$50,000|3 of 8|$2
$25MM GOLD RUSH MULTIPLIER(#1590)|$25,000,000|1 of 2|$50
$25MM GOLD RUSH MULTIPLIER(#1590)|$1,000,000|27 of 60|$50
5 TIMES LUCKY(#1588)|$1,000,000|0 of 4|$5
QUICK $100S(#1587)|$50,000|1 of 4|$2
$2MM GOLD RUSH MULTIPLIER(#1586)|$2,000,000|1 of 5|$10
$100K GOLD RUSH MULTIPLIER(#1584)|$100,000|0 of 10|$2
$10K GOLD RUSH MULTIPLIER(#1583)|$10,000|23 of 64*|$1
ULTIMATE VIP CASHWORD(#1582)|$2,000,000|0 of 8|$10
PLATINUM MINE 9X(#1581)|$1,000,000|0 of 4|$5
$5,000 HOLIDAY BLOWOUT(#1575)|$5,000|3 of 16|$1
$20 MONOPOLY SECRET VAULT(#1569)|$5,000,000|0 of 4|$20
$10 MONOPOLY SECRET VAULT(#1568)|$2,000,000|0 of 4|$10
$5 MONOPOLY SECRET VAULT(#1567)|$1,000,000|0 of 6|$5
$2 MONOPOLY SECRET VAULT(#1566)|$100,000|2 of 8|$2
GOLD RUSH LEGACY(#1562)|$10,000,000|0 of 4|$20
GOLD RUSH LEGACY(#1562)|$1,000,000|4 of 20|$20
BONUS LETTER CROSSWORD(#1557)|$1,000,000|1 of 10|$5
500X THE CASH(#1555)|$25,000,000|1 of 2|$50
500X THE CASH(#1555)|$1,000,000|31 of 160|$50
100X THE CASH(#1554)|$2,000,000|1 of 10|$10
50X THE CASH(#1553)|$1,000,000|4 of 14|$5
20X THE CASH(#1552)|$100,000|1 of 14|$2
$5MM TRIPLE MATCH(#1543)|$5,000,000|0 of 8|$20
$5MM TRIPLE MATCH(#1543)|$1,000,000|2 of 18|$20
$5M CROSSWORD CASH(#1539)|$5,000,000|0 of 6*|$20
$5M CROSSWORD CASH(#1539)|$1,000,000|2 of 18*|$20
$5 GOLD RUSH DOUBLER(#1527)|$1,000,000|5 of 28|$5
$2 GOLD RUSH DOUBLER(#1526)|$100,000|9 of 36|$2
LUCKY NUMBERS(#1524)|$500,000|2 of 16|$5
THE PRICE IS RIGHT(#1518)|$1,000,000|4 of 8|$5
TRIPLE CROSSWORD(#1497)|$150,000|0 of 30*|$3
`.trim();

function officialTableHtml() {
  const body = ROWS.split("\n")
    .map((line) => {
      const [game, prize, remaining, price] = line.split("|");
      const number = game.match(/\(#(\d+)\)/)?.[1];
      return `<tr><td><a href="https://floridalottery.com/games/scratch-offs/view?id=${number}">${game}</a></td><td>${prize}</td><td><a href="https://files.floridalottery.com/exptkt/${number}_WinningTicketInformation.pdf">${remaining}</a></td><td>${price}</td></tr>`;
    })
    .join("\n");
  return `<table>
<thead><tr><th>Game</th><th>Top Prize</th><th>Remaining</th><th>Ticket Price</th></tr></thead>
<tbody>
${body}
</tbody>
</table>`;
}

const html = officialTableHtml();
const parsed = parseOfficialRemaining("fl", html);
const games = toCatalog(parsed, "official-remaining").map((game) => ({
  ...game,
  stateId: "fl",
  tiers: persistPrizeTiers(game.tiers),
}));
games.sort((a, b) => a.price - b.price || b.topPrize - a.topPrize);

if (games.length < 3) {
  console.error("FL compile thin:", games.length, "— fail closed");
  process.exit(1);
}
if (games.some((g) => ![5, 10, 20, 25, 30, 50].includes(g.price))) {
  console.error("FL compile leaked under-$5");
  process.exit(1);
}

function themeLine(game) {
  return game.theme && game.theme !== "cash" ? `\n    theme: ${JSON.stringify(game.theme)},` : "";
}

const rows = games.map((g) => {
  const tiers = g.tiers.map((t) => `{ amount: ${t.amount} }`).join(", ");
  return `  compiledGame({
    number: ${g.number},
    name: ${JSON.stringify(g.name)},
    price: ${g.price},
    topPrize: ${g.topPrize},
    odds: ${g.odds},
    tiers: [${tiers}],${themeLine(g)}
  })`;
});

const flTs = `/**
 * Compiled from the official Florida top-remaining-prizes table as of ${AS_OF}.
 * Remaining “N of M” is leftover N. Mid/cash only when published. Not store inventory.
 */
import { compiledGame } from "./compile";
import type { Game } from "@/data/games";

export const FL_AS_OF = ${JSON.stringify(AS_OF)};

export const FL_GAMES: Game[] = [
${rows.join(",\n")},
];
`;

fs.writeFileSync(path.join(root, "src/data/states/fl.ts"), flTs);

const remaining = {};
for (const game of games) {
  remaining[game.number] = game.tiers.map((t) => (t.remaining == null ? null : t.remaining));
}

const lastGood = {
  stateId: "fl",
  ok: true,
  stale: false,
  fetchedAt: FETCHED,
  weekLabel: "Compiled · September 18, 2026",
  sourceUrl: SOURCE,
  reason: "ok",
  gameCount: games.length,
  catalog: games,
};
fs.writeFileSync(
  path.join(root, "src/data/states/last-good/fl.json"),
  `${JSON.stringify(lastGood)}\n`,
);

const fivePath = path.join(root, "src/data/states/compiled.remaining.five.server.ts");
let five = fs.readFileSync(fivePath, "utf8");
if (!five.includes('"fl"')) {
  five = five.replace(
    `export const FIVE_COMPILED_REMAINING: Record<
  "il" | "ma" | "ia" | "id" | "ct",
  Record<number, RemainingRow>
> = {`,
    `export const FIVE_COMPILED_REMAINING: Record<
  "il" | "ma" | "ia" | "id" | "ct" | "fl",
  Record<number, RemainingRow>
> = {`,
  );
}
const flBlock = Object.entries(remaining)
  .map(([num, triple]) => `    ${num}: [${triple.map((n) => (n == null ? "null" : n)).join(", ")}]`)
  .join(",\n");
if (/  fl: \{[\s\S]*?\n  \}/.test(five)) {
  five = five.replace(/  fl: \{[\s\S]*?\n  \}/, `  fl: {\n${flBlock}\n  }`);
} else {
  five = five.replace(/\n\};\n/, `,\n  fl: {\n${flBlock}\n  }\n};\n`);
}
fs.writeFileSync(fivePath, five);

const compiledPath = path.join(root, "src/data/states/compiled.remaining.server.ts");
let compiled = fs.readFileSync(compiledPath, "utf8");
if (!compiled.includes('| "fl"')) {
  compiled = compiled.replace('| "ct"', '| "ct"\n  | "fl"');
}
if (!compiled.includes("export const FL_REMAINING")) {
  compiled = compiled.replace(
    "export const CT_REMAINING = COMPILED_REMAINING.ct;",
    "export const CT_REMAINING = COMPILED_REMAINING.ct;\nexport const FL_REMAINING = COMPILED_REMAINING.fl;",
  );
}
fs.writeFileSync(compiledPath, compiled);

const snippet = `<table>
<thead><tr><th>Game</th><th>Top Prize</th><th>Remaining</th><th>Ticket Price</th></tr></thead>
<tbody>
<tr><td>THE PERFECT GIFT(#7028)</td><td>$5,000,000</td><td>2 of 4</td><td>$20</td></tr>
<tr><td>500X THE CASH(#1627)</td><td>$25,000,000</td><td>1 of 2</td><td>$50</td></tr>
<tr><td>LUCKY BUCKS(#1636)</td><td>$10,000</td><td>19 of 24</td><td>$1</td></tr>
</tbody>
</table>
`;
fs.mkdirSync(path.join(root, "scripts/fixtures"), { recursive: true });
fs.writeFileSync(path.join(root, "scripts/fixtures/fl-top-remaining.snippet.html"), snippet);

console.log("FL compile", games.length, "games", "prices", [...new Set(games.map((g) => g.price))].sort((a, b) => a - b).join(","));
