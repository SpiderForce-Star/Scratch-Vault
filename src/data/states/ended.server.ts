/**
 * Official last-day / last-claim parsers. Server-only.
 * Dates are published YYYY-MM-DD or null — never invented, never TBD.
 */
import type { Game } from "../games";
import type { StateId } from "../../config/states";
import { parseCalendarDate } from "../ended-games.ts";

export type EndedDateRow = {
  number: number;
  endDate?: string;
  lastClaimDate?: string;
};

function strip(s: string): string {
  return String(s)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function yearSafe(n: number): number | null {
  if (!Number.isFinite(n) || n < 1 || n > 9999) return null;
  if (n >= 2020 && n <= 2040) return null;
  return n;
}

function gameNumber(cell: string): number | null {
  const t = strip(cell);
  if (!t) return null;
  if (parseCalendarDate(t)) return null;
  if (/^\d{1,2}\/\d{4}$/.test(t) || /^\$/.test(t)) return null;
  const hash = t.match(/^#\s*(\d{1,4})\b/);
  if (hash) return yearSafe(Number(hash[1]));
  const only = t.match(/^(\d{1,4})$/);
  if (only) return yearSafe(Number(only[1]));
  const labeled = t.match(/\b(?:game\s*(?:no\.?|number|#)?|#)\s*[:.]?\s*(\d{1,4})\b/i);
  if (labeled) return yearSafe(Number(labeled[1]));
  const leading = t.match(/^#?\s*(\d{1,4})\b/);
  if (leading) return yearSafe(Number(leading[1]));
  const tagged = t.match(/\bnew\s+(\d{1,4})\b/i);
  if (tagged) return yearSafe(Number(tagged[1]));
  return null;
}

/** Expand colspan so IA's `<th colspan="2">Game</th>` lines up with # / name cells. */
function rowCells(tr: string): string[] {
  const out: string[] = [];
  for (const m of tr.matchAll(/<t[hd]\b([^>]*)>([\s\S]*?)<\/t[hd]>/gi)) {
    const raw = Number(/colspan\s*=\s*["']?(\d+)/i.exec(m[1] ?? "")?.[1] ?? 1);
    const span = Number.isFinite(raw) && raw > 0 ? Math.min(8, raw) : 1;
    for (let i = 0; i < span; i++) out.push(m[2]);
  }
  return out;
}

function pushRow(map: Map<number, EndedDateRow>, number: number, endRaw?: string, claimRaw?: string) {
  if (!number || number > 9999) return;
  const endDate = parseCalendarDate(endRaw);
  const lastClaimDate = parseCalendarDate(claimRaw);
  if (!endDate && !lastClaimDate) return;
  const prev = map.get(number) ?? { number };
  map.set(number, {
    number,
    endDate: endDate ?? prev.endDate,
    lastClaimDate: lastClaimDate ?? prev.lastClaimDate,
  });
}

function headerKind(cell: string): "number" | "end" | "claim" | "other" {
  const t = strip(cell).toLowerCase();
  if (!t) return "other";
  if (/(claim|redeem|last date to pay|last day to pay)/i.test(t)) return "claim";
  if (
    /(end of game|game end|end date|end sale|end of sale|last day to (buy|purchase)|official game end|close date|closing)/i.test(
      t,
    )
  ) {
    return "end";
  }
  if (/^(#|no\.?|number|game|game #|game no\.?|game number)$/i.test(t)) return "number";
  if (/game\s*(#|no|number)/i.test(t) && !/name/i.test(t)) return "number";
  return "other";
}

function parseHtmlTables(html: string): EndedDateRow[] {
  const map = new Map<number, EndedDateRow>();
  const tables = html.match(/<table\b[\s\S]*?<\/table>/gi) ?? [];
  for (const table of tables) {
    const trs = table.match(/<tr\b[\s\S]*?<\/tr>/gi) ?? [];
    let numberCol = -1;
    let endCol = -1;
    let claimCol = -1;
    let nameCol = -1;
    for (const tr of trs) {
      const cells = rowCells(tr);
      if (!cells.length) continue;
      const kinds = cells.map(headerKind);
      const looksHeader =
        kinds.includes("number") || kinds.includes("end") || kinds.includes("claim");
      if (looksHeader && (numberCol < 0 || endCol < 0)) {
        numberCol = kinds.indexOf("number");
        endCol = kinds.indexOf("end");
        claimCol = kinds.indexOf("claim");
        nameCol = cells.findIndex((c) => /name/i.test(strip(c)));
        continue;
      }
      if (endCol < 0 && claimCol < 0) continue;
      let number =
        numberCol >= 0 ? gameNumber(cells[numberCol] ?? "") : null;
      if (!number && nameCol >= 0) number = gameNumber(cells[nameCol] ?? "");
      if (!number) {
        for (const cell of cells) {
          number = gameNumber(cell);
          if (number) break;
        }
      }
      if (!number) continue;
      pushRow(
        map,
        number,
        endCol >= 0 ? cells[endCol] : undefined,
        claimCol >= 0 ? cells[claimCol] : undefined,
      );
    }
  }
  return [...map.values()];
}

/** Kentucky available-games cards. Skip TBD. Match each card; do not take the first date only. */
function parseKyAvailable(html: string): EndedDateRow[] {
  const map = new Map<number, EndedDateRow>();
  const card =
    /Last Day to Purchase:[\s\S]{0,160}?<b>\s*([^<]+?)\s*<\/b>[\s\S]{0,240}?Last Date to Claim:[\s\S]{0,160}?<b>\s*([^<]+?)\s*<\/b>[\s\S]{0,700}?Game\s*#:[\s\S]{0,80}?<b>\s*(\d{1,4})\s*<\/b>/gi;
  for (const m of html.matchAll(card)) {
    pushRow(map, Number(m[3]), m[1], m[2]);
  }
  if (map.size) return [...map.values()];
  const chunks = html.split(/Each game end/i);
  const blocks = chunks.length > 1 ? chunks : [html];
  for (const chunk of blocks) {
    const number = Number(
      chunk.match(/Game\s*#:[\s\S]{0,80}?<b>\s*(\d{1,4})\s*<\/b>/i)?.[1] ??
        chunk.match(/Game\s*#:\s*(\d{1,4})/i)?.[1] ??
        0,
    );
    const endRaw = chunk.match(
      /Last Day to Purchase:[\s\S]{0,80}?<b>\s*([^<]+?)\s*<\/b>/i,
    )?.[1];
    const claimRaw = chunk.match(
      /Last Date to Claim:[\s\S]{0,80}?<b>\s*([^<]+?)\s*<\/b>/i,
    )?.[1];
    if (number) pushRow(map, number, endRaw, claimRaw);
  }
  return [...map.values()];
}

/** PA print / card pages: "Sales Ending Soon 9/28/2026" near a game number. */
function parsePaSalesEnding(html: string): EndedDateRow[] {
  const map = new Map<number, EndedDateRow>();
  for (const m of html.matchAll(
    /(\d{3,4})[\s\S]{0,240}?Sales Ending Soon\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/gi,
  )) {
    pushRow(map, Number(m[1]), m[2]);
  }
  for (const m of html.matchAll(
    /Sales Ending Soon\s+(\d{1,2}\/\d{1,2}\/\d{2,4})[\s\S]{0,240}?(\d{3,4})/gi,
  )) {
    pushRow(map, Number(m[2]), m[1]);
  }
  return [...map.values()];
}

function parseLabeledBlocks(html: string): EndedDateRow[] {
  const map = new Map<number, EndedDateRow>();
  for (const m of html.matchAll(
    /(?:game(?:\s*(?:no\.?|number|#))?|#)\s*[:.]?\s*(\d{2,4})[\s\S]{0,400}?(?:last day to (?:buy|purchase)|game end|end of game|end date|end sale)[\s\S]{0,80}?([A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}|20\d{2}-\d{2}-\d{2})/gi,
  )) {
    pushRow(map, Number(m[1]), m[2]);
  }
  return [...map.values()];
}

export function parseEndedGames(
  stateId: StateId,
  body: string,
  _contentType = "",
): EndedDateRow[] {
  if (!body?.trim()) return [];
  const map = new Map<number, EndedDateRow>();

  const add = (rows: EndedDateRow[]) => {
    for (const row of rows) {
      if (!row.number) continue;
      const prev = map.get(row.number) ?? { number: row.number };
      map.set(row.number, {
        number: row.number,
        endDate: row.endDate ?? prev.endDate,
        lastClaimDate: row.lastClaimDate ?? prev.lastClaimDate,
      });
    }
  };

  if (stateId === "ky") add(parseKyAvailable(body));
  add(parseHtmlTables(body));
  if (stateId === "pa") add(parsePaSalesEnding(body));
  if (!map.size) add(parseLabeledBlocks(body));

  return [...map.values()].filter((row) => row.endDate || row.lastClaimDate);
}

/**
 * Stamp official dates onto a remaining catalog.
 * Never invent remaining, price, or odds. Unknown numbers are ignored.
 */
export function mergeEndedDates(catalog: Game[], rows: EndedDateRow[]): Game[] {
  if (!rows.length) return catalog;
  const byNumber = new Map(rows.map((row) => [row.number, row]));
  return catalog.map((game) => {
    const next = byNumber.get(game.number);
    if (!next) return game;
    return {
      ...game,
      endDate: next.endDate ?? game.endDate,
      lastClaimDate: next.lastClaimDate ?? game.lastClaimDate,
    };
  });
}
