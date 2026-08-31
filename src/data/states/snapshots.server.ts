import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Game } from "@/data/games";
import type { StateId } from "@/config/states";
import { trustedCatalog } from "./parse.server";

function hasPostgres(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

const LAST_GOOD_DIR = join(dirname(fileURLToPath(import.meta.url)), "last-good");

const bundledLastGood = import.meta.glob("./last-good/*.json", {
  eager: true,
  import: "default",
}) as Record<string, DeskSnapshotRow>;

function readBundledLastGood(stateId: StateId): DeskSnapshotRow | null {
  for (const [path, row] of Object.entries(bundledLastGood || {})) {
    if (!path.endsWith(`${stateId}.json`) || !row?.catalog?.length) continue;
    const catalog = trustedCatalog(row.catalog);
    if (!catalog.length) continue;
    return { ...row, stateId, catalog, gameCount: catalog.length };
  }
  return null;
}

function lastGoodPath(stateId: StateId): string {
  return join(LAST_GOOD_DIR, `${stateId}.json`);
}

function readLastGoodFile(stateId: StateId): DeskSnapshotRow | null {
  try {
    const path = lastGoodPath(stateId);
    if (!existsSync(path)) return null;
    const row = JSON.parse(readFileSync(path, "utf8")) as DeskSnapshotRow;
    if (!row?.catalog?.length) return null;
    const catalog = trustedCatalog(row.catalog);
    if (!catalog.length) return null;
    return { ...row, stateId, catalog, gameCount: catalog.length };
  } catch {
    return null;
  }
}

function writeLastGoodFile(row: DeskSnapshotRow): void {
  if (!row.catalog?.length) return;
  try {
    mkdirSync(LAST_GOOD_DIR, { recursive: true });
    const catalog = trustedCatalog(row.catalog);
    if (!catalog.length) return;
    writeFileSync(
      lastGoodPath(row.stateId),
      `${JSON.stringify({ ...row, catalog, gameCount: catalog.length }, null, 0)}\n`,
      "utf8",
    );
  } catch {
    /* Vercel bundle is read-only; committed last-good JSON is the persist. */
  }
}

async function getSqlOrThrow() {
  const { getSql } = await import("@/lib/db");
  return getSql();
}

const memory = new Map<StateId, DeskSnapshotRow>();

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
  if (!Array.isArray(value)) return null;
  const clean = trustedCatalog(value as Game[]);
  return clean.length ? clean : null;
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

export function formatWeekLabel(iso: string, live = false): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return live ? "Official table" : "Compiled snapshot";
  const label = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago",
  }).format(date);
  return live ? label : `Compiled · ${label}`;
}

export async function countSnapshots(): Promise<number> {
  if (!hasPostgres()) return memory.size;
  const sql = await getSqlOrThrow();
  const rows = await sql.query<{ n: number }>("SELECT count(*)::int AS n FROM desk_snapshots");
  return Number(rows[0]?.n) || 0;
}

export async function readSnapshot(stateId: StateId): Promise<DeskSnapshotRow | null> {
  const cached = memory.get(stateId);
  if (cached?.catalog?.length) return cached;
  if (hasPostgres()) {
    const sql = await getSqlOrThrow();
    const rows = await sql.query<SqlRow>(
      `SELECT state_id, ok, stale, fetched_at, week_label, source_url, reason, game_count, catalog
       FROM desk_snapshots
       WHERE state_id = $1
       LIMIT 1`,
      [stateId],
    );
    if (rows[0]) {
      const row = fromRow(rows[0]);
      memory.set(stateId, row);
      return row;
    }
  }
  const file = readLastGoodFile(stateId) ?? readBundledLastGood(stateId);
  if (file) {
    memory.set(stateId, file);
    return file;
  }
  return cached ?? null;
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
  const catalog = input.catalog ? trustedCatalog(input.catalog) : null;
  const row: DeskSnapshotRow = {
    stateId: input.stateId,
    ok: input.ok,
    stale: input.stale,
    fetchedAt: input.fetchedAt,
    weekLabel: input.weekLabel,
    sourceUrl: input.sourceUrl,
    reason: input.reason,
    gameCount: catalog?.length ?? input.gameCount,
    catalog,
  };
  memory.set(input.stateId, row);
  writeLastGoodFile(row);
  if (!hasPostgres()) return;
  const sql = await getSqlOrThrow();
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
    // Keep bundled last-good. Never persist an empty catalog.
    return null;
  }
  const next: DeskSnapshotRow = {
    ...current,
    ok: false,
    stale: true,
    sourceUrl: sourceUrl ?? current.sourceUrl,
    reason,
  };
  memory.set(stateId, next);
  writeLastGoodFile(next);
  if (!hasPostgres()) return next;
  const sql = await getSqlOrThrow();
  await sql.query(
    `UPDATE desk_snapshots
     SET ok = false, stale = true, source_url = COALESCE($2, source_url), reason = $3
     WHERE state_id = $1`,
    [stateId, sourceUrl, reason],
  );
  return readSnapshot(stateId);
}
