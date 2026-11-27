import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  REFRESH_SCHEDULE,
  VERCEL_REFRESH_SLOTS,
  dueVercelStates,
  maxDeskAgeMs,
} from "../src/config/refresh-schedule.ts";

const IDS = Object.keys(REFRESH_SCHEDULE);

test("every Vercel slot has a matching cron entry", () => {
  const crons = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8")).crons;
  for (const slot of VERCEL_REFRESH_SLOTS) {
    const hh = Number(slot.slice(0, 2));
    const mm = Number(slot.slice(2));
    const hit = crons.find((c) => c.path === `/api/cron/daily-fetch?slot=${slot}`);
    assert.ok(hit, `missing cron for slot ${slot}`);
    assert.equal(hit.schedule, `${mm} ${hh} * * *`);
  }
});

test("each Vercel state runs in exactly one slot a day; Tennessee is external and weekly", () => {
  const now = new Date("2026-11-27T12:00:00Z");
  const seen = VERCEL_REFRESH_SLOTS.flatMap((slot) => dueVercelStates(IDS, slot, now));
  assert.equal(new Set(seen).size, seen.length);
  assert.equal(REFRESH_SCHEDULE.tn.runner, "external");
  assert.equal(REFRESH_SCHEDULE.tn.cadence, "weekly");
  assert.ok(!seen.includes("tn"));
  assert.ok(maxDeskAgeMs("tn") > maxDeskAgeMs("ky"));
});

test("weekly Vercel states only run on their weekday", () => {
  const ids = ["xx"];
  REFRESH_SCHEDULE.xx = { cadence: "weekly", slot: "1115", weekday: 3, runner: "vercel", maxAgeMs: 1, sourceNote: "" };
  try {
    assert.deepEqual(dueVercelStates(ids, "1115", new Date("2026-11-25T11:15:00Z")), ["xx"]); // Wednesday
    assert.deepEqual(dueVercelStates(ids, "1115", new Date("2026-11-26T11:15:00Z")), []);
  } finally {
    delete REFRESH_SCHEDULE.xx;
  }
});
