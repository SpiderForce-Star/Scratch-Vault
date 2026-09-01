/**
 * Grand-prize radar: published top-tier remaining drops only.
 * Monitor public desks. Never invent counts. Not live store inventory.
 */
import type { Game } from "../data/games";

/** Same list as PUBLIC_STATE_IDS. Hidden AZ MI OH CT IL MA stay off the scope. */
export const RADAR_STATE_IDS = [
  "tn",
  "ky",
  "sc",
  "ok",
  "nc",
  "pa",
  "tx",
  "mo",
  "ia",
  "id",
] as const;

const BLOCKED_DESKS = new Set(["az", "mi", "oh", "ct", "il", "ma"]);

export type RadarCapture = {
  id: string;
  stateId: string;
  shortName: string;
  gameId: number;
  name: string;
  amount: number;
  dropped: number;
  snapshotAt: string;
  angle: number;
  radius: number;
  stack: 1 | 2;
};

export type RadarContact = {
  id: string;
  shortName: string;
  name: string;
  amount: number;
  angle: number;
  radius: number;
};

export type RadarScopePayload = {
  captures: RadarCapture[];
  contacts: RadarContact[];
  cycleId: string;
  bleeps: 0 | 1 | 2;
};

export const EMPTY_RADAR: RadarScopePayload = {
  captures: [],
  contacts: [],
  cycleId: "",
  bleeps: 0,
};

export function isMonitoredDesk(stateId: string): boolean {
  if (BLOCKED_DESKS.has(stateId)) return false;
  return (RADAR_STATE_IDS as readonly string[]).includes(stateId);
}

/** Jackpot (grand) games only — cash-out tops are not a grand capture. */
export function isGrandJackpot(game: Game): boolean {
  const top = game.tiers[0]?.amount ?? game.topPrize;
  return top > game.price * 120;
}

export function publishedTopRemaining(game: Game): number | null {
  const remaining = game.tiers[0]?.remaining;
  if (remaining == null || !Number.isFinite(remaining) || remaining < 0) return null;
  return remaining;
}

export function shortRadarName(name: string): string {
  const trimmed = name.replace(/^\$[\d,]+(?:\s+)?/, "").trim();
  if (trimmed.length <= 18) return trimmed || name;
  return `${trimmed.slice(0, 17).trim()}…`;
}

/** FNV-1a. Snapshot time moves a new capture off the last blip. */
export function hashRadarPos(
  stateId: string,
  gameNumber: number,
  snapshotAt: string,
): { angle: number; radius: number } {
  const key = `${stateId}:${gameNumber}:${snapshotAt}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u = h >>> 0;
  return {
    angle: u % 360,
    radius: 0.42 + ((u >>> 9) % 43) / 100,
  };
}

export function captureCycleId(captures: Pick<RadarCapture, "id">[]): string {
  if (!captures.length) return "";
  return captures
    .map((row) => row.id)
    .sort()
    .join("|");
}

export function captureBleeps(captures: Pick<RadarCapture, "dropped">[]): 0 | 1 | 2 {
  if (!captures.length) return 0;
  if (captures.length >= 2 || captures.some((row) => row.dropped >= 2)) return 2;
  return 1;
}

export function detectGrandCaptures(
  priorGames: Game[],
  currentGames: Game[],
  meta: { stateId: string; shortName: string; snapshotAt: string },
): RadarCapture[] {
  if (!isMonitoredDesk(meta.stateId)) return [];
  if (!priorGames.length || !currentGames.length) return [];

  const priorByNumber = new Map<number, Game>();
  for (const game of priorGames) priorByNumber.set(game.number, game);

  const out: RadarCapture[] = [];
  for (const game of currentGames) {
    if (!isGrandJackpot(game)) continue;
    const prior = priorByNumber.get(game.number);
    if (!prior || !isGrandJackpot(prior)) continue;
    const before = publishedTopRemaining(prior);
    const after = publishedTopRemaining(game);
    if (before == null || after == null) continue;
    if (after >= before) continue;
    const dropped = before - after;
    if (dropped < 1) continue;
    const pos = hashRadarPos(meta.stateId, game.number, meta.snapshotAt);
    out.push({
      id: `${meta.stateId}-${game.number}-${meta.snapshotAt}`,
      stateId: meta.stateId,
      shortName: meta.shortName,
      gameId: game.number,
      name: shortRadarName(game.name),
      amount: game.topPrize,
      dropped,
      snapshotAt: meta.snapshotAt,
      angle: pos.angle,
      radius: pos.radius,
      stack: dropped >= 2 ? 2 : 1,
    });
  }
  return out;
}

export function quietJackpotContacts(
  games: Game[],
  meta: { stateId: string; shortName: string },
  skipGameIds: Set<number>,
): RadarContact[] {
  if (!isMonitoredDesk(meta.stateId)) return [];
  const out: RadarContact[] = [];
  for (const game of games) {
    if (skipGameIds.has(game.number)) continue;
    if (!isGrandJackpot(game)) continue;
    const remaining = publishedTopRemaining(game);
    if (remaining == null || remaining <= 0) continue;
    const pos = hashRadarPos(meta.stateId, game.number, "quiet");
    out.push({
      id: `quiet-${meta.stateId}-${game.number}`,
      shortName: meta.shortName,
      name: shortRadarName(game.name),
      amount: game.topPrize,
      angle: pos.angle,
      radius: pos.radius,
    });
  }
  return out;
}

export function assembleRadarScope(
  captures: RadarCapture[],
  contacts: RadarContact[],
): RadarScopePayload {
  const ranked = [...captures].sort(
    (a, b) => b.dropped - a.dropped || b.amount - a.amount || a.gameId - b.gameId,
  );
  const stacked = ranked.slice(0, 2);
  const older = ranked.slice(2);
  const stackedIds = new Set(stacked.map((row) => row.id));
  const dimFromCaptures: RadarContact[] = older.map((row) => ({
    id: row.id,
    shortName: row.shortName,
    name: row.name,
    amount: row.amount,
    angle: row.angle,
    radius: row.radius,
  }));
  const quiet = contacts
    .filter((row) => !stackedIds.has(row.id))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);
  return {
    captures: stacked,
    contacts: [...dimFromCaptures, ...quiet].slice(0, 10),
    cycleId: captureCycleId(ranked),
    bleeps: captureBleeps(ranked),
  };
}
