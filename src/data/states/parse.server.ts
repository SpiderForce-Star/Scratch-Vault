/**
 * Official remaining-prize parsers. Server-only.
 * remaining is a published integer ≥ 0, or null — never invented.
 */
import type { Game, GameSource, TicketTheme } from "../games";
import type { StateId } from "../../config/states";

/** Desk prices. Under $5 may appear on the same remaining page; they are not a $1 scrape. */
const DESK_PRICES = new Set([5, 10, 20, 25, 30, 50]);
const PRICES = new Set([1, 2, 3, ...DESK_PRICES]);

export type ParsedPrize = { amount: number; remaining: number | null };
export type ParsedGame = {
  number: number;
  name: string;
  price: number;
  prizes: ParsedPrize[];
  odds?: number | null;
};

export function money(s: string): number | null {
  const cash = String(s).match(/cash option[:\s]*\$?([\d,]+(?:\.\d+)?)/i);
  if (cash) {
    const n = Number(cash[1].replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(String(s).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function remainingCount(s: unknown): number | null {
  if (s == null || s === "") return null;
  if (/Last Top Prize Claimed/i.test(String(s))) return 0;
  const t = String(s).replace(/,/g, "").trim();
  if (!t || t === "—" || t === "-" || /n\/a/i.test(t)) return null;
  if (!/\d/.test(t)) return null;
  const n = Number(t.replace(/[^0-9-]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function extractAsOf(html: string): string | null {
  const monthDay = html.match(
    /as of\s*(?:<!-- -->)?\s*([A-Za-z]+ \d{1,2}, \d{4})/i,
  )?.[1];
  if (monthDay) {
    const parsed = Date.parse(monthDay);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  }
  const slash =
    html.match(/DataAsOf[^>]*>([0-9/]+)/i)?.[1] ||
    html.match(/as of[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i)?.[1];
  if (slash) {
    const [m, d, y] = slash.split("/");
    const year = y.length === 2 ? `20${y}` : y;
    const iso = `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T12:00:00-05:00`;
    const parsed = Date.parse(iso);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  }
  return null;
}

function normName(name: string): string {
  return decodeHtml(name).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function decodeHtml(s: string): string {
  return String(s)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strip leftover markup fragments from remaining-prize HTML parses. */
export function sanitizeGameName(name: string): string {
  return decodeHtml(name)
    .replace(/^\/?(span|div|h[1-6]|p|strong|em|b|i|label|a)\s*>\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Texas start-date cells (MM/DD/YY) are not game names. */
export function looksLikeDateName(name: string): boolean {
  return /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(String(name ?? "").trim());
}

function typicalOdds(price: number): number {
  if (price >= 50) return 2.7;
  if (price >= 30) return 2.9;
  if (price >= 25) return 2.97;
  if (price >= 20) return 3.18;
  if (price >= 10) return 3.45;
  if (price >= 5) return 3.95;
  if (price >= 3) return 3.85;
  if (price >= 2) return 4.4;
  return 4.6;
}

function themeOf(name: string, price: number): TicketTheme {
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

function cashPrizeAmount(label: string): number | null {
  const text = String(label);
  const cash = text.match(/cash(?:\s*option)?[:\s]*\$([\d,.]+)/i);
  if (cash) return money(cash[1]);
  return money(text.split("(")[0] ?? text);
}

/** Prize-amount rows and ended/garbled names are not games. Do not merge them. */
export function isImportedJunkGame(game: { number: number; name: string }): boolean {
  const name = String(game.name ?? "").trim();
  if (!name) return true;
  if (looksLikeDateName(name)) return true;
  if (/no longer available/i.test(name)) return true;
  if (/\(#\s*\d+\s*\)/.test(name)) return true;
  if (PRICES.has(Number(name))) return true;
  if (game.number > 9999) return true;
  return false;
}

export function trustedCatalog<T extends { number: number; name: string }>(games: T[]): T[] {
  const seen = new Set<number>();
  const out: T[] = [];
  for (const game of games) {
    const name = sanitizeGameName(game.name);
    if (!name) continue;
    const cleaned = name === game.name ? game : { ...game, name };
    if (isImportedJunkGame(cleaned)) continue;
    if (!cleaned.number || !cleaned.name) continue;
    if (seen.has(cleaned.number)) continue;
    seen.add(cleaned.number);
    out.push(cleaned);
  }
  return out;
}

/** Keep snapshot remaining; add bundled games the snapshot does not have. */
export function unionBundledGames<T extends { number: number; name: string }>(
  snapshot: T[],
  bundled: T[],
): T[] {
  const byNumber = new Map(snapshot.map((game) => [game.number, game]));
  for (const game of bundled) {
    const existing = byNumber.get(game.number);
    if (!existing) {
      byNumber.set(game.number, game);
      continue;
    }
    if (looksLikeDateName(existing.name) && game.name && !looksLikeDateName(game.name)) {
      byNumber.set(game.number, { ...existing, name: game.name });
    }
  }
  return trustedCatalog([...byNumber.values()]);
}

export function toCatalog(games: ParsedGame[], source: GameSource): Game[] {
  const seen = new Set<number>();
  const out: Game[] = [];
  for (const game of games) {
    if (!PRICES.has(game.price) || !game.number || !game.name) continue;
    if (isImportedJunkGame(game)) continue;
    if (seen.has(game.number)) continue;
    const prizes = [...game.prizes]
      .filter((p) => p.amount > 0)
      .sort((a, b) => b.amount - a.amount);
    if (!prizes.length) continue;
    const topPrize = prizes[0].amount;
    if (!topPrize) continue;
    seen.add(game.number);
    out.push({
      number: game.number,
      name: sanitizeGameName(game.name),
      price: game.price as Game["price"],
      topPrize,
      odds: game.odds && game.odds > 1 ? game.odds : typicalOdds(game.price),
      source,
      theme: themeOf(game.name, game.price),
      tiers: prizes.map((p) => ({ amount: p.amount, remaining: p.remaining })),
    });
  }
  out.sort((a, b) => a.price - b.price || b.topPrize - a.topPrize);
  return out;
}

function pushPrize(
  map: Map<number, ParsedGame>,
  game: { number: number; name: string; price: number; odds?: number | null },
  prize: ParsedPrize,
) {
  const row = map.get(game.number) ?? {
    number: game.number,
    name: game.name,
    price: game.price,
    odds: game.odds,
    prizes: [],
  };
  if (!row.name && game.name) row.name = game.name;
  if (!row.price && game.price) row.price = game.price;
  row.prizes.push(prize);
  map.set(game.number, row);
}

function parseKy(html: string): ParsedGame[] {
  const map = new Map<number, ParsedGame>();
  const chunks = html.split(/<h4 class="panel-title">/i).slice(1);
  for (const chunk of chunks) {
    const title = chunk.match(/([^<]+?)\s+-\s+(\d+)\s*</);
    if (!title) continue;
    const name = decodeHtml(title[1]);
    const number = Number(title[2]);
    const rowRe =
      /title="Prize Amount">\s*([^<]+)<\/td>[\s\S]*?title="Prizes Remaining">\s*([^<]+)<\/td>/gi;
    let m: RegExpExecArray | null;
    const prizes: ParsedPrize[] = [];
    while ((m = rowRe.exec(chunk))) {
      const amount = cashPrizeAmount(m[1]);
      if (amount != null) prizes.push({ amount, remaining: remainingCount(m[2]) });
    }
    if (!prizes.length || !number || !name) continue;
    const named = name.match(/^\$(\d+)\b/);
    const min = Math.min(...prizes.map((p) => p.amount));
    const price = named && PRICES.has(Number(named[1])) ? Number(named[1]) : PRICES.has(min) ? min : 0;
    if (!PRICES.has(price)) continue;
    map.set(number, { number, name, price, prizes });
  }
  return [...map.values()];
}

function parseNc(html: string): ParsedGame[] {
  const games: ParsedGame[] = [];
  const chunks = html.split(/class="box cloudfx databox price_/i).slice(1);
  for (const chunk of chunks) {
    const price = Number(chunk.match(/^(\d+)/)?.[1]);
    const number = Number(chunk.match(/Game Number:<\/b>\s*(\d+)/i)?.[1]);
    const name = decodeHtml(chunk.match(/class="gamename"><a[^>]*>([^<]+)</i)?.[1] || "");
    if (!PRICES.has(price) || !number || !name) continue;
    const prizes: ParsedPrize[] = [];
    const rowRe =
      /class="PrizeValue">([^<]+)<\/span>[\s\S]*?class="PrizeCountRemaining">([^<]+)<\/span>/gi;
    let m: RegExpExecArray | null;
    while ((m = rowRe.exec(chunk))) {
      const amount = cashPrizeAmount(m[1]);
      if (amount != null) prizes.push({ amount, remaining: remainingCount(m[2]) });
    }
    if (prizes.length) games.push({ number, name, price, prizes });
  }
  return games;
}

function parsePa(html: string): ParsedGame[] {
  const games: ParsedGame[] = [];
  const tbody = html.match(/id="remaining-prizes"[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i)?.[1] || html;
  for (const row of tbody.split(/<tr/i).slice(1)) {
    const number = Number(
      row.match(/data-order="(\d+)"/)?.[1] || row.match(/class="new-game">(\d+)/)?.[1],
    );
    const name = decodeHtml(
      row.match(/underline-link"[^>]*>([^<]+)</i)?.[1] || "",
    );
    const price = Number(row.match(/data-order="(\d+)">\$\d+/i)?.[1] || money(row.match(/\$(\d+)/)?.[0] || ""));
    if (!PRICES.has(price) || !number || !name) continue;
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
    if (cells.length < 5) continue;
    const amounts = [...cells[3].matchAll(/<div>([^<]+)<\/div>/gi)].map((m) => cashPrizeAmount(m[1]));
    const lefts = [...cells[4].matchAll(/<div>([^<]+)<\/div>/gi)].map((m) => remainingCount(m[1]));
    const prizes = amounts
      .map((amount, i) => (amount != null ? { amount, remaining: lefts[i] ?? null } : null))
      .filter((p): p is ParsedPrize => p != null);
    if (prizes.length) games.push({ number, name, price, prizes });
  }
  return games;
}

function txPrintedMinusClaimed(printed: string, claimed: string): number | null {
  const p = remainingCount(printed);
  const c = remainingCount(claimed);
  if (p == null || c == null) return null;
  return Math.max(0, p - c);
}

function txRowName(cells: string[]): string {
  // Game# | Start Date | Price | Game Name | Prize | Printed | Claimed
  // Live table inserts a closing-soon column before the name.
  for (const candidate of [cells[3], cells[4]]) {
    const name = sanitizeGameName(candidate || "");
    if (!name || name === "*" || looksLikeDateName(name)) continue;
    if (/^\$?[\d,]+(?:\.\d+)?$/.test(name.replace(/\s/g, ""))) continue;
    return name;
  }
  return "";
}

function parseTx(html: string): ParsedGame[] {
  const map = new Map<number, ParsedGame>();
  let current: ParsedGame | null = null;
  for (const row of html.split(/<tr/i).slice(1)) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
      decodeHtml(m[1]),
    );
    if (cells.length < 3) continue;
    const number = Number(cells[0].replace(/[^\d]/g, ""));
    if (Number.isFinite(number) && number > 0 && cells[1]) {
      const dateHeader = looksLikeDateName(cells[1]);
      const name = dateHeader ? txRowName(cells) : sanitizeGameName(cells[1]);
      const price = dateHeader ? money(cells[2]) : money(cells[2]) ?? money(cells[1]);
      current = {
        number,
        name,
        price: price ?? 0,
        prizes: [],
      };
      map.set(number, current);
    }
    if (!current) continue;
    const amount = cashPrizeAmount(cells[cells.length - 3] || "");
    const remaining = txPrintedMinusClaimed(
      cells[cells.length - 2] || "",
      cells[cells.length - 1] || "",
    );
    if (amount != null) current.prizes.push({ amount, remaining });
  }
  return [...map.values()].filter((g) => PRICES.has(g.price) && g.prizes.length);
}

function parseIa(html: string): ParsedGame[] {
  const map = new Map<number, ParsedGame>();
  const rowRe =
    /<tr>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html))) {
    if (!/^Scratch/i.test(decodeHtml(m[2]))) continue;
    const nameCell = decodeHtml(m[1]);
    const numM = nameCell.match(/\((\d+)\)\s*$/);
    const number = numM ? Number(numM[1]) : null;
    const name = nameCell.replace(/\(\d+\)\s*$/, "").trim();
    const price = money(m[3]);
    const amount = cashPrizeAmount(m[4]);
    if (!number || !name || !PRICES.has(price ?? -1) || amount == null) continue;
    pushPrize(
      map,
      { number, name, price: price! },
      { amount, remaining: remainingCount(m[6]) },
    );
  }
  if (!map.size) {
    const md =
      /\|\s*([^|]+)\((\d+)\)\s*\|\s*Scratch\s*\|\s*(\d+)\s*\|\s*\$?([\d,]+)\s*\|\s*[\d,]+\s*\|\s*([\d,]+)/gi;
    let row: RegExpExecArray | null;
    while ((row = md.exec(html))) {
      const number = Number(row[2]);
      const name = decodeHtml(row[1]);
      const price = Number(row[3]);
      const amount = money(row[4]);
      if (!number || !name || !PRICES.has(price) || amount == null) continue;
      pushPrize(
        map,
        { number, name, price },
        { amount, remaining: remainingCount(row[5]) },
      );
    }
  }
  return [...map.values()];
}

function parseIl(html: string): ParsedGame[] {
  const map = new Map<number, ParsedGame>();
  const cards = html.split(/class="[^"]*unpaid[^"]*"|class="[^"]*unclaimed[^"]*"/i);
  const chunks = cards.length > 1 ? cards : html.split(/game number/i);
  for (const chunk of chunks) {
    const number = Number(
      chunk.match(/game number[^0-9]{0,40}(\d{3,5})/i)?.[1] ||
        chunk.match(/\b(\d{4,5})\s*\(\d+\s*weeks?/i)?.[1],
    );
    const price = money(
      chunk.match(/\$(\d+)\s*(?:ticket|games)?/i)?.[0] ||
        chunk.match(/\(\$(\d+)\)/)?.[0] ||
        "",
    );
    const name = decodeHtml(
      chunk.match(/([A-Z0-9$®™'+\- ]{3,60})\s*\(\$\d+\)/)?.[1] ||
        chunk.match(/aria-label="([^"]+)"/i)?.[1] ||
        "",
    );
    if (!number || !name || !PRICES.has(price ?? -1)) continue;
    const values = [...chunk.matchAll(/\$([\d,]+(?:\.\d+)?)/g)].map((m) => money(m[0]));
    const prizes: ParsedPrize[] = [];
    const unclaimedIdx = chunk.toLowerCase().lastIndexOf("unclaimed");
    if (unclaimedIdx >= 0) {
      const after = chunk.slice(unclaimedIdx);
      const lefts = [...after.matchAll(/\b([\d,]{1,7})\b/g)].map((m) => remainingCount(m[1]));
      for (let i = 0; i < values.length && i < lefts.length; i++) {
        if (values[i] != null) prizes.push({ amount: values[i]!, remaining: lefts[i] });
      }
    }
    if (prizes.length) {
      map.set(number, { number, name, price: price!, prizes });
    }
  }
  if (map.size) return [...map.values()];
  return parseGenericTable(html);
}

function parseMa(html: string): ParsedGame[] {
  const map = new Map<number, ParsedGame>();
  for (const row of html.split(/<tr/i).slice(1)) {
    const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) =>
      decodeHtml(c[1]),
    );
    if (cells.length < 4) continue;
    if (/^game$/i.test(cells[0]) || /prize amount/i.test(cells[1] || "")) continue;
    const href = row.match(/href="([^"]+)"/i)?.[1] || "";
    const number = Number(
      href.match(/\/(\d{2,4})(?:\/|"|$)/)?.[1] || cells[0].match(/\b(\d{2,4})\b/)?.[1],
    );
    const name = cells[0];
    const amount = cashPrizeAmount(cells[1] || "");
    const remaining = remainingCount(cells[4] ?? cells[cells.length - 1]);
    if (!number || !name || amount == null) continue;
    const existing = map.get(number);
    const price = existing?.price || money(name) || 0;
    pushPrize(map, { number, name, price }, { amount, remaining });
  }
  return [...map.values()].filter((g) => PRICES.has(g.price));
}

function parseId(html: string): ParsedGame[] {
  const games: ParsedGame[] = [];
  const chunks = /data-game-id="/i.test(html)
    ? html.split(/data-game-id="/i).slice(1)
    : html.split(/class="print-game"/i).slice(1);
  for (const chunk of chunks) {
    const number = Number(
      chunk.match(/^(\d+)/)?.[1] || chunk.match(/data-game-id="(\d+)"/)?.[1],
    );
    const name = decodeHtml(
      chunk.match(/game__title">\s*([^<]+)/i)?.[1] ||
        chunk.match(/print_game__title">\s*([^<]+)/i)?.[1] ||
        "",
    );
    const price = money(
      chunk.match(/game__info-price">\s*([^<]+)/i)?.[1] ||
        chunk.match(/print_game__info-price">\s*([^<]+)/i)?.[1] ||
        "",
    );
    if (!number || !name || !PRICES.has(price ?? -1)) continue;
    const prizes: ParsedPrize[] = [];
    const rowRe =
      /class="prizes-prize">([^<]+)<\/span>[\s\S]*?class="prizes-remaining">([^<]+)</gi;
    let m: RegExpExecArray | null;
    while ((m = rowRe.exec(chunk))) {
      const amount = cashPrizeAmount(m[1]);
      if (amount != null) prizes.push({ amount, remaining: remainingCount(m[2]) });
    }
    if (prizes.length) games.push({ number, name, price: price!, prizes });
  }
  return games;
}

function parseCtIndex(html: string): ParsedGame[] {
  const games: ParsedGame[] = [];
  for (const row of html.split(/<tr/i).slice(1)) {
    const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) =>
      decodeHtml(m[1]),
    );
    if (cells.length < 6) continue;
    const number = Number(cells[0].replace(/[^\d]/g, ""));
    const name = cells[1];
    const price = money(cells[2]);
    const topPrize = cashPrizeAmount(cells[3] || "");
    const remaining = remainingCount(cells[cells.length - 2] || cells[6]);
    if (!number || !name || !PRICES.has(price ?? -1) || topPrize == null) continue;
    games.push({
      number,
      name,
      price: price!,
      prizes: [{ amount: topPrize, remaining }],
    });
  }
  return games;
}

function parseGenericTable(html: string): ParsedGame[] {
  const map = new Map<number, ParsedGame>();
  const tables = html.split(/<table/i).slice(1);
  for (const table of tables) {
    const header = table.match(/<thead[\s\S]*?<\/thead>|<tr[\s\S]*?<\/tr>/i)?.[0] || "";
    const heads = [...header.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((m) =>
      decodeHtml(m[1]).toLowerCase(),
    );
    if (!heads.length) continue;
    const remainingIdx = heads.findIndex((h) => /unclaimed|remaining|left/.test(h));
    const prizeIdx = heads.findIndex((h) => /prize|amount|value/.test(h) && !/remaining|unclaimed/.test(h));
    const nameIdx = heads.findIndex((h) => /name|game/.test(h) && !/number|no\b/.test(h));
    const numberIdx = heads.findIndex((h) => /number|game no|#/.test(h));
    const priceIdx = heads.findIndex((h) => /price|cost|ticket/.test(h));
    if (remainingIdx < 0 || prizeIdx < 0) continue;
    const body = table.replace(/[\s\S]*?<tbody[^>]*>/i, "");
    for (const row of body.split(/<tr/i).slice(1)) {
      const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) =>
        decodeHtml(m[1]),
      );
      if (cells.length <= Math.max(remainingIdx, prizeIdx)) continue;
      const amount = cashPrizeAmount(cells[prizeIdx] || "");
      const remaining = remainingCount(cells[remainingIdx]);
      if (amount == null) continue;
      const number = Number(
        (numberIdx >= 0 ? cells[numberIdx] : cells[0]).replace(/[^\d]/g, ""),
      );
      const name = nameIdx >= 0 ? cells[nameIdx] : cells[1] || cells[0];
      const price = priceIdx >= 0 ? money(cells[priceIdx]) : money(name);
      if (!Number.isFinite(number) || number <= 0 || !name) continue;
      pushPrize(
        map,
        { number, name, price: price ?? 0 },
        { amount, remaining },
      );
    }
  }
  return [...map.values()].filter((g) => PRICES.has(g.price) || g.prizes.length);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseOkJson(data: unknown): ParsedGame[] {
  const root = asRecord(data);
  const list = (root?.Games ?? root?.games ?? data) as unknown;
  if (!Array.isArray(list)) return [];
  const games: ParsedGame[] = [];
  for (const item of list) {
    const g = asRecord(item);
    if (!g) continue;
    const price = Number(g.Price ?? g.price ?? g.ticketPrice);
    const number = Number(g.GameId ?? g.gameId ?? g.gameNumber ?? g.number);
    const name = String(g.Name ?? g.name ?? g.title ?? "").trim();
    if (!PRICES.has(price) || !number || !name) continue;
    if (g.IsActive === false) continue;
    const prizeRows = (g.Prizes ?? g.prizes ?? []) as unknown;
    const prizes: ParsedPrize[] = [];
    if (Array.isArray(prizeRows)) {
      for (const row of prizeRows) {
        const p = asRecord(row);
        if (!p) continue;
        const amount = Number(p.PrizeAmount ?? p.amount ?? p.prize);
        const remaining = remainingCount(p.RemainingPrizes ?? p.remaining ?? p.unclaimed);
        if (Number.isFinite(amount) && amount > 0) prizes.push({ amount, remaining });
      }
    }
    if (!prizes.length) continue;
    const odds = Number(g.OverallOdds ?? g.odds);
    games.push({ number, name, price, prizes, odds: Number.isFinite(odds) ? odds : null });
  }
  return games;
}

function parseJson(body: string): ParsedGame[] {
  try {
    return parseOkJson(JSON.parse(body));
  } catch {
    return [];
  }
}

export function parseOfficialRemaining(
  stateId: StateId,
  body: string,
  contentType = "",
): ParsedGame[] {
  const jsonish = /json/i.test(contentType) || /^\s*[\[{]/.test(body);
  if (jsonish) {
    const fromJson = parseJson(body);
    if (fromJson.length) return fromJson;
  }

  const specific: Record<string, (html: string) => ParsedGame[]> = {
    ky: parseKy,
    nc: parseNc,
    pa: parsePa,
    tx: parseTx,
    ia: parseIa,
    id: parseId,
    ct: parseCtIndex,
    il: parseIl,
    ma: parseMa,
    ok: parseKy,
  };
  const parser = specific[stateId];
  if (parser) {
    const rows = parser(body);
    if (rows.length) return rows;
  }

  const generic = parseGenericTable(body);
  if (generic.length) return generic;
  if (stateId === "tn") return parseGenericTable(body);
  return [];
}

export function overlayTennessee(base: Game[], parsed: ParsedGame[]): Game[] {
  return mergeKnownGames(base, parsed, "tn");
}

function applyParsedRemaining(game: Game, next: ParsedGame, stateId: StateId): Game {
  const byAmount = new Map(next.prizes.map((p) => [p.amount, p.remaining]));
  const seen = new Set<number>();
  const tiers = game.tiers.map((tier) => {
    seen.add(tier.amount);
    return {
      amount: tier.amount,
      remaining: byAmount.has(tier.amount) ? (byAmount.get(tier.amount) ?? null) : null,
    };
  });
  for (const prize of next.prizes) {
    if (seen.has(prize.amount)) continue;
    tiers.push({ amount: prize.amount, remaining: prize.remaining });
  }
  tiers.sort((a, b) => b.amount - a.amount);
  return {
    ...game,
    name:
      next.name && !looksLikeDateName(next.name)
        ? sanitizeGameName(next.name)
        : game.name,
    stateId,
    source: stateId === "tn" ? "tn-remaining" : "official-remaining",
    topPrize: tiers[0]?.amount ?? game.topPrize,
    tiers,
  };
}

/** Overlay published remaining onto known games. Never invent price or missing counts. */
export function mergeKnownGames(
  known: Game[],
  parsed: ParsedGame[],
  stateId: StateId,
): Game[] {
  const cleanKnown = trustedCatalog(known);
  const byNumber = new Map(parsed.map((g) => [g.number, g]));
  const byName = new Map(parsed.map((g) => [normName(g.name), g]));
  const used = new Set<number>();
  const out: Game[] = [];

  for (const game of cleanKnown) {
    const next = byNumber.get(game.number) ?? byName.get(normName(game.name));
    if (!next) {
      out.push({ ...game, stateId });
      continue;
    }
    used.add(next.number);
    out.push(applyParsedRemaining(game, next, stateId));
  }

  const source: GameSource = stateId === "tn" ? "tn-remaining" : "official-remaining";
  for (const row of parsed) {
    if (used.has(row.number)) continue;
    if (isImportedJunkGame(row)) continue;
    const added = toCatalog([row], source);
    if (added[0]) out.push({ ...added[0], stateId });
  }
  return out;
}

export function gamesFromParse(stateId: StateId, parsed: ParsedGame[], bundled: Game[]): Game[] {
  const known = trustedCatalog(bundled);
  if (known.length) return mergeKnownGames(known, parsed, stateId);
  return trustedCatalog(
    toCatalog(parsed, stateId === "tn" ? "tn-remaining" : "official-remaining").map((game) => ({
      ...game,
      stateId,
    })),
  );
}

function rememberListing(
  map: Map<number, ParsedGame>,
  row: { number: number; name?: string; price?: number; top?: number | null },
) {
  if (!row.number) return;
  const prev = map.get(row.number);
  const price = row.price && PRICES.has(row.price) ? row.price : prev?.price ?? 0;
  const name = sanitizeGameName(row.name || prev?.name || "");
  const prizes = [...(prev?.prizes ?? [])];
  if (row.top && row.top > 0 && !prizes.some((p) => p.amount === row.top)) {
    prizes.push({ amount: row.top, remaining: null });
  }
  map.set(row.number, { number: row.number, name, price, prizes });
}

/** New-games pages: number / name / price / top prize. Remaining stays null. */
export function parseNewGameListings(html: string): ParsedGame[] {
  const map = new Map<number, ParsedGame>();

  for (const m of html.matchAll(/instant-games\/[a-z0-9-]+?-(\d{3,4})(?:\/|"|'|\?)/gi)) {
    rememberListing(map, { number: Number(m[1]) });
  }
  for (const m of html.matchAll(/Game Number:\s*<\/b>\s*(\d{3,4})/gi)) {
    rememberListing(map, { number: Number(m[1]) });
  }
  for (const m of html.matchAll(/data-game-id="(\d{3,4})"/gi)) {
    rememberListing(map, { number: Number(m[1]) });
  }
  for (const m of html.matchAll(
    /<h4 class="panel-title">[\s\S]*?([^<]+?)\s+-\s+(\d{2,4})\s*</gi,
  )) {
    rememberListing(map, { number: Number(m[2]), name: decodeHtml(m[1]) });
  }
  for (const m of html.matchAll(
    /(?:game(?:\s*(?:no\.?|number|#))?|#)\s*[:.]?\s*(\d{3,4})[\s\S]{0,180}?\$(\d{1,2})\b/gi,
  )) {
    rememberListing(map, { number: Number(m[1]), price: Number(m[2]) });
  }
  for (const m of html.matchAll(
    /\$(\d{1,2})\b[\s\S]{0,180}?(?:game(?:\s*(?:no\.?|number|#))?|#)\s*[:.]?\s*(\d{3,4})/gi,
  )) {
    rememberListing(map, { number: Number(m[2]), price: Number(m[1]) });
  }
  for (const m of html.matchAll(
    /(?:game(?:\s*(?:no\.?|number|#))?|#)\s*[:.]?\s*(\d{3,4})[\s\S]{0,240}?Top Prize:\s*(?:<\/[^>]+>\s*)*\$?([\d,]+)/gi,
  )) {
    rememberListing(map, { number: Number(m[1]), top: money(m[2]) });
  }

  const chunks = html.split(/class="box cloudfx databox price_/i).slice(1);
  for (const chunk of chunks) {
    const price = Number(chunk.match(/^(\d+)/)?.[1]);
    const number = Number(chunk.match(/Game Number:<\/b>\s*(\d+)/i)?.[1]);
    const name = decodeHtml(chunk.match(/class="gamename"><a[^>]*>([^<]+)</i)?.[1] || "");
    const top = cashPrizeAmount(chunk.match(/Top Prize:[\s\S]{0,80}?(\$[\d,]+)/i)?.[1] || "");
    if (number) rememberListing(map, { number, name, price, top });
  }

  return [...map.values()].filter((g) => g.number > 0);
}

export function parseNewGames(
  stateId: StateId,
  body: string,
  contentType = "",
): ParsedGame[] {
  const fromRemaining = parseOfficialRemaining(stateId, body, contentType).map((g) => ({
    ...g,
    prizes: g.prizes.map((p) => ({ amount: p.amount, remaining: null })),
  }));
  const fromList = parseNewGameListings(body);
  const map = new Map<number, ParsedGame>();
  for (const row of [...fromRemaining, ...fromList]) {
    if (!row.number || isImportedJunkGame(row)) continue;
    const prev = map.get(row.number);
    if (!prev) {
      map.set(row.number, row);
      continue;
    }
    map.set(row.number, {
      number: row.number,
      name: prev.name || row.name,
      price: DESK_PRICES.has(prev.price) ? prev.price : row.price,
      prizes: prev.prizes.length ? prev.prizes : row.prizes,
      odds: prev.odds ?? row.odds,
    });
  }
  return [...map.values()];
}

/**
 * Merge official new-game listings into a remaining catalog.
 * Only add missing $5+ games. Never invent remaining. Never add $1 because $3 appeared.
 * Do not stamp the whole remaining table as NEW if the listing page is the full book.
 */
export function mergeNewGameListings(
  catalog: Game[],
  listed: ParsedGame[],
  stateId: StateId,
): Game[] {
  const known = trustedCatalog(catalog).map((game) => ({ ...game, stateId }));
  const have = new Set(known.map((g) => g.number));
  const source: GameSource = stateId === "tn" ? "tn-remaining" : "official-remaining";
  const extras: Game[] = [];
  for (const row of listed) {
    if (have.has(row.number) || isImportedJunkGame(row)) continue;
    if (!DESK_PRICES.has(row.price)) continue;
    const stripped: ParsedGame = {
      ...row,
      prizes: row.prizes.map((p) => ({ amount: p.amount, remaining: null })),
    };
    if (!stripped.prizes.length) continue;
    const added = toCatalog([stripped], source);
    if (added[0]) extras.push({ ...added[0], stateId, fresh: true });
  }
  return trustedCatalog([...known, ...extras]);
}
