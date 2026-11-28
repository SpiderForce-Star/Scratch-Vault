/**
 * Desks fed from outside Vercel (see refresh-schedule `runner: "external"`)
 * are never pulled by the cron, so the cron checks they are not overdue.
 */
import { STATE_IDS, type StateId } from "@/config/states";
import { REFRESH_SCHEDULE } from "@/config/refresh-schedule";
import { isAlertDesk, staleAfterMs } from "@/lib/desk-freshness";
import { readSnapshot } from "./snapshots.server";

export type OverdueDesk = { stateId: StateId; fetchedAt: string | null; ageHours: number | null };

export async function overdueExternalDesks(now = Date.now()): Promise<OverdueDesk[]> {
  const out: OverdueDesk[] = [];
  for (const id of STATE_IDS) {
    const r = REFRESH_SCHEDULE[id];
    if (r.runner !== "external" || !isAlertDesk(id)) continue;
    try {
      const row = await readSnapshot(id);
      const at = row?.ok ? Date.parse(row.fetchedAt) : NaN;
      const age = Number.isFinite(at) ? now - at : null;
      if (age == null || age > staleAfterMs(r.cadence)) {
        out.push({
          stateId: id,
          fetchedAt: row?.fetchedAt ?? null,
          ageHours: age == null ? null : Math.round(age / 3_600_000),
        });
      }
    } catch {
      out.push({ stateId: id, fetchedAt: null, ageHours: null });
    }
  }
  return out;
}
