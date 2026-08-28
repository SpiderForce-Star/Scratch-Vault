import {
  DEFAULT_STATE_ID,
  getState,
  heatContextFor,
  type DataMode,
  type StateConfig,
  type StateId,
} from "@/config/states";
import { loadDeskCatalog, type LoadedDesk } from "@/data/states/load.server";
import {
  buildDesk,
  cashBlips,
  catalogHeat,
  guestFacingGame,
  pickTonightHeat,
  publicGame,
  redactHeatReport,
  redactTonightCard,
  scoreGame,
  scoreGamePublic,
} from "./heat.server";
import type { DeskPick, DeskReview, HeatReport, TonightCard } from "./heat";
import type { DeskSnapshot } from "./desk";
import { accessFromRow, loadUserBilling } from "./subscription.server";

function reportRecord(reports: Map<number, HeatReport>): Record<string, HeatReport> {
  return Object.fromEntries([...reports.entries()].map(([k, v]) => [String(k), v]));
}

function honestDataMode(state: StateConfig, loaded: LoadedDesk): DataMode {
  if (!loaded.games.length) return "compiled";
  return state.dataMode;
}

function emptyTonight(): { cards: TonightCard[]; depleted: boolean } {
  return { cards: [], depleted: true };
}

function guestWhy(heat: HeatReport): string {
  if (heat.bust || heat.band === "bust") {
    return "Public heat flags this ticket as a skip";
  }
  if (heat.band === "hot") return "Public heat is hot on this price";
  if (heat.band === "warm") return "Public heat is warm on this price";
  return "Public heat only — remaining counts require Full Access";
}

function redactPick(pick: DeskPick): DeskPick {
  return {
    ...pick,
    game: guestFacingGame(pick.game),
    heat: redactHeatReport(pick.heat),
    why: guestWhy(pick.heat),
  };
}

function guestDesk(desk: DeskReview): DeskReview {
  return {
    ...desk,
    byPrice: desk.byPrice.map((row) =>
      row.pick ? { ...row, pick: redactPick(row.pick) } : row,
    ),
    mediumLeaders: [],
    official: [],
    avoid: desk.avoid.slice(0, 3).map((row) => ({
      ...row,
      game: guestFacingGame(row.game),
      heat: redactHeatReport(row.heat),
      why: "Skip reasons that use remaining counts require Full Access",
    })),
  };
}

function guestReports(reports: Map<number, HeatReport>): Map<number, HeatReport> {
  return new Map([...reports.entries()].map(([k, v]) => [k, redactHeatReport(v)]));
}

async function subscriberIsPaid(userId: string | null): Promise<boolean> {
  if (!userId) return false;

  const row = await loadUserBilling(userId);
  if (accessFromRow(row, null).paid) return true;

  return hasRevenueCatEntitlement(userId);
}

async function hasRevenueCatEntitlement(userId: string): Promise<boolean> {
  const secret = process.env.REVENUECAT_SECRET_API_KEY?.trim();
  if (!secret) return false;
  try {
    const res = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
      {
        headers: {
          Authorization: `Bearer ${secret}`,
          Accept: "application/json",
        },
      },
    );
    if (!res.ok) return false;
    const json = (await res.json()) as {
      subscriber?: {
        entitlements?: Record<string, { expires_date?: string | null }>;
      };
    };
    const ent = json.subscriber?.entitlements?.vsv_full_access;
    if (!ent) return false;
    if (!ent.expires_date) return true;
    const exp = Date.parse(ent.expires_date);
    return Number.isFinite(exp) && exp > Date.now();
  } catch {
    return false;
  }
}

export async function buildDeskSnapshot(
  userId: string | null,
  _email: string | null,
  stateId: StateId = DEFAULT_STATE_ID,
): Promise<DeskSnapshot> {
  const paid = await subscriberIsPaid(userId);
  const state = getState(stateId);
  const ctx = heatContextFor(state);
  const loaded = await loadDeskCatalog(state.id);
  const games = loaded.games;
  const weekLabel = loaded.weekLabel || state.weekLabel;
  const dataMode = honestDataMode(state, loaded);

  if (paid) {
    const reports = new Map(games.map((game) => [game.number, scoreGame(game, ctx)]));
    const tonight = games.length ? pickTonightHeat(games, reports) : emptyTonight();
    return {
      paid: true,
      stateId: state.id,
      weekLabel,
      dataMode,
      holdback: ctx,
      gameCount: games.length,
      games,
      reports: reportRecord(reports),
      desk: buildDesk(games, reports, ctx),
      blips: cashBlips(games, 12),
      stats: catalogHeat(games, (game) => scoreGame(game, ctx)),
      loadError: loaded.error,
      stale: loaded.stale,
      fetchedAt: loaded.fetchedAt,
      tonight: tonight.cards,
      tonightDepleted: tonight.depleted,
    };
  }

  const scoredGames = games.map(publicGame);
  const scoredReports = new Map(
    scoredGames.map((game) => [game.number, scoreGamePublic(game, ctx)]),
  );
  const desk = buildDesk(scoredGames, scoredReports, ctx);
  const tonight = games.length
    ? pickTonightHeat(scoredGames, scoredReports)
    : emptyTonight();

  return {
    paid: false,
    stateId: state.id,
    weekLabel,
    dataMode,
    holdback: ctx,
    gameCount: games.length,
    games: games.map(guestFacingGame),
    reports: reportRecord(guestReports(scoredReports)),
    desk: guestDesk(desk),
    blips: cashBlips(scoredGames, 12).map((blip) => ({ ...blip, remaining: null })),
    stats: catalogHeat(scoredGames, (game) => scoreGamePublic(game, ctx)),
    loadError: loaded.error,
    stale: loaded.stale,
    fetchedAt: loaded.fetchedAt,
    tonight: tonight.cards.map(redactTonightCard),
    tonightDepleted: tonight.depleted,
  };
}
