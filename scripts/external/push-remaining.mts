#!/usr/bin/env -S node --experimental-strip-types
/**
 * Push an official remaining-prize table that Vercel cannot fetch (Tennessee)
 * to POST /api/ingest/remaining. Tennessee's site blocks servers (Cloudflare),
 * so a person saves the pages in a normal browser once a week and this script
 * sends the parsed rows. Nothing here gets around the site's protection.
 *
 * ── Friday Tennessee steps (about 2 minutes) ──────────────────────────────
 * TN posts its remaining-prizes report weekly (recent reports dated Thu/Fri).
 * Every Friday morning (after ~9 AM CT):
 *
 *  1. In Chrome/Edge/Safari, open https://tnlottery.com/remaining-prizes/
 *     Wait for the table to load. Save it: Ctrl+S (Mac: Cmd+S), format
 *     "Webpage, HTML Only", name it  tn-remaining.html
 *  2. Open https://tnlottery.com/games/instant-games/
 *     Scroll to the bottom so every game card loads. Save it the same way as
 *     tn-instant-games.html   (gives ticket prices for brand-new games; the
 *     remaining table has no price column, so new games are skipped without it)
 *  3. Either send both files to Grok Bot ("push the TN pages"), or run, from a
 *     checkout of this repo with Node 22+:
 *
 *       node --experimental-strip-types --env-file=scratch-vault-ingest.env \
 *         scripts/external/push-remaining.mts --state tn \
 *         --html ~/Downloads/tn-remaining.html \
 *         --listing-html ~/Downloads/tn-instant-games.html
 *
 *     scratch-vault-ingest.env holds REMAINING_INGEST_SECRET (same value as the
 *     Vercel env var) and REMAINING_INGEST_URL. Add --dry-run out.json first to
 *     check the parse without sending.
 *  4. Expect: `200 {"stateId":"tn","ok":true,"gameCount":…}`. The TN desk then
 *     shows that week's date. If you skip a week, the daily cron logs
 *     "[remaining] external desks overdue" after 8 days and the site shows the
 *     stale banner.
 *
 * Options: --as-of YYYY-MM-DD overrides the report date (default: the date TN
 * prints in every row). --md reads a markdown table instead of HTML.
 * Env: REMAINING_INGEST_URL (default https://scratch-vault.com/api/ingest/remaining),
 *      REMAINING_INGEST_SECRET (required unless --dry-run).
 * Lottery HTML is parsed locally; only the parsed rows are sent.
 */
import { readFileSync, writeFileSync } from "node:fs";
import {
  parseNewGameListings,
  parseOfficialRemaining,
  type ParsedGame,
} from "../../src/data/states/parse.server.ts";

const OFFICIAL: Record<string, string> = { tn: "https://tnlottery.com/remaining-prizes/" };

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

/** Markdown pipe table → minimal HTML table the TN parser understands. */
export function markdownTableToHtml(md: string): string {
  const lines = md.split("\n").filter((l) => /^\s*\|/.test(l) && !/^\s*\|\s*-/.test(l));
  const cells = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  const esc = (c: string) => c.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const [head, ...rows] = lines;
  return `<table><thead><tr>${cells(head).map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${cells(r).map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

/** TN prints one report date in the last column of every row; use it when it is unanimous. */
export function tnReportDate(html: string): string | null {
  const dates = [...html.matchAll(/<td[^>]*>\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*<\/td>\s*<\/tr>/gi)];
  if (dates.length < 5) return null;
  const set = new Set(dates.map((m) => m.slice(1).join("/")));
  if (set.size !== 1) return null;
  const [m, d, y] = dates[0].slice(1);
  return new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T12:00:00-06:00`).toISOString();
}

async function main() {
  const state = arg("state") || "tn";
  const htmlFile = arg("html");
  const mdFile = arg("md");
  if (!htmlFile && !mdFile) throw new Error("--html or --md required");
  const html = htmlFile ? readFileSync(htmlFile, "utf8") : markdownTableToHtml(readFileSync(mdFile!, "utf8"));
  const games: ParsedGame[] = parseOfficialRemaining(state as never, html, "text/html");
  if (games.length < 3) throw new Error(`only ${games.length} games parsed — refusing to push`);
  const listingFile = arg("listing-html");
  if (listingFile) {
    const prices = new Map(
      parseNewGameListings(readFileSync(listingFile, "utf8"))
        .filter((g) => g.price > 0)
        .map((g) => [g.number, g.price]),
    );
    for (const g of games) if (!g.price && prices.has(g.number)) g.price = prices.get(g.number)!;
  }
  const asOfArg = arg("as-of");
  const asOf = asOfArg
    ? new Date(`${asOfArg}T12:00:00-06:00`).toISOString()
    : state === "tn"
      ? tnReportDate(html)
      : null;
  const payload = {
    stateId: state,
    sourceUrl: OFFICIAL[state] ?? arg("source-url"),
    ...(asOf ? { asOf } : {}),
    games,
  };
  const dry = arg("dry-run");
  if (dry) {
    writeFileSync(dry, `${JSON.stringify(payload, null, 1)}\n`);
    console.log(`dry run: ${games.length} games, asOf ${asOf ?? "n/a"} → ${dry}`);
    return;
  }
  const secret = process.env.REMAINING_INGEST_SECRET?.trim();
  if (!secret) throw new Error("REMAINING_INGEST_SECRET is not set");
  const url = process.env.REMAINING_INGEST_URL || "https://scratch-vault.com/api/ingest/remaining";
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  console.log(res.status, text.slice(0, 500));
  if (!res.ok) process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
