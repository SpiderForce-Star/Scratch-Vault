import assert from "node:assert/strict";
import test from "node:test";
import { markdownTableToHtml, tnReportDate } from "./external/push-remaining.mts";
import { parseTnTable } from "../src/data/states/parse.server.ts";

const MD = `| Game Number | Game Name | Prizes | Remaining Prizes | PL 2 | RP 2 | PL 3 | RP 3 | Game End Date |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${Array.from({ length: 5 }, (_, i) => `| ${1400 + i} | Game ${i} | $500 | 9 | $100 | 8 | $50 | 7 | 11/27/2026 |`).join("\n")}`;

test("markdown TN table round-trips through the site's TN parser", () => {
  const html = markdownTableToHtml(MD);
  const rows = parseTnTable(html);
  assert.equal(rows.length, 5);
  assert.deepEqual(rows[0].prizes.map((p) => [p.amount, p.remaining]), [[500, 9], [100, 8], [50, 7]]);
  assert.equal(tnReportDate(html), "2026-11-27T18:00:00.000Z");
});
