/**
 * Remaining tables sometimes keep closed games. Skip-list them so they
 * never land in Review these 3 / tonight picks.
 */
export const ENDED_GAMES: ReadonlyArray<{ readonly stateId: string; readonly number: number }> = [
  { stateId: "ky", number: 107 }, // Merry Multiplier — closed; still on KY remaining
];

export function isEndedGame(game: {
  stateId?: string;
  number: number;
  name?: string;
}): boolean {
  const state = (game.stateId ?? "tn").trim().toLowerCase() || "tn";
  if (ENDED_GAMES.some((row) => row.stateId === state && row.number === game.number)) {
    return true;
  }
  const name = String(game.name ?? "");
  return /no longer available|not sold|\bended\b|no longer sold/i.test(name);
}
