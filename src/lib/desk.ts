import { createServerFn } from "@tanstack/react-start";
import { optionalAuthMiddleware } from "./auth/optional";
import type { Game } from "@/data/games";
import type { CashBlip, DeskReview, HeatContext, HeatReport, TonightCard } from "./heat";
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
  stats: { grand: number; medium: number; busts: number; games: number };
  loadError: string | null;
  stale: boolean;
  fetchedAt: string | null;
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

export const getRadarScope = createServerFn({ method: "GET" }).handler(
  async (): Promise<RadarScopePayload> => {
    try {
      const { buildRadarScope } = await import("./radar.server");
      return await buildRadarScope();
    } catch {
      return EMPTY_RADAR;
    }
  },
);
