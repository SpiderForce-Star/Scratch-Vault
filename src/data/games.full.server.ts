import { GAMES, type Game } from "./games";

/** Server-only remaining-prize overlay. Do not import from client modules. */
const REMAINING: Record<number, [number | null, number | null, number | null]> = {
  1358: [245, null, null],
  1372: [1, null, null],
  1996: [9, 12, 613],
  1348: [3, null, null],
  1361: [2, null, null],
  1352: [153, null, null],
  1307: [2, null, null],
  1326: [1, null, null],
  1318: [2, null, null],
  1278: [1, null, null],
  1381: [2, null, null],
  1385: [2, null, null],
  1268: [2, null, null],
  1305: [1, null, null],
  1376: [3, null, null],
  1368: [1, 3, 4],
  1359: [611, null, null],
  1373: [2, null, null],
  1327: [1, null, null],
  1275: [1, null, null],
  1382: [2, null, null],
  1306: [2, null, null],
  1309: [1, null, null],
  1335: [2, null, null],
  1322: [1, null, null],
  1330: [1, null, null],
  1353: [1, null, null],
  1377: [1, null, null],
  1369: [2, 8, 360],
  1349: [2, null, null],
  1374: [1, null, null],
  1386: [2, null, null],
  1363: [374, null, null],
  1391: [null, null, null],
  1355: [3, null, null],
  1856: [4, 21, 222],
  1360: [274, null, null],
  1387: [3, null, null],
  1378: [3, null, null],
  1331: [1, null, null],
  1323: [2, null, null],
  1370: [1, 0, 2],
  1315: [1, null, null],
  1354: [58, null, null],
  1990: [1, 1, 6],
  1265: [68, null, null],
  1350: [2, null, null],
  1247: [1, null, null],
  1310: [3, null, null],
  1364: [1, null, null],
};

export function fullCatalog(): Game[] {
  return GAMES.map((game) => {
    const rem = REMAINING[game.number];
    if (!rem) return game;
    return {
      ...game,
      tiers: game.tiers.map((tier, i) => ({
        ...tier,
        remaining: rem[i] ?? null,
      })),
    };
  });
}
