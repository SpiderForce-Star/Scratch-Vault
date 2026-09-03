import type { Game } from "./games";

/** TN reconstructions that exist as /tickets/{number}.jpg for that exact game. */
const NAMED_FACES = new Set([
  1265, 1310, 1355, 1358, 1359, 1360, 1361, 1364, 1368, 1369, 1370, 1372, 1373,
  1376, 1386, 1388, 1395, 1396, 1397, 1401, 1856, 1990, 1996,
]);

function isTennessee(game: Game): boolean {
  const state = (game.stateId ?? "tn").toLowerCase();
  return state === "tn";
}

/** True only for the Tennessee game whose photo is /tickets/{number}.jpg. */
export function hasNamedFace(game: Game): boolean {
  return isTennessee(game) && NAMED_FACES.has(game.number);
}

/**
 * Named TN photo, or null. Never reuse another number's file, a theme
 * fallback, or a Tennessee reconstruction on a different state's desk.
 */
export function ticketArt(game: Game): string | null {
  if (!hasNamedFace(game)) return null;
  return `/tickets/${game.number}.jpg`;
}
