import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  calendarYmd,
  isEndedGame,
  isEndingSoon,
  parseCalendarDate,
} from "../src/data/ended-games.ts";
import { mergeEndedDates, parseEndedGames } from "../src/data/states/ended.server.ts";
import { pickEndingSoon, buildGamesBoard } from "../src/lib/heat.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("parseCalendarDate keeps TBD and junk off the clock", () => {
  assert.equal(parseCalendarDate("TBD"), null);
  assert.equal(parseCalendarDate("tbd"), null);
  assert.equal(parseCalendarDate("n/a"), null);
  assert.equal(parseCalendarDate(""), null);
  assert.equal(parseCalendarDate("Pending"), null);
  assert.equal(parseCalendarDate("October 31, 2026"), "2026-10-31");
  assert.equal(parseCalendarDate("September 01, 2026"), "2026-09-01");
  assert.equal(parseCalendarDate("Sep 4, 2026"), "2026-09-04");
  assert.equal(parseCalendarDate("9/28/2026 12:00:00 AM"), "2026-09-28");
  assert.equal(parseCalendarDate("06/26/2026"), "2026-06-26");
  assert.equal(parseCalendarDate("07/18/25"), "2025-07-18");
  assert.equal(parseCalendarDate("2026-09-16"), "2026-09-16");
  assert.equal(parseCalendarDate("February 31, 2026"), null);
});

test("ending soon is 0–30 days; past last-day is ended, not soon", () => {
  const today = calendarYmd();
  assert.equal(isYmdLike(today), true);
  const soon = { number: 124, stateId: "ky", endDate: shiftYmd(today, 15) };
  const todayGame = { number: 1, stateId: "tn", endDate: today };
  const far = { number: 555, stateId: "ky", endDate: shiftYmd(today, 31) };
  const past = { number: 892, stateId: "nc", endDate: shiftYmd(today, -1) };
  const missing = { number: 700, stateId: "ia" };
  assert.equal(isEndingSoon(soon), true);
  assert.equal(isEndingSoon(todayGame), true);
  assert.equal(isEndingSoon(far), false);
  assert.equal(isEndingSoon(past), false);
  assert.equal(isEndingSoon(missing), false);
  assert.equal(isEndedGame(past), true);
  assert.equal(isEndedGame(soon), false);
  assert.equal(isEndedGame({ stateId: "ky", number: 107, name: "Merry Multiplier" }), true);
  assert.equal(isEndingSoon({ stateId: "ky", number: 107, endDate: shiftYmd(today, 5) }), false);
});

test("KY TBD is skipped; dated cards stamp last-day and claim-by", () => {
  const html = `
    <div>
      <span>Game End / Last Day to Purchase:&nbsp;</span><b>TBD</b><br />
      <span>Last Date to Claim:&nbsp;</span><b>TBD</b><br />
      <span>Game #:&nbsp;</span><b>848</b><br />
    </div>
    <!-- Each game end -->
    <div>
      <span>Game End / Last Day to Purchase:&nbsp;</span><b>September 30, 2026</b><br />
      <span>Last Date to Claim:&nbsp;</span><b>March 31, 2027</b><br />
      <span>Game #:&nbsp;</span><b>124</b><br />
    </div>
    <!-- Each game end -->
    <div>
      <span>Game End / Last Day to Purchase:&nbsp;</span><b>October 31, 2026</b><br />
      <span>Last Date to Claim:&nbsp;</span><b>April 30, 2027</b><br />
      <span>Game #:&nbsp;</span><b>555</b><br />
    </div>
  `;
  const rows = parseEndedGames("ky", html);
  assert.equal(rows.some((r) => r.number === 848), false);
  const g124 = rows.find((r) => r.number === 124);
  const g555 = rows.find((r) => r.number === 555);
  assert.equal(g124?.endDate, "2026-09-30");
  assert.equal(g124?.lastClaimDate, "2027-03-31");
  assert.equal(g555?.endDate, "2026-10-31");
  assert.equal(g555?.lastClaimDate, "2027-04-30");

  const noComments = parseEndedGames(
    "ky",
    `<span>Game End / Last Day to Purchase:&nbsp;</span><b>TBD</b><br />
     <span>Last Date to Claim:&nbsp;</span><b>TBD</b><br />
     <span>Game #:&nbsp;</span><b>848</b><br />
     <span>Game End / Last Day to Purchase:&nbsp;</span><b>September 30, 2026</b><br />
     <span>Last Date to Claim:&nbsp;</span><b>March 31, 2027</b><br />
     <span>Game #:&nbsp;</span><b>124</b><br />`,
  );
  assert.equal(noComments.some((r) => r.number === 848), false);
  assert.equal(noComments.find((r) => r.number === 124)?.endDate, "2026-09-30");
});

test("TN / NC / TX / PA / ID tables parse; SC with no dates fails closed", () => {
  const tn = parseEndedGames(
    "tn",
    `<table><tr><th>Game Number</th><th>Game Name</th><th>Price</th><th>Game End Date</th><th>Last Date to Claim</th></tr>
     <tr><td>1340</td><td>Supreme Jumbo Bucks</td><td>$20</td><td>06/26/2026</td><td>09/24/2026</td></tr>
     <tr><td>1996</td><td>Giant Jumbo Bucks</td><td>$5</td><td>09/30/2026</td><td>12/29/2026</td></tr></table>`,
  );
  assert.equal(tn.find((r) => r.number === 1996)?.endDate, "2026-09-30");
  assert.equal(tn.find((r) => r.number === 1340)?.lastClaimDate, "2026-09-24");

  const nc = parseEndedGames(
    "nc",
    `<table><tr><th>#</th><th>Game Name</th><th>Launched</th><th>End Date</th><th>Last Day to Claim</th></tr>
     <tr><td>928</td><td>$400,000 Jackpot</td><td>Apr 2, 2024</td><td>Sep 30, 2026</td><td>Dec 29, 2026</td></tr>
     <tr><td>1</td><td>5 Times Lucky</td><td>Jul 1, 2025</td><td>Sep 4, 2026</td><td>Dec 3, 2026</td></tr></table>`,
  );
  assert.equal(nc.find((r) => r.number === 928)?.endDate, "2026-09-30");
  assert.equal(nc.find((r) => r.number === 928)?.lastClaimDate, "2026-12-29");
  assert.equal(nc.find((r) => r.number === 1)?.endDate, "2026-09-04");

  const tx = parseEndedGames(
    "tx",
    `<table><tr><td>Game Name</td><td>Game Number</td><td>Game Call Date</td><td>End of Game Date</td><td>Last Day to Redeem Prizes</td></tr>
     <tr><td>50X The Cash</td><td>2712</td><td>10/04/2026</td><td>11/18/2026</td><td>03/15/2027</td></tr>
     <tr><td>500X</td><td>2589</td><td>08/02/2026</td><td>09/16/2026</td><td>03/15/2027</td></tr></table>`,
  );
  assert.equal(tx.find((r) => r.number === 2589)?.endDate, "2026-09-16");
  assert.equal(tx.find((r) => r.number === 2712)?.lastClaimDate, "2027-03-15");

  const pa = parseEndedGames(
    "pa",
    `<table><tr><th>Game #</th><th>Game Name</th><th>On Sale</th><th>Price</th><th>End Sale</th><th>Last Date to Claim Prize</th></tr>
     <tr><td class="new"><div class="new-tag">NEW</div><span class="new-game">1804</span></td><td>Fat Stacks</td><td>09/2026</td><td>$5</td><td></td><td></td></tr>
     <tr><td>1772</td><td>Find the Leprechaun</td><td>01/2026</td><td>$2</td><td>9/28/2026 12:00:00 AM</td><td>9/28/2027 12:00:00 AM</td></tr></table>`,
  );
  assert.equal(pa.some((r) => r.number === 1804), false);
  assert.equal(pa.find((r) => r.number === 1772)?.endDate, "2026-09-28");
  assert.equal(pa.find((r) => r.number === 1772)?.lastClaimDate, "2027-09-28");

  const ia = parseEndedGames(
    "ia",
    `<table id="Ended"><tr><th colspan="2">Game</th><th>Official Game End Date</th><th>Last Date To Pay Prizes</th></tr>
     <tr><td>#731</td><td>Triple Red 777s</td><td>07/18/25</td><td></td></tr></table>`,
  );
  assert.equal(ia[0]?.number, 731);
  assert.equal(ia[0]?.endDate, "2025-07-18");
  assert.equal(ia[0]?.lastClaimDate, undefined);

  const id = parseEndedGames(
    "id",
    `<table><tr><th>Number</th><th>Game Name</th><th>Official Game End</th><th>Last Day to Claim</th></tr>
     <tr><td>1913</td><td>BBQ Bucks</td><td>September 01, 2026</td><td>February 28, 2027</td></tr></table>`,
  );
  assert.equal(id[0]?.number, 1913);
  assert.equal(id[0]?.endDate, "2026-09-01");
  assert.equal(id[0]?.lastClaimDate, "2027-02-28");

  assert.deepEqual(parseEndedGames("sc", "<html><p>Instant games</p></html>"), []);
  assert.deepEqual(parseEndedGames("ok", "<html></html>"), []);
  assert.deepEqual(parseEndedGames("mo", ""), []);
});

test("mergeEndedDates stamps dates and never invents remaining", () => {
  const catalog = [
    {
      number: 124,
      name: "Jefferson",
      price: 5,
      topPrize: 25000,
      odds: 4.71,
      source: "official-remaining",
      theme: "cash",
      stateId: "ky",
      tiers: [{ amount: 25000, remaining: 3 }],
    },
    {
      number: 848,
      name: "Wild 20X",
      price: 20,
      topPrize: 1000000,
      odds: 3.1,
      source: "official-remaining",
      theme: "high",
      stateId: "ky",
      tiers: [{ amount: 1000000, remaining: 2 }],
    },
  ];
  const merged = mergeEndedDates(catalog, [
    { number: 124, endDate: "2026-09-30", lastClaimDate: "2027-03-31" },
    { number: 9999, endDate: "2026-09-20" },
  ]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].endDate, "2026-09-30");
  assert.equal(merged[0].lastClaimDate, "2027-03-31");
  assert.equal(merged[0].tiers[0].remaining, 3);
  assert.equal(merged[0].price, 5);
  assert.equal(merged[0].odds, 4.71);
  assert.equal(merged[1].price, 20);
  assert.equal(merged[1].odds, 3.1);
  assert.equal(merged[1].endDate, undefined);
  assert.equal(merged[1].tiers[0].remaining, 2);
  assert.equal(merged.some((g) => g.number === 9999), false);
});

test("ending-soon board lists dated $5+ games and skips already-ended", () => {
  const today = calendarYmd();
  const games = [
    game(848, 5, shiftYmd(today, 7)),
    game(153, 2, shiftYmd(today, 7)),
    game(841, 10, shiftYmd(today, -2)),
    game(980, 20, shiftYmd(today, 40)),
    game(113, 5, null),
  ];
  const reports = new Map(
    games.map((g) => [
      g.number,
      {
        grand: 50,
        medium: 40,
        vault: 50,
        band: "warm",
        bust: false,
        mediumKnown: true,
        role: "jackpot",
        topRemaining: 2,
        effectiveTop: 2,
        midRemaining: 10,
        lowRemaining: 20,
      },
    ]),
  );
  const soon = pickEndingSoon(games);
  assert.deepEqual(
    soon.map((g) => g.number),
    [848],
  );
  const board = buildGamesBoard(games, reports, "all");
  assert.deepEqual(
    board.endingSoon.map((g) => g.number),
    [848],
  );
  assert.equal(board.hot.some((g) => g.number === 841), false);
  assert.equal(board.warm.some((g) => g.number === 841), false);
  assert.equal(board.warm.some((g) => g.number === 848), true);
});

test("copy lockstep and fetch archive the current snapshot", () => {
  const en = JSON.parse(readFileSync(join(root, "src/locales/en.json"), "utf8"));
  const es = JSON.parse(readFileSync(join(root, "src/locales/es.json"), "utf8"));
  assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
  assert.equal(en["games.endingTitle"], "Last day to buy is coming up.");
  assert.equal(en["card.endingSoon"], "Ending soon");
  assert.doesNotMatch(en["games.endingHint"], /odds change|expected value|\bEV\b/i);
  const fetch = readFileSync(join(root, "src/data/states/fetch.server.ts"), "utf8");
  const upsertAt = fetch.indexOf("await upsertSnapshot");
  const archiveAt = fetch.lastIndexOf("await archiveSnapshot");
  assert.ok(upsertAt > 0 && archiveAt > upsertAt, "current catalog is archived after upsert");
  const migration = readFileSync(join(root, "migrations/0007_snapshot_history.sql"), "utf8");
  assert.match(migration, /remaining_snapshot_state_fetched_uidx/);
  const lastGoodDir = join(root, "src/data/states/last-good");
  for (const id of ["tn", "ky", "sc", "ok", "nc", "pa", "tx", "mo", "ia", "id"]) {
    const path = join(lastGoodDir, `${id}.json`);
    let json;
    try {
      json = readFileSync(path, "utf8");
    } catch {
      continue;
    }
    assert.doesNotMatch(json, /"endDate"/);
    assert.doesNotMatch(json, /"lastClaimDate"/);
  }
});

test("in-memory archive keeps history and does not overwrite the pace prior", () => {
  const snap = readFileSync(join(root, "src/data/states/snapshots.server.ts"), "utf8");
  assert.match(snap, /const historyMemory = new Map/);
  assert.match(snap, /HISTORY_CAP = 90/);
  assert.match(snap, /export async function readSnapshotHistory/);
  assert.match(snap, /ORDER BY fetched_at DESC/);
  const archiveStart = snap.indexOf("export async function archiveSnapshot");
  const priorStart = snap.indexOf("export async function archivePriorSnapshot");
  assert.ok(archiveStart > 0 && priorStart > archiveStart);
  const archiveFn = snap.slice(archiveStart, priorStart);
  assert.match(archiveFn, /rememberHistory/);
  assert.doesNotMatch(archiveFn, /priorMemory/);
  assert.match(snap, /LIMIT 1/);
  const fetch = readFileSync(join(root, "src/data/states/fetch.server.ts"), "utf8");
  const priorAt = fetch.indexOf("await archivePriorSnapshot");
  const upsertAt = fetch.indexOf("await upsertSnapshot");
  const currentAt = fetch.lastIndexOf("await archiveSnapshot");
  assert.ok(priorAt > 0 && upsertAt > priorAt && currentAt > upsertAt);
});

function isYmdLike(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function shiftYmd(ymd, days) {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function game(number, price, endDate) {
  return {
    number,
    name: `Game ${number}`,
    price,
    topPrize: 100000,
    odds: 3.9,
    source: "official-remaining",
    theme: "cash",
    stateId: "ky",
    endDate: endDate ?? undefined,
    tiers: [{ amount: 100000, remaining: 2 }],
  };
}
