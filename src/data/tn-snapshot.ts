/** Last-good TN snapshot numbers (`src/data/states/last-good/tn.json`). */
export const PREVIOUS_TN_GAME_NUMBERS = new Set<number>([
  1247, 1265, 1268, 1275, 1278, 1305, 1306, 1307, 1309, 1310, 1315, 1318, 1322,
  1323, 1326, 1327, 1330, 1331, 1335, 1348, 1349, 1350, 1352, 1353, 1354, 1355,
  1358, 1359, 1360, 1361, 1363, 1364, 1368, 1369, 1370, 1372, 1373, 1374, 1376,
  1377, 1378, 1381, 1382, 1385, 1386, 1387, 1391, 1856, 1990, 1996,
]);

type CatalogGame = {
  number: number;
  stateId?: string;
  tiers: { remaining: number | null }[];
};

export function isUnpostedGame(game: CatalogGame): boolean {
  return game.tiers.every((tier) => tier.remaining == null);
}

/** Recently launched, or missing from the previous TN snapshot. */
export function isNewCatalogGame(game: CatalogGame): boolean {
  const state = (game.stateId ?? "tn").toLowerCase();
  if (state !== "tn") return false;
  return !PREVIOUS_TN_GAME_NUMBERS.has(game.number);
}

export function isUnpostedNewGame(game: CatalogGame): boolean {
  return isNewCatalogGame(game) && isUnpostedGame(game);
}
