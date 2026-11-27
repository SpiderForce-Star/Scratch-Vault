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
import { isAlertDesk, isDeskDataStale, STALE_DESK_MS } from "../src/lib/desk-freshness.ts";

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

test("a desk older than two days is stale", () => {
  const now = Date.parse("2026-11-27T12:00:00Z");
  assert.equal(
    isDeskDataStale({ fetchedAt: "2026-09-03T12:00:00-05:00", now }),
    true,
  );
  assert.equal(
    isDeskDataStale({ fetchedAt: new Date(now - 60 * 60 * 1000).toISOString(), now }),
    false,
  );
  assert.equal(isDeskDataStale({ now }), false);
  assert.ok(STALE_DESK_MS === 2 * 24 * 60 * 60 * 1000);
});
