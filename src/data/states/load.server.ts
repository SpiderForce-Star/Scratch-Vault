/**
 * Server-only remaining-prize loader.
 *
 * desk_snapshots win over the bundled compile. Failed pulls keep last-good.
 * Empty desk if nothing trusted exists. Holdback stays 0 outside Tennessee.
 */
import { fullCatalog as tennesseeFullCatalog } from "@/data/games.full.server";
import type { Game } from "@/data/games";
import {
  DEFAULT_STATE_ID,
  STATE_IDS,
  STATES,
  type StateId,
  getState,
  parseStateId,
} from "@/config/states";
import { publicCatalog } from "./index";
import type { RemainingRow } from "./compile";
import { COMPILED_REMAINING } from "./compiled.remaining.server";
import { readSnapshot, upsertSnapshot } from "./snapshots.server";

export type { RemainingRow };

export type StateCatalogLoader = {
  stateId: StateId;
  loadPublic: () => Game[];
  loadFull: () => Game[];
};

function applyRemaining(games: Game[], remaining: Record<number, RemainingRow>): Game[] {
  return games.map((game) => {
    const row = remaining[game.number];
    if (!row) return game;
    return {
      ...game,
      tiers: game.tiers.map((tier, i) => ({
        ...tier,
        remaining: row[i] ?? null,
      })),
    };
  });
}

export type LoadedDesk = {
  games: Game[];
  error: string | null;
  stale: boolean;
  fetchedAt: string | null;
  weekLabel: string;
};

export function loadBundledDesk(
  stateId: StateId | string | null | undefined,
): LoadedDesk {
  const id = parseStateId(stateId);
  const state = getState(id);

  if (id === "tn") {
    const games = tennesseeFullCatalog().map((game) => ({
      ...game,
      stateId: "tn" as const,
    }));
    if (!games.length) {
      return {
        games: [],
        error: "Tennessee remaining overlay is empty. No placeholder counts are shown.",
        stale: false,
        fetchedAt: null,
        weekLabel: state.weekLabel,
      };
    }
    return {
      games,
      error: null,
      stale: false,
      fetchedAt: null,
      weekLabel: state.weekLabel,
    };
  }

  const remaining = COMPILED_REMAINING[id];
  const base = publicCatalog(id);
  if (!base.length || !remaining || Object.keys(remaining).length === 0) {
    return {
      games: [],
      error: `No official remaining-prize snapshot is available for ${id.toUpperCase()}. No placeholder counts are shown.`,
      stale: false,
      fetchedAt: null,
      weekLabel: state.weekLabel,
    };
  }
  return {
    games: applyRemaining(base, remaining),
    error: null,
    stale: false,
    fetchedAt: null,
    weekLabel: state.weekLabel,
  };
}

/** @deprecated Use loadDeskCatalog for dated snapshots. */
export function loadCompiledDesk(
  stateId: StateId | string | null | undefined,
): LoadedDesk {
  return loadBundledDesk(stateId);
}

export async function seedSnapshotsIfEmpty(): Promise<void> {
  try {
    const now = new Date().toISOString();
    for (const id of STATE_IDS) {
      const existing = await readSnapshot(id);
      if (existing?.catalog?.length) continue;
      const bundled = loadBundledDesk(id);
      if (!bundled.games.length) continue;
      await upsertSnapshot({
        stateId: id,
        ok: true,
        stale: false,
        fetchedAt: now,
        weekLabel: bundled.weekLabel,
        sourceUrl: STATES[id].remainingPrizesUrl,
        reason: "seeded compiled catalog",
        gameCount: bundled.games.length,
        catalog: bundled.games,
      });
    }
  } catch (err) {
    console.error(
      "[remaining] seed failed",
      err instanceof Error ? err.message : "error",
    );
  }
}

export async function loadDeskCatalog(
  stateId: StateId | string | null | undefined,
): Promise<LoadedDesk> {
  const id = parseStateId(stateId);
  const bundled = loadBundledDesk(id);

  try {
    await seedSnapshotsIfEmpty();
    const row = await readSnapshot(id);
    if (row?.catalog && row.catalog.length) {
      return {
        games: row.catalog.map((game) => ({ ...game, stateId: id })),
        error: null,
        stale: row.stale || !row.ok,
        fetchedAt: row.fetchedAt,
        weekLabel: row.weekLabel,
      };
    }
    if (bundled.games.length) {
      return { ...bundled, stale: Boolean(row && !row.ok) };
    }
  } catch (err) {
    console.error(
      "[remaining] snapshot read failed",
      id,
      err instanceof Error ? err.message : "error",
    );
  }

  if (bundled.games.length) {
    return bundled;
  }

  return {
    games: [],
    error:
      bundled.error ??
      `No official remaining-prize snapshot is available for ${id.toUpperCase()}. No placeholder counts are shown.`,
    stale: false,
    fetchedAt: null,
    weekLabel: bundled.weekLabel,
  };
}

export function loadFullCatalog(stateId: StateId | string | null | undefined): Game[] {
  return loadBundledDesk(stateId).games;
}

export function stateCatalogLoader(stateId: StateId): StateCatalogLoader {
  const id = parseStateId(stateId);
  return {
    stateId: id,
    loadPublic: () => publicCatalog(id),
    loadFull: () => loadFullCatalog(id),
  };
}

export function defaultFullCatalog(): Game[] {
  return loadFullCatalog(DEFAULT_STATE_ID);
}
