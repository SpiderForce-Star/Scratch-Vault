import type { StateId } from "@/config/states";
import { DESK_META } from "@/data/desk-meta";

/**
 * Committed prize-list times used before a page snapshot arrives.
 * Tennessee uses the catalog stamp in DESK_META (September 3, 2026).
 * Other states use the fetchedAt on the committed last-good file.
 * Illinois and Massachusetts have no last-good file.
 */
export const BUNDLED_DESK_AS_OF: Partial<Record<StateId, string>> = {
  tn: DESK_META.publishedAt,
  ky: "2026-08-28T11:14:33.625Z",
  sc: "2026-08-28T11:14:33.626Z",
  ok: "2026-08-28T11:14:33.628Z",
  mi: "2026-08-15T03:52:00-04:00",
  az: "2026-08-21T12:00:00-07:00",
  nc: "2026-08-28T11:14:34.070Z",
  pa: "2026-08-28T11:14:34.074Z",
  tx: "2026-08-28T11:14:34.184Z",
  mo: "2026-08-28T11:14:34.554Z",
  oh: "2026-08-21T06:00:00-04:00",
  ia: "2026-08-28T11:14:34.911Z",
  id: "2026-08-28T11:14:35.116Z",
  ct: "2026-08-20T12:00:00-04:00",
};

export function bundledDeskAsOf(id: StateId): string | null {
  return BUNDLED_DESK_AS_OF[id] ?? null;
}
