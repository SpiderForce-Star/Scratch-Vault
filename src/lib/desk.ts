import { createServerFn } from "@tanstack/react-start";
import { optionalAuthMiddleware } from "./auth/optional";
import type { Game } from "@/data/games";
import type { CashBlip, CatalogHeatStats, DeskReview, HeatContext, HeatReport, TonightCard } from "./heat";
import { EMPTY_RADAR, type RadarScopePayload } from "./radar";
import {
  DEFAULT_STATE_ID,
  type DataMode,
  type StateId,
  parsePublicStateId,
} from "@/config/states";

export type DeskSnapshot = {
  paid: boolean;
  stateId: StateId;
  weekLabel: string;
  dataMode: DataMode;
  holdback: HeatContext;
  gameCount: number;
  games: Game[];
  reports: Record<string, HeatReport>;
  desk: DeskReview;
  blips: CashBlip[];
  stats: CatalogHeatStats;
  loadError: string | null;
  stale: boolean;
  fetchedAt: string | null;
  /** Server clock for the stale check. Frozen so SSR and the client agree. */
  judgedAt: number;
  tonight: TonightCard[];
  tonightDepleted: boolean;
};

export const getDeskSnapshot = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .validator((data: unknown) => {
    if (!data || typeof data !== "object") {
      return { stateId: DEFAULT_STATE_ID };
    }
    return { stateId: parsePublicStateId((data as { stateId?: unknown }).stateId) };
  })
  .handler(async ({ context, data }): Promise<DeskSnapshot> => {
    const { buildDeskSnapshot } = await import("./desk.server");
    return buildDeskSnapshot(context.userId, context.email, data.stateId);
  });

export type DeskCoverage = {
  now: number;
  fetchedAt: Partial<Record<StateId, string>>;
};

/** Live fetchedAt for every public desk, captured once so SSR and the client match. */
export const getDeskCoverage = createServerFn({ method: "GET" }).handler(
  async (): Promise<DeskCoverage> => {
    const { readPublicDeskTimes } = await import("@/data/states/snapshots.server");
    return { now: Date.now(), fetchedAt: await readPublicDeskTimes() };
  },
);

export const getRadarScope = createServerFn({ method: "GET" })
  .validator((data: unknown) => {
    if (!data || typeof data !== "object") {
      return { stateId: DEFAULT_STATE_ID };
    }
    return { stateId: parsePublicStateId((data as { stateId?: unknown }).stateId) };
  })
  .handler(async ({ data }): Promise<RadarScopePayload> => {
    try {
      const { buildRadarScope } = await import("./radar.server");
      return await buildRadarScope(data.stateId);
    } catch {
      return { ...EMPTY_RADAR, stateId: data.stateId };
    }
  });
