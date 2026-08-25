import { money, type Game } from "@/data/games";
import { DEFAULT_STATE_ID, getState, heatContextFor, type StateId } from "@/config/states";
import { loadDeskCatalog } from "@/data/states/load.server";
import {
  buildDesk,
  cashBlips,
  catalogHeat,
  pickTonightHeat,
  publicGame,
  scoreGame,
  scoreGamePublic,
} from "./heat.server";
import type { DeskReview, HeatReport } from "./heat";
import type { DeskSnapshot } from "./desk";
import { accessFromRow, loadUserBilling } from "./subscription.server";

function reportRecord(reports: Map<number, HeatReport>): Record<string, HeatReport> {
  return Object.fromEntries([...reports.entries()].map(([k, v]) => [String(k), v]));
}

function guestWhy(game: Game, heat: HeatReport): string {
  if (heat.bust || (heat.role === "jackpot" && heat.effectiveTop === 0)) {
    return "No useful retail top on the posted counts";
  }
  if (heat.role === "cash-out" && heat.topRemaining != null) {
    return `${heat.topRemaining.toLocaleString()} cash prizes still posted`;
  }
  if (heat.effectiveTop != null && heat.topRemaining != null) {
    const pool = heat.topRemaining * game.topPrize;
    return `${heat.effectiveTop} retail top · ${money(pool)} still listed up top`;
  }
  return "Published remaining count is thin";
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

  if (paid) {
    const reports = new Map(games.map((game) => [game.number, scoreGame(game, ctx)]));
    const tonight = pickTonightHeat(games, reports);
    return {
      paid: true,
      stateId: state.id,
      weekLabel,
      dataMode: state.dataMode,
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

  const guestGames = games.map(publicGame);
  const reports = new Map(
    guestGames.map((game) => [game.number, scoreGamePublic(game, ctx)]),
  );
  const desk = buildDesk(guestGames, reports, ctx);

  const guestDesk: DeskReview = {
    ...desk,
    byPrice: desk.byPrice.map((row) =>
      row.pick
        ? {
            ...row,
            pick: {
              ...row.pick,
              why: guestWhy(row.pick.game, row.pick.heat),
            },
          }
        : row,
    ),
    mediumLeaders: [],
    official: [],
    avoid: desk.avoid.slice(0, 3).map((row) => ({
      ...row,
      why: "No useful retail top on the posted counts",
    })),
  };

  const tonight = pickTonightHeat(guestGames, reports);

  return {
    paid: false,
    stateId: state.id,
    weekLabel,
    dataMode: state.dataMode,
    holdback: ctx,
    gameCount: games.length,
    games: guestGames,
    reports: reportRecord(reports),
    desk: guestDesk,
    blips: cashBlips(guestGames, 12).map((blip) => ({ ...blip, remaining: null })),
    stats: catalogHeat(guestGames, (game) => scoreGamePublic(game, ctx)),
    loadError: loaded.error,
    stale: loaded.stale,
    fetchedAt: loaded.fetchedAt,
    tonight: tonight.cards,
    tonightDepleted: tonight.depleted,
  };
}
