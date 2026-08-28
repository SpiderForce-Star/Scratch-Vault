import { fetchAllStates } from "../src/data/states/fetch.server";

const report = await fetchAllStates();
const rows = report.results.map((row) => ({
  state: row.stateId,
  ok: row.ok,
  games: row.gameCount,
  reason: row.reason,
}));
console.log(JSON.stringify({ ranAt: report.ranAt, rows }, null, 2));
