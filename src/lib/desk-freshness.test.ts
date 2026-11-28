import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { POST_CADENCE, PUBLIC_STATE_IDS } from "@/config/states";
import { BUNDLED_DESK_AS_OF, bundledDeskAsOf } from "@/data/desk-as-of";
import { DESK_META } from "@/data/desk-meta";
import { freshPublicStateIds } from "@/lib/desk-coverage";
import {
  deskFreshnessLabel,
  formatDeskAsOf,
  isDeskDataStale,
} from "@/lib/desk-freshness";

const REVIEW_NOW = Date.parse("2026-11-27T18:00:00Z");

describe("stale date labeling", () => {
  it("formats America/Chicago with a short zone label", () => {
    expect(formatDeskAsOf("2026-09-03T12:00:00-05:00", "en-US")).toBe(
      "Sep 3, 2026, 12:00 PM CDT",
    );
    expect(formatDeskAsOf("2026-08-28T11:14:33.628Z", "en-US")).toMatch(/Aug 28, 2026, .+ CDT$/);
    expect(formatDeskAsOf("2026-01-15T18:00:00Z", "en-US")).toMatch(/CST$/);
  });

  it("does not call the Nov 27 review desks current", () => {
    const desks = [
      ["tn", "2026-09-03T12:00:00-05:00", "weekly"],
      ["ok", "2026-08-28T11:14:33.628Z", "daily"],
      ["mi", "2026-08-15T03:52:00-04:00", "daily"],
      ["oh", "2026-08-21T06:00:00-04:00", "daily"],
    ] as const;
    for (const [id, fetchedAt, cadence] of desks) {
      const label = deskFreshnessLabel({
        fetchedAt,
        cadence,
        now: REVIEW_NOW,
        locale: "en-US",
      });
      expect(label.stale, id).toBe(true);
      expect(label.when, id).toMatch(/\b(AM|PM)\b/);
      expect(label.when, id).toMatch(/\bC[DS]T\b/);
      expect(label.when.toLowerCase(), id).not.toContain("current");
      expect(isDeskDataStale({ fetchedAt, cadence, now: REVIEW_NOW }), id).toBe(true);
    }
  });

  it("uses 36 hours for a daily list and cadence plus buffer for a weekly list", () => {
    const now = REVIEW_NOW;
    expect(
      isDeskDataStale({
        fetchedAt: new Date(now - 30 * 60 * 60 * 1000).toISOString(),
        cadence: "daily",
        now,
      }),
    ).toBe(false);
    expect(
      isDeskDataStale({
        fetchedAt: new Date(now - 40 * 60 * 60 * 1000).toISOString(),
        cadence: "daily",
        now,
      }),
    ).toBe(true);
    expect(
      isDeskDataStale({
        fetchedAt: new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString(),
        cadence: "weekly",
        now,
      }),
    ).toBe(false);
    expect(
      isDeskDataStale({
        fetchedAt: new Date(now - 9 * 24 * 60 * 60 * 1000).toISOString(),
        cadence: "weekly",
        now,
      }),
    ).toBe(true);
  });

  it("counts only public lists still inside the update window", () => {
    expect(POST_CADENCE.tn).toBe("weekly");
    expect(POST_CADENCE.oh).toBe("daily");
    expect(POST_CADENCE.ok).toBe("daily");
    expect(freshPublicStateIds(REVIEW_NOW)).toEqual([]);
    expect(PUBLIC_STATE_IDS).not.toContain("az");
    expect(PUBLIC_STATE_IDS).not.toContain("ct");
    expect(PUBLIC_STATE_IDS).not.toContain("il");
    expect(PUBLIC_STATE_IDS).not.toContain("ma");
  });

  it("keeps bundled as-of times aligned with the committed files", () => {
    expect(bundledDeskAsOf("tn")).toBe(DESK_META.publishedAt);
    expect(BUNDLED_DESK_AS_OF.tn).toBe("2026-09-03T12:00:00-05:00");
    for (const [id, iso] of Object.entries(BUNDLED_DESK_AS_OF)) {
      if (id === "tn") continue;
      const row = JSON.parse(
        readFileSync(new URL(`../data/states/last-good/${id}.json`, import.meta.url), "utf8"),
      ) as { fetchedAt: string };
      expect(row.fetchedAt, id).toBe(iso);
    }
  });
});
