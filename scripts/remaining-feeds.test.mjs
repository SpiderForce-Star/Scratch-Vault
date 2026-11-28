import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  listOkScratchers,
  parseCtCatalog,
  parseMaApi,
  parseMiEmbedded,
  parseOfficialRemaining,
  parseOhApi,
  parseOkGamePage,
  parseTnTable,
} from "../src/data/states/parse.server.ts";
import {
  DAILY_STALE_MS,
  WEEKLY_BUFFER_MS,
  WEEKLY_CADENCE_MS,
  deskFreshnessLabel,
  formatDeskAsOf,
  isAlertDesk,
  isDeskDataStale,
  staleAfterMs,
} from "../src/lib/desk-freshness.ts";

const TN_TABLE = `<table><thead><tr>
<th>Game Number</th><th>Game Name</th><th>Prizes</th><th>Remaining Prizes</th>
<th>PL 2</th><th>RP 2</th><th>PL 3</th><th>RP 3</th>
</tr></thead><tbody>
<tr><td>1996</td><td>Giant Jumbo Bucks</td><td>$150,000</td><td>3</td><td>$5,000</td><td>3</td><td>$1,000</td><td>236</td></tr>
</tbody></table>`;

test("Tennessee remaining-prizes table keeps the top three published tiers", () => {
  const rows = parseTnTable(TN_TABLE);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].number, 1996);
  assert.deepEqual(
    rows[0].prizes.map((p) => [p.amount, p.remaining]),
    [
      [150000, 3],
      [5000, 3],
      [1000, 236],
    ],
  );
  assert.equal(parseOfficialRemaining("tn", TN_TABLE, "text/html").length, 1);
});

test("Michigan embedded prize graph reads price in dollars", () => {
  const html = `self.__next_f.push([1,"{\\"games\\":[{\\"igtId\\":480,\\"gameType\\":\\"INSTANT\\",\\"prizeTiers\\":[{\\"prizeAmountCents\\":200000000,\\"remainingCount\\":1}],\\"game\\":{\\"name\\":\\"Diamonds & Gold\\",\\"ticketPriceRange\\":{\\"min\\":{\\"cents\\":\\"2000\\"}}}}]}"]);`;
  const rows = parseMiEmbedded(html);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].price, 20);
  assert.equal(rows[0].prizes[0].amount, 2000000);
  assert.equal(rows[0].prizes[0].remaining, 1);
});

test("Ohio and Massachusetts JSON feeds parse game numbers", () => {
  const oh = parseOhApi({
    data: [
      {
        gameCode: "1007",
        gameName: "Cash Plus",
        ticketPrice: 10,
        prizeRemainingValues: [{ prizeValue: 300000, prizesLeft: 2 }],
      },
    ],
  });
  assert.equal(oh[0].number, 1007);
  assert.equal(oh[0].prizes[0].remaining, 2);
  const ma = parseMaApi([
    {
      massGameID: 340,
      gameName: "Fabulous Fortune",
      ticketCost: 10,
      prizeTiers: [{ prizeAmount: 4000000, prizesRemaining: 1, prizeDescription: "$4,000,000" }],
    },
  ]);
  assert.equal(ma[0].number, 340);
  assert.equal(ma[0].prizes[0].amount, 4000000);
});

test("Connecticut catalog and Oklahoma game page parse", () => {
  const catalog = `before [{\\"gameNo\\":1918,\\"gameName\\":\\"$$500,000 CA$HWORD\\",\\"ticketCostRaw\\":30,\\"topPrizeRaw\\":500000,\\"topPrizesRemaining\\":3,\\"status\\":\\"active\\"}] after`;
  const rows = parseCtCatalog(catalog);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name.includes("500,000"), true);
  assert.equal(rows[0].price, 30);
  assert.equal(rows[0].prizes[0].remaining, 3);

  const okHtml = `{\\"gameNumber\\":\\"870\\",\\"prizeDetails\\":[{\\"matches\\":[{\\"prize\\":\\"$$500\\",\\"remainingPrizes\\":4,\\"totalPrizes\\":6},{\\"prize\\":\\"$$10\\",\\"remainingPrizes\\":12,\\"totalPrizes\\":20}]}],\\"title\\":\\"Frozen Frenzy\\",\\"ticketPrice\\":10,\\"odds\\":\\"1 in 2.58\\"}`;
  const game = parseOkGamePage(okHtml);
  assert.ok(game);
  assert.equal(game.number, 870);
  assert.equal(game.price, 10);
  assert.equal(game.prizes.length, 2);
  const index = `{\\"scratchOffs\\":[{\\"gameNumber\\":\\"870\\",\\"slug\\":\\"870-frozen-frenzy\\",\\"ticketPrice\\":10},{\\"gameNumber\\":\\"12\\",\\"slug\\":\\"12-dollar\\",\\"ticketPrice\\":1}]}`;
  const listed = listOkScratchers(index);
  assert.equal(listed.length, 1);
  assert.equal(listed[0].slug, "870-frozen-frenzy");
});

test("public desk failures are the alert set; hidden desks are not", () => {
  const states = readFileSync(new URL("../src/config/states.ts", import.meta.url), "utf8");
  const publicBlock = states.slice(
    states.indexOf("export const PUBLIC_STATE_IDS"),
    states.indexOf("export const HIDDEN_STATE_IDS"),
  );
  const hiddenBlock = states.slice(
    states.indexOf("export const HIDDEN_STATE_IDS"),
    states.indexOf("export const HIDDEN_RETURN_MIN_GAMES"),
  );
  for (const id of publicBlock.matchAll(/"([a-z]{2})"/g)) {
    assert.equal(isAlertDesk(id[1]), true, id[1]);
  }
  for (const id of hiddenBlock.matchAll(/"([a-z]{2})"/g)) {
    assert.equal(isAlertDesk(id[1]), false, id[1]);
  }
});

test("stale labeling uses the as-of time and never says current", () => {
  const now = Date.parse("2026-11-27T18:00:00Z");
  const cases = [
    ["tn", "2026-09-03T12:00:00-05:00", "weekly"],
    ["ok", "2026-08-28T11:14:33.628Z", "daily"],
    ["mi", "2026-08-15T03:52:00-04:00", "daily"],
    ["oh", "2026-08-21T06:00:00-04:00", "daily"],
  ];
  for (const [id, fetchedAt, cadence] of cases) {
    const label = deskFreshnessLabel({ fetchedAt, cadence, now, locale: "en-US" });
    assert.equal(label.stale, true, id);
    assert.match(label.when, /\d{4}/, id);
    assert.match(label.when, /\b(AM|PM)\b/, id);
    assert.match(label.when, /\b(CST|CDT)\b/, id);
    assert.doesNotMatch(label.when, /\bcurrent\b/i, id);
    assert.equal(isDeskDataStale({ fetchedAt, cadence, now }), true, id);
  }
  assert.equal(
    formatDeskAsOf("2026-09-03T12:00:00-05:00", "en-US"),
    "Sep 3, 2026, 12:00 PM CDT",
  );
  assert.equal(
    isDeskDataStale({
      fetchedAt: new Date(now - 30 * 60 * 60 * 1000).toISOString(),
      cadence: "daily",
      now,
    }),
    false,
  );
  assert.equal(
    isDeskDataStale({
      fetchedAt: new Date(now - 40 * 60 * 60 * 1000).toISOString(),
      cadence: "daily",
      now,
    }),
    true,
  );
  assert.equal(
    isDeskDataStale({
      fetchedAt: new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString(),
      cadence: "weekly",
      now,
    }),
    false,
  );
  assert.equal(
    isDeskDataStale({
      fetchedAt: new Date(now - (WEEKLY_CADENCE_MS + WEEKLY_BUFFER_MS + 60 * 60 * 1000)).toISOString(),
      cadence: "weekly",
      now,
    }),
    true,
  );
  assert.equal(isDeskDataStale({ now }), false);
  assert.equal(staleAfterMs("daily"), DAILY_STALE_MS);
  assert.equal(DAILY_STALE_MS, 36 * 60 * 60 * 1000);
});

test("South Carolina report reads the game number from the name, not a count column", async () => {
  const { parseSc } = await import("../src/data/states/parse.server.ts");
  const html = `<table id="prizesremainingReport"><thead><tr><th>Game Name</th><th>Ticket Price</th><th>Start</th><th>Top</th><th>Remaining</th></tr></thead><tbody>
<tr><td>$200,000 Payday &nbsp;(# 1690 )</td><td>$5</td><td>08/04/2026</td><td>$200,000</td><td>1</td></tr>
<tr><td>200X &nbsp;(# 1665 ) No longer available to purchase.</td><td>$20</td><td>01/06/2026</td><td>$2,000,000</td><td>0</td></tr>
</tbody></table>`;
  const rows = parseSc(html);
  assert.deepEqual(rows.map((r) => [r.number, r.name, r.price, r.prizes[0].remaining]), [
    [1690, "$200,000 Payday", 5, 1],
    [1665, "200X", 20, 0],
  ]);
});

test("Missouri scratchers list keys games by #, not by prize amount", async () => {
  const { parseMo } = await import("../src/data/states/parse.server.ts");
  const html = `<div class="scratchers-list__item"><img alt=Gnome for the Holidays>
<div class="scratchers-list__num"> # 572 </div><div class="scratchers-list__title"> <span>GNOME FOR THE HOLIDAYS</span> </div>
<div class="scratchers-list__subtitle">Ticket Price:</div> <div class="scratchers-list__value"> $2 </div>
<table class="scratchers-list__table"><thead><tr><th>Top Prizes</th><th>Total</th><th>Unclaimed</th></tr></thead>
<tbody><tr><td>$25,000</td><td>4</td><td>3</td></tr><tr><td>$500</td><td>248</td><td>193</td></tr></tbody></table></div>`;
  const rows = parseMo(html);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].number, 572);
  assert.equal(rows[0].price, 2);
  assert.deepEqual(rows[0].prizes.map((p) => [p.amount, p.remaining]), [[25000, 3], [500, 193]]);
});
