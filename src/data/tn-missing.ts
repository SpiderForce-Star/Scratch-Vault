import type { Game, GameSource, TicketPrice, TicketTheme } from "./games";

function g(
  number: number,
  name: string,
  price: TicketPrice,
  topPrize: number,
  odds: number,
  mid: number,
  low: number,
  theme: TicketTheme,
  source: GameSource = "public-compiled",
): Game {
  return {
    number,
    name,
    price,
    topPrize,
    odds,
    source,
    theme,
    tiers: [
      { amount: topPrize, remaining: null },
      { amount: mid, remaining: null },
      { amount: low, remaining: null },
    ],
  };
}

/**
 * Live TN instant games missing from the previous last-good snapshot.
 * Remaining stays null here; official counts overlay in games.full.server.ts.
 */
export const TN_MISSING_GAMES: Game[] = [
  // $1
  g(1356, "$50 Frenzy", 1, 50, 4.67, 20, 10, "frenzy"),
  g(1388, "Pay Me!", 1, 5_000, 4.41, 500, 100, "cash"),
  g(1303, "$10,000 Bonus Scratch", 1, 10_000, 4.59, 500, 200, "jumbo"),
  g(1365, "10X", 1, 10_000, 4.64, 500, 200, "multiplier", "tn-remaining"),
  g(1266, "Lucky Roll", 1, 5_000, 4.67, 500, 100, "cash"),
  g(1332, "Did I Win?", 1, 5_000, 4.8, 500, 100, "cash"),
  g(1383, "Lucky Gems", 1, 5_000, 4.86, 500, 100, "cash"),
  g(1851, "Junior Jumbo Bucks", 1, 10_000, 4.69, 500, 100, "jumbo"),

  // $2
  g(1357, "$100 Frenzy", 2, 100, 4.24, 50, 20, "frenzy"),
  g(1393, "Jumbo Bucks Collectible", 2, 50_000, 4.5, 500, 100, "jumbo"),
  g(1277, "Lucky 777", 2, 20_000, 4.42, 500, 100, "cash"),
  g(1351, "More Money", 2, 20_000, 4.14, 500, 100, "cash"),
  g(1384, "Times 10 Bonus", 2, 20_000, 4.14, 500, 100, "multiplier"),
  g(1304, "$50,000 Bonus Scratch", 2, 50_000, 4.34, 5_000, 2_000, "jumbo"),
  g(1328, "Double Deuces", 2, 20_000, 4.36, 500, 100, "cash"),
  g(1379, "Cash Notes", 2, 20_000, 4.4, 500, 100, "cash"),
  g(1371, "Stacks Of Green", 2, 20_000, 4.41, 500, 100, "cash"),
  g(1366, "20X", 2, 50_000, 4.41, 500, 200, "multiplier", "tn-remaining"),
  g(1375, "HOT Chicken", 2, 20_000, 4.49, 500, 100, "frenzy"),
  g(1333, "$20,000 Payout", 2, 20_000, 4.49, 500, 100, "cash"),
  g(1262, "Cash Flow", 2, 20_000, 4.51, 500, 100, "cash"),
  g(1389, "$100 Tripler", 2, 20_000, 4.64, 500, 100, "multiplier"),

  // $3
  g(1501, "Jumbo Bucks Seasons", 3, 75_000, 3.65, 3_000, 500, "jumbo"),
  g(1401, "Jumbo Bucks Seasons", 3, 75_000, 3.65, 3_000, 500, "jumbo", "tn-remaining"),
  g(1380, "Treasure Hunt", 3, 75_000, 3.88, 3_000, 500, "cash"),
  g(1254, "Jackpot Slots", 3, 75_000, 3.86, 3_000, 500, "cash"),
  g(1367, "30X Cashword", 3, 75_000, 3.89, 3_000, 1_000, "crossword", "tn-remaining"),
  g(1394, "Lady Jumbo Bucks Crossword", 3, 75_000, 3.84, 5_000, 500, "crossword"),

  // $5
  g(1395, "Jumbo Bucks Collectible", 5, 150_000, 3.62, 5_000, 1_000, "jumbo"),
  g(1246, "Fire/Ice", 5, 200_000, 4.0, 5_000, 500, "cash"),
  g(1334, "Cash Is King", 5, 200_000, 4.22, 5_000, 500, "cash"),

  // $10
  g(1396, "Jumbo Bucks Collectible", 10, 300_000, 3.15, 10_000, 1_000, "jumbo"),
  g(1362, "MONOPOLY", 10, 500_000, 3.43, 10_000, 1_000, "cash"),

  // $20
  g(1397, "Jumbo Bucks Collectible", 20, 1_000_000, 2.97, 20_000, 5_000, "jumbo"),
  g(1293, "The Most Wonderful Time of the Year", 20, 500_000, 2.82, 10_000, 1_000, "cash"),
  g(1346, "Holiday Bonus", 20, 500_000, 2.82, 10_000, 1_000, "cash"),
];
