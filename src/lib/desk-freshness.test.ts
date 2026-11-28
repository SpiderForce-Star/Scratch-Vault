import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  POST_CADENCE,
  PUBLIC_STATE_IDS,
  canonicalPublicStateId,
  parsePublicStateId,
  stateIdFromSearchString,
} from "@/config/states";
import { BUNDLED_DESK_AS_OF, bundledDeskAsOf } from "@/data/desk-as-of";
import { DESK_META } from "@/data/desk-meta";
import { freshPublicStateIds } from "@/lib/desk-coverage";
import {
  deskFreshnessLabel,
  formatDeskAsOf,
  isDeskDataStale,
} from "@/lib/desk-freshness";
import { deskStampFor, snapshotIsStale } from "@/lib/desk-stamp";

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

  it("uses the active state's live snapshot, not another desk's date", () => {
    const live = "2026-11-27T11:15:18Z";
    const ky = deskStampFor({
      stateId: "ky",
      fetchedAt: live,
      now: REVIEW_NOW,
      locale: "en-US",
    });
    const sc = deskStampFor({
      stateId: "sc",
      fetchedAt: "2026-11-27T11:20:00Z",
      now: REVIEW_NOW,
      locale: "en-US",
    });
    expect(ky.stale).toBe(false);
    expect(ky.short).toBe("KY");
    expect(ky.name).toBe("Kentucky");
    expect(ky.when).toMatch(/Nov 27, 2026/);
    expect(ky.when).not.toMatch(/Aug 28/);
    expect(ky.when).not.toMatch(/Sep 3/);
    expect(ky.asOfIso).toBe(new Date(live).toISOString());
    expect(ky.asOfIso).not.toBe(bundledDeskAsOf("ok"));
    expect(ky.asOfIso).not.toBe(bundledDeskAsOf("tn"));
    expect(ky.asOfIso).not.toBe(BUNDLED_DESK_AS_OF.ky);
    expect(sc.short).toBe("SC");
    expect(sc.stale).toBe(false);
    expect(sc.asOfIso).not.toBe(ky.asOfIso);
    expect(sc.when).not.toMatch(/Aug 28/);
  });

  it("marks an old list stale even when the stored flag is false", () => {
    const old = [
      ["ok", "2026-08-28T11:14:33.628Z"],
      ["mi", "2026-08-15T03:52:00-04:00"],
      ["oh", "2026-08-21T06:00:00-04:00"],
      ["tn", "2026-09-03T12:00:00-05:00"],
    ] as const;
    for (const [id, fetchedAt] of old) {
      expect(
        snapshotIsStale({ stateId: id, fetchedAt, storedStale: false, now: REVIEW_NOW }),
        id,
      ).toBe(true);
      const stamp = deskStampFor({
        stateId: id,
        fetchedAt,
        now: REVIEW_NOW,
        locale: "en-US",
      });
      expect(stamp.stale, id).toBe(true);
      expect(stamp.short, id).toBe(id.toUpperCase());
    }
    expect(
      snapshotIsStale({
        stateId: "ky",
        fetchedAt: "2026-11-27T11:15:18Z",
        storedStale: false,
        now: REVIEW_NOW,
      }),
    ).toBe(false);
  });

  it("counts live snapshots inside the cadence window and skips old ones", () => {
    const fresh = "2026-11-27T11:15:18Z";
    const stamps = {
      tn: "2026-09-03T17:00:00.000Z",
      ky: fresh,
      sc: fresh,
      ok: "2026-08-28T11:14:33.628Z",
      nc: fresh,
      pa: fresh,
      tx: fresh,
      mo: fresh,
      ia: fresh,
      id: fresh,
      mi: "2026-08-15T07:52:00.000Z",
      oh: "2026-08-21T10:00:00.000Z",
    };
    expect(freshPublicStateIds(REVIEW_NOW, stamps)).toEqual([
      "ky",
      "sc",
      "nc",
      "pa",
      "tx",
      "mo",
      "ia",
      "id",
    ]);
    expect(
      freshPublicStateIds(REVIEW_NOW, { ...stamps, tn: "2026-11-25T12:00:00Z" }),
    ).toEqual(["tn", "ky", "sc", "nc", "pa", "tx", "mo", "ia", "id"]);
  });

  it("accepts KY and ky, and still sends unknown codes to Tennessee", () => {
    expect(canonicalPublicStateId("KY")).toBe("ky");
    expect(canonicalPublicStateId("ky")).toBe("ky");
    expect(canonicalPublicStateId(" KY ")).toBe("ky");
    expect(canonicalPublicStateId("AZ")).toBeNull();
    expect(canonicalPublicStateId("ZZ")).toBeNull();
    expect(parsePublicStateId("KY")).toBe("ky");
    expect(parsePublicStateId("nope")).toBe("tn");
    expect(stateIdFromSearchString("?state=KY")).toBe("ky");
    expect(stateIdFromSearchString("?state=ky")).toBe("ky");
    expect(stateIdFromSearchString("?state=zz")).toBe("tn");
    expect(stateIdFromSearchString("")).toBe("tn");
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
