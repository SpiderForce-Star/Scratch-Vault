/**
 * Single source of truth for “new information is on the desk.”
 * weekLabel / publishedAt match last-good TN (`src/data/states/last-good/tn.json`).
 * That snapshot is stale (HTTP 403) — not a fresh scrape.
 * Bump `revision` EVERY time `src/data/games.ts` changes or the alert is a lie.
 */
export const DESK_META = {
  weekLabel: "Week of September 3, 2026",
  publishedAt: "2026-09-03T12:00:00-05:00",
  revision: 2,
  summary:
    "TN catalog expanded with live instant games, including Jumbo Bucks Collectible.",
  changedGameNumbers: [
    "1246",
    "1254",
    "1262",
    "1266",
    "1277",
    "1293",
    "1303",
    "1304",
    "1328",
    "1332",
    "1333",
    "1334",
    "1346",
    "1351",
    "1356",
    "1357",
    "1362",
    "1365",
    "1366",
    "1367",
    "1371",
    "1375",
    "1379",
    "1380",
    "1383",
    "1384",
    "1388",
    "1389",
    "1393",
    "1394",
    "1395",
    "1396",
    "1397",
    "1401",
    "1501",
    "1851",
  ] as string[],
};
