import type { Game } from "@/data/games";
import {
  isDeskPrice,
  pickTripGames,
  type HeatReport,
  type PriceFilter,
} from "./heat.ts";

/** Signup `next` for unpaid catalog links. Signed-in visitors go to account complete from /signup. */
export const FULL_CATALOG_NEXT = "/games";

export function fullCatalogSignupSearch(): { next: string } {
  return { next: FULL_CATALOG_NEXT };
}

/** Unpaid may open tonight’s 3 at this ticket’s price. Anything else is Full Access. */
export function isHomepageTeaseGame(
  catalog: Game[],
  reports: Map<number, HeatReport>,
  number: number,
): boolean {
  const game = catalog.find((row) => row.number === number);
  if (!game || !isDeskPrice(game.price)) return false;
  const filter = String(game.price) as PriceFilter;
  return pickTripGames(catalog, reports, filter, 3).some((row) => row.number === number);
}
