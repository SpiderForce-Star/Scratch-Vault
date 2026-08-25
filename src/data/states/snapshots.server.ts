import type { Game } from "@/data/games";
import type { StateId } from "@/config/states";
import { getSql } from "@/lib/db";

export type DeskSnapshotRow = {
  stateId: StateId;
  ok: boolean;
  stale: boolean;
  fetchedAt: string;
  weekLabel: string;
  sourceUrl: string | null;
  reason: string | null;
  gameCount: number;
  catalog: Game[] | null;
};

type SqlRow = {
  state_id: string;
  ok: boolean | number | string;
  stale: boolean | number | string;
  fetched_at: string | Date;
  week_label: string;
  source_url: string | null;
  reason: string | null;
  game_count: number;
  catalog: unknown;
};

function asIso(value: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : String(value);
}

function asBool(value: boolean | number | string): boolean {
  return value === true || value === 1 || value === "t" || value === "true";
}

function asGames(value: unknown): Game[] | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  return Array.isArray(value) ? (value as Game[]) : null;
}

function fromRow(row: SqlRow): DeskSnapshotRow {
  return {
    stateId: row.state_id as StateId,
    ok: asBool(row.ok),
    stale: asBool(row.stale),
    fetchedAt: asIso(row.fetched_at),
    weekLabel: row.week_label,
    sourceUrl: row.source_url,
    reason: row.reason,
    gameCount: Number(row.game_count) || 0,
    catalog: asGames(row.catalog),
  };
}

export function formatWeekLabel(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "Compiled snapshot";
  const label = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago",
  }).format(date);
  return `Compiled · ${label}`;
}

export async function countSnapshots(): Promise<number> {
  const sql = await getSql();
  const rows = await sql.query<{ n: number }>("SELECT count(*)::int AS n FROM desk_snapshots");
  return Number(rows[0]?.n) || 0;
}

export async function readSnapshot(stateId: StateId): Promise<DeskSnapshotRow | null> {
  const sql = await getSql();
  const rows = await sql.query<SqlRow>(
    `SELECT state_id, ok, stale, fetched_at, week_label, source_url, reason, game_count, catalog
     FROM desk_snapshots
     WHERE state_id = $1
     LIMIT 1`,
    [stateId],
  );
  return rows[0] ? fromRow(rows[0]) : null;
}

export async function upsertSnapshot(input: {
  stateId: StateId;
  ok: boolean;
  stale: boolean;
  fetchedAt: string;
  weekLabel: string;
  sourceUrl: string | null;
  reason: string | null;
  gameCount: number;
  catalog: Game[] | null;
}): Promise<void> {
  const sql = await getSql();
  await sql.query(
    `INSERT INTO desk_snapshots
      (state_id, ok, stale, fetched_at, week_label, source_url, reason, game_count, catalog)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (state_id) DO UPDATE SET
      ok = EXCLUDED.ok,
      stale = EXCLUDED.stale,
      fetched_at = EXCLUDED.fetched_at,
      week_label = EXCLUDED.week_label,
      source_url = EXCLUDED.source_url,
      reason = EXCLUDED.reason,
      game_count = EXCLUDED.game_count,
      catalog = EXCLUDED.catalog`,
    [
      input.stateId,
      input.ok,
      input.stale,
      input.fetchedAt,
      input.weekLabel,
      input.sourceUrl,
      input.reason,
      input.gameCount,
      input.catalog ? JSON.stringify(input.catalog) : null,
    ],
  );
}

/** Keep last-good catalog; mark today's pull as failed. */
export async function markSnapshotFailed(
  stateId: StateId,
  reason: string,
  sourceUrl: string | null,
): Promise<DeskSnapshotRow | null> {
  const current = await readSnapshot(stateId);
  if (!current?.catalog?.length) {
    await upsertSnapshot({
      stateId,
      ok: false,
      stale: false,
      fetchedAt: new Date().toISOString(),
      weekLabel: "Compiled · fetch failed",
      sourceUrl,
      reason,
      gameCount: 0,
      catalog: null,
    });
    return readSnapshot(stateId);
  }
  const sql = await getSql();
  await sql.query(
    `UPDATE desk_snapshots
     SET ok = false, stale = true, source_url = COALESCE($2, source_url), reason = $3
     WHERE state_id = $1`,
    [stateId, sourceUrl, reason],
  );
  return readSnapshot(stateId);
}
