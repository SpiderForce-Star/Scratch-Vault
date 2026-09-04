import { PREVIOUS_GAME_NUMBERS, previousNumbersFor } from "./previous-games.ts";

/** Last-good TN snapshot numbers (`src/data/states/last-good/tn.json`). */
export const PREVIOUS_TN_GAME_NUMBERS = new Set<number>(
  PREVIOUS_GAME_NUMBERS.tn ?? [],
);

type CatalogGame = {
  number: number;
  stateId?: string;
  fresh?: boolean;
  tiers: { remaining: number | null }[];
};

export function isUnpostedGame(game: CatalogGame): boolean {
  return game.tiers.every((tier) => tier.remaining == null);
}

/** Recently launched, listed on the official new-games page, or missing from last-good. */
export function isNewCatalogGame(game: CatalogGame): boolean {
  if (game.fresh) return true;
  const prev = previousNumbersFor(game.stateId ?? "tn");
  if (!prev.size) return false;
  return !prev.has(game.number);
}

export function isUnpostedNewGame(game: CatalogGame): boolean {
  return isNewCatalogGame(game) && isUnpostedGame(game);
}
