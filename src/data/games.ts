export type PrizeTier = {
  amount: number;
  remaining: number | null;
};

export type TicketTheme =
  | "jumbo"
  | "crossword"
  | "frenzy"
  | "multiplier"
  | "cash"
  | "high";

export type GameSource =
  | "tn-remaining"
  | "official-remaining"
  | "public-compiled"
  | "sample";

export type Game = {
  number: number;
  name: string;
  price: 5 | 10 | 20 | 25 | 30 | 50;
  topPrize: number;
  odds: number;
  tiers: PrizeTier[];
  source: GameSource;
  theme: TicketTheme;
  /** Stamped by the state catalog loader. Tennessee games may omit this. */
  stateId?: string;
};

export function isOfficialSource(source: GameSource): boolean {
  return source === "tn-remaining" || source === "official-remaining";
}

/** Compiled from public TN remaining-prize tables + published odds (Aug 2026).
 *  If this catalog changes, bump DESK_META.revision in desk-meta.ts. */
export const DATA_AS_OF = "Week of August 11, 2026";

export const GAMES: Game[] = [
  // $5
  {
    number: 1358,
    name: "$500 Frenzy",
    price: 5,
    topPrize: 500,
    odds: 4.19,
    tiers: [
      { amount: 500, remaining: null },
      { amount: 100, remaining: null },
      { amount: 50, remaining: null },
    ],
    source: "public-compiled",
    theme: "frenzy",
  },
  {
    number: 1372,
    name: "Jumbo Bucks Triple Play",
    price: 5,
    topPrize: 150_000,
    odds: 4.01,
    tiers: [
      { amount: 150_000, remaining: null },
      { amount: 5_000, remaining: null },
      { amount: 1_000, remaining: null },
    ],
    source: "public-compiled",
    theme: "jumbo",
  },
  {
    number: 1996,
    name: "Giant Jumbo Bucks",
    price: 5,
    topPrize: 150_000,
    odds: 4.0,
    tiers: [
      { amount: 150_000, remaining: null },
      { amount: 5_000, remaining: null },
      { amount: 1_000, remaining: null },
    ],
    source: "tn-remaining",
    theme: "jumbo",
  },
  {
    number: 1348,
    name: "Money Rush",
    price: 5,
    topPrize: 150_000,
    odds: 3.93,
    tiers: [
      { amount: 150_000, remaining: null },
      { amount: 5_000, remaining: null },
      { amount: 500, remaining: null },
    ],
    source: "public-compiled",
    theme: "cash",
  },
  {
    number: 1361,
    name: "MONOPOLY",
    price: 5,
    topPrize: 200_000,
    odds: 3.99,
    tiers: [
      { amount: 200_000, remaining: null },
      { amount: 5_000, remaining: null },
      { amount: 500, remaining: null },
    ],
    source: "public-compiled",
    theme: "cash",
  },
  {
    number: 1352,
    name: "$25, $50 & $250 Cash Out",
    price: 5,
    topPrize: 250,
    odds: 5.05,
    tiers: [
      { amount: 250, remaining: null },
      { amount: 50, remaining: null },
      { amount: 25, remaining: null },
    ],
    source: "public-compiled",
    theme: "frenzy",
  },
  {
    number: 1307,
    name: "Cyber Cash",
    price: 5,
    topPrize: 150_000,
    odds: 3.93,
    tiers: [
      { amount: 150_000, remaining: null },
      { amount: 5_000, remaining: null },
      { amount: 500, remaining: null },
    ],
    source: "public-compiled",
    theme: "cash",
  },
  {
    number: 1326,
    name: "Power Play",
    price: 5,
    topPrize: 200_000,
    odds: 3.95,
    tiers: [
      { amount: 200_000, remaining: null },
      { amount: 5_000, remaining: null },
      { amount: 500, remaining: null },
    ],
    source: "public-compiled",
    theme: "multiplier",
  },
  {
    number: 1318,
    name: "Red Hot Slots",
    price: 5,
    topPrize: 200_000,
    odds: 3.96,
    tiers: [
      { amount: 200_000, remaining: null },
      { amount: 5_000, remaining: null },
      { amount: 500, remaining: null },
    ],
    source: "public-compiled",
    theme: "cash",
  },
  {
    number: 1278,
    name: "Find The 9's",
    price: 5,
    topPrize: 200_000,
    odds: 3.99,
    tiers: [
      { amount: 200_000, remaining: null },
      { amount: 5_000, remaining: null },
      { amount: 500, remaining: null },
    ],
    source: "public-compiled",
    theme: "cash",
  },
  {
    number: 1381,
    name: "High Voltage Cash",
    price: 5,
    topPrize: 200_000,
    odds: 3.99,
    tiers: [
      { amount: 200_000, remaining: null },
      { amount: 5_000, remaining: null },
      { amount: 500, remaining: null },
    ],
    source: "public-compiled",
    theme: "cash",
  },
  {
    number: 1385,
    name: "Game Show Experience",
    price: 5,
    topPrize: 100_000,
    odds: 4.06,
    tiers: [
      { amount: 100_000, remaining: null },
      { amount: 2_000, remaining: null },
      { amount: 500, remaining: null },
    ],
    source: "public-compiled",
    theme: "cash",
  },
  {
    number: 1268,
    name: "Aces Of Spades",
    price: 5,
    topPrize: 200_000,
    odds: 4.1,
    tiers: [
      { amount: 200_000, remaining: null },
      { amount: 5_000, remaining: null },
      { amount: 500, remaining: null },
    ],
    source: "public-compiled",
    theme: "cash",
  },
  {
    number: 1305,
    name: "$250,000 Bonus Scratch",
    price: 5,
    topPrize: 250_000,
    odds: 4.12,
    tiers: [
      { amount: 250_000, remaining: null },
      { amount: 10_000, remaining: null },
      { amount: 1_000, remaining: null },
    ],
    source: "public-compiled",
    theme: "jumbo",
  },
  {
    number: 1376,
    name: "Fiery 7s",
    price: 5,
    topPrize: 200_000,
    odds: 3.98,
    tiers: [
      { amount: 200_000, remaining: null },
      { amount: 5_000, remaining: null },
      { amount: 500, remaining: null },
    ],
    source: "public-compiled",
    theme: "frenzy",
  },
  {
    number: 1368,
    name: "50X",
    price: 5,
    topPrize: 250_000,
    odds: 4.34,
    tiers: [
      { amount: 250_000, remaining: null },
      { amount: 10_000, remaining: null },
      { amount: 1_000, remaining: null },
    ],
    source: "tn-remaining",
    theme: "multiplier",
  },

  // $10
  {
    number: 1359,
    name: "$1,000 Frenzy",
    price: 10,
    topPrize: 1_000,
    odds: 3.61,
    tiers: [
      { amount: 1_000, remaining: null },
      { amount: 200, remaining: null },
      { amount: 100, remaining: null },
    ],
    source: "public-compiled",
    theme: "frenzy",
  },
  {
    number: 1373,
    name: "King's Ransom",
    price: 10,
    topPrize: 500_000,
    odds: 3.16,
    tiers: [
      { amount: 500_000, remaining: null },
      { amount: 10_000, remaining: null },
      { amount: 1_000, remaining: null },
    ],
    source: "public-compiled",
    theme: "high",
  },
  {
    number: 1327,
    name: "Ultimate Bonus Payout",
    price: 10,
    topPrize: 500_000,
    odds: 3.22,
    tiers: [
      { amount: 500_000, remaining: null },
      { amount: 10_000, remaining: null },
      { amount: 1_000, remaining: null },
    ],
    source: "public-compiled",
    theme: "cash",
  },
  {
    number: 1275,
    name: "Great 8's",
    price: 10,
    topPrize: 500_000,
    odds: 3.26,
    tiers: [
      { amount: 500_000, remaining: null },
      { amount: 10_000, remaining: null },
      { amount: 1_000, remaining: null },
    ],
    source: "public-compiled",
    theme: "cash",
  },
  {
    number: 1382,
    name: "Instant Cash",
    price: 10,
    topPrize: 500_000,
    odds: 3.33,
    tiers: [
      { amount: 500_000, remaining: null },
      { amount: 10_000, remaining: null },
      { amount: 1_000, remaining: null },
    ],
    source: "public-compiled",
    theme: "cash",
  },
  {
    number: 1306,
    name: "$500,000 Bonus Scratch",
    price: 10,
    topPrize: 500_000,
    odds: 3.4,
    tiers: [
      { amount: 500_000, remaining: null },
      { amount: 10_000, remaining: null },
      { amount: 1_000, remaining: null },
    ],
    source: "public-compiled",
    theme: "jumbo",
  },
  {
    number: 1309,
    name: "Extreme Green",
    price: 10,
    topPrize: 400_000,
    odds: 3.44,
    tiers: [
      { amount: 400_000, remaining: null },
      { amount: 10_000, remaining: null },
      { amount: 1_000, remaining: null },
    ],
    source: "public-compiled",
    theme: "cash",
  },
  {
    number: 1335,
    name: "$500,000 Richer",
    price: 10,
    topPrize: 500_000,
    odds: 3.46,
    tiers: [
      { amount: 500_000, remaining: null },
      { amount: 10_000, remaining: null },
      { amount: 1_000, remaining: null },
    ],
    source: "public-compiled",
    theme: "high",
  },
  {
    number: 1322,
    name: "Multiplier Mania",
    price: 10,
    topPrize: 500_000,
    odds: 3.47,
    tiers: [
      { amount: 500_000, remaining: null },
      { amount: 10_000, remaining: null },
      { amount: 1_000, remaining: null },
    ],
    source: "public-compiled",
    theme: "multiplier",
  },
  {
    number: 1330,
    name: "Lady Luck",
    price: 10,
    topPrize: 500_000,
    odds: 3.47,
    tiers: [
      { amount: 500_000, remaining: null },
      { amount: 10_000, remaining: null },
      { amount: 1_000, remaining: null },
    ],
    source: "public-compiled",
    theme: "cash",
  },
  {
    number: 1353,
    name: "Cash Times 10",
    price: 10,
    topPrize: 400_000,
    odds: 3.51,
    tiers: [
      { amount: 400_000, remaining: null },
      { amount: 10_000, remaining: null },
      { amount: 1_000, remaining: null },
    ],
    source: "public-compiled",
    theme: "multiplier",
  },
  {
    number: 1377,
    name: "$500,000 Bonus Multiplier",
    price: 10,
    topPrize: 500_000,
    odds: 3.52,
    tiers: [
      { amount: 500_000, remaining: null },
      { amount: 10_000, remaining: null },
      { amount: 1_000, remaining: null },
    ],
    source: "public-compiled",
    theme: "multiplier",
  },
  {
    number: 1369,
    name: "100X",
    price: 10,
    topPrize: 500_000,
    odds: 3.55,
    tiers: [
      { amount: 500_000, remaining: null },
      { amount: 10_000, remaining: null },
      { amount: 1_000, remaining: null },
    ],
    source: "tn-remaining",
    theme: "multiplier",
  },
  {
    number: 1349,
    name: "Silver 7s",
    price: 10,
    topPrize: 250_000,
    odds: 3.57,
    tiers: [
      { amount: 250_000, remaining: null },
      { amount: 5_000, remaining: null },
      { amount: 500, remaining: null },
    ],
    source: "public-compiled",
    theme: "cash",
  },
  {
    number: 1374,
    name: "Cash Games",
    price: 10,
    topPrize: 500_000,
    odds: 3.65,
    tiers: [
      { amount: 500_000, remaining: null },
      { amount: 10_000, remaining: null },
      { amount: 1_000, remaining: null },
    ],
    source: "public-compiled",
    theme: "cash",
  },
  {
    number: 1386,
    name: "24K Gold",
    price: 10,
    topPrize: 300_000,
    odds: 3.85,
    tiers: [
      { amount: 300_000, remaining: null },
      { amount: 10_000, remaining: null },
      { amount: 1_000, remaining: null },
    ],
    source: "public-compiled",
    theme: "high",
  },
  {
    number: 1363,
    name: "$50, $100 OR $500!",
    price: 10,
    topPrize: 500,
    odds: 7.89,
    tiers: [
      { amount: 500, remaining: null },
      { amount: 100, remaining: null },
      { amount: 50, remaining: null },
    ],
    source: "public-compiled",
    theme: "frenzy",
  },
  {
    number: 1391,
    name: "$500 Fever",
    price: 10,
    topPrize: 500,
    odds: 3.78,
    tiers: [
      { amount: 500, remaining: null },
      { amount: 100, remaining: null },
      { amount: 50, remaining: null },
    ],
    source: "public-compiled",
    theme: "frenzy",
  },

  // $20
  {
    number: 1355,
    name: "Mega Play Jumbo Bucks Crossword",
    price: 20,
    topPrize: 1_000_000,
    odds: 2.57,
    tiers: [
      { amount: 1_000_000, remaining: null },
      { amount: 20_000, remaining: null },
      { amount: 5_000, remaining: null },
    ],
    source: "public-compiled",
    theme: "crossword",
  },
  {
    number: 1856,
    name: "Jumbo Bucks Crossword",
    price: 20,
    topPrize: 75_000,
    odds: 3.2,
    tiers: [
      { amount: 75_000, remaining: null },
      { amount: 5_000, remaining: null },
      { amount: 500, remaining: null },
    ],
    source: "tn-remaining",
    theme: "crossword",
  },
  {
    number: 1360,
    name: "$2,000 Frenzy",
    price: 20,
    topPrize: 2_000,
    odds: 3.0,
    tiers: [
      { amount: 2_000, remaining: null },
      { amount: 500, remaining: null },
      { amount: 200, remaining: null },
    ],
    source: "public-compiled",
    theme: "frenzy",
  },
  {
    number: 1387,
    name: "All The Money",
    price: 20,
    topPrize: 1_000_000,
    odds: 3.07,
    tiers: [
      { amount: 1_000_000, remaining: null },
      { amount: 20_000, remaining: null },
      { amount: 5_000, remaining: null },
    ],
    source: "public-compiled",
    theme: "high",
  },
  {
    number: 1378,
    name: "Maximum Millions",
    price: 20,
    topPrize: 1_000_000,
    odds: 3.26,
    tiers: [
      { amount: 1_000_000, remaining: null },
      { amount: 20_000, remaining: null },
      { amount: 5_000, remaining: null },
    ],
    source: "public-compiled",
    theme: "high",
  },
  {
    number: 1331,
    name: "Super Cash Bonanza",
    price: 20,
    topPrize: 1_000_000,
    odds: 3.06,
    tiers: [
      { amount: 1_000_000, remaining: null },
      { amount: 20_000, remaining: null },
      { amount: 5_000, remaining: null },
    ],
    source: "public-compiled",
    theme: "cash",
  },
  {
    number: 1323,
    name: "$1,000,000 Multiplier Jackpot",
    price: 20,
    topPrize: 1_000_000,
    odds: 3.12,
    tiers: [
      { amount: 1_000_000, remaining: null },
      { amount: 20_000, remaining: null },
      { amount: 5_000, remaining: null },
    ],
    source: "public-compiled",
    theme: "multiplier",
  },
  {
    number: 1370,
    name: "200X",
    price: 20,
    topPrize: 1_000_000,
    odds: 3.33,
    tiers: [
      { amount: 1_000_000, remaining: null },
      { amount: 40_000, remaining: null },
      { amount: 10_000, remaining: null },
    ],
    source: "tn-remaining",
    theme: "multiplier",
  },
  {
    number: 1315,
    name: "200X The Win",
    price: 20,
    topPrize: 1_000_000,
    odds: 3.34,
    tiers: [
      { amount: 1_000_000, remaining: null },
      { amount: 20_000, remaining: null },
      { amount: 5_000, remaining: null },
    ],
    source: "public-compiled",
    theme: "multiplier",
  },
  {
    number: 1354,
    name: "$100, $250 And $500!",
    price: 20,
    topPrize: 500,
    odds: 7.38,
    tiers: [
      { amount: 500, remaining: null },
      { amount: 250, remaining: null },
      { amount: 100, remaining: null },
    ],
    source: "public-compiled",
    theme: "frenzy",
  },

  // Higher
  {
    number: 1990,
    name: "Mega Millionaire Jumbo Bucks",
    price: 25,
    topPrize: 2_000_000,
    odds: 2.91,
    tiers: [
      { amount: 2_000_000, remaining: null },
      { amount: 100_000, remaining: null },
      { amount: 20_000, remaining: null },
    ],
    source: "tn-remaining",
    theme: "jumbo",
  },
  {
    number: 1265,
    name: "$3,000 Loaded",
    price: 30,
    topPrize: 3_000,
    odds: 2.74,
    tiers: [
      { amount: 3_000, remaining: null },
      { amount: 500, remaining: null },
      { amount: 200, remaining: null },
    ],
    source: "public-compiled",
    theme: "frenzy",
  },
  {
    number: 1350,
    name: "Jumbo Bucks Super Supreme",
    price: 30,
    topPrize: 3_000_000,
    odds: 2.89,
    tiers: [
      { amount: 3_000_000, remaining: null },
      { amount: 50_000, remaining: null },
      { amount: 10_000, remaining: null },
    ],
    source: "public-compiled",
    theme: "jumbo",
  },
  {
    number: 1247,
    name: "Deluxe Gold",
    price: 30,
    topPrize: 3_000_000,
    odds: 3.09,
    tiers: [
      { amount: 3_000_000, remaining: null },
      { amount: 50_000, remaining: null },
      { amount: 10_000, remaining: null },
    ],
    source: "public-compiled",
    theme: "high",
  },
  {
    number: 1310,
    name: "The Fastest Road To A $1 Million",
    price: 50,
    topPrize: 1_000_000,
    odds: 2.64,
    tiers: [
      { amount: 1_000_000, remaining: null },
      { amount: 50_000, remaining: null },
      { amount: 10_000, remaining: null },
    ],
    source: "public-compiled",
    theme: "high",
  },
  {
    number: 1364,
    name: "Jumbo Bucks Extravaganza",
    price: 50,
    topPrize: 5_000_000,
    odds: 2.76,
    tiers: [
      { amount: 5_000_000, remaining: null },
      { amount: 100_000, remaining: null },
      { amount: 20_000, remaining: null },
    ],
    source: "public-compiled",
    theme: "jumbo",
  },
];

const NAMED_FACES = new Set([
  1265, 1310, 1355, 1358, 1359, 1360, 1361, 1364, 1368, 1369, 1370, 1372, 1373,
  1376, 1386, 1856, 1990, 1996,
]);

export function ticketArt(game: Game): string {
  const namedOk = !game.stateId || game.stateId === "tn";
  if (namedOk && NAMED_FACES.has(game.number)) return `/tickets/${game.number}.jpg`;
  if (namedOk && game.number === 1315) return "/tickets/1370.jpg";
  if (game.theme === "crossword") return "/tickets/1856.jpg";
  if (game.theme === "frenzy") {
    if (game.price >= 20) return "/tickets/1360.jpg";
    if (game.price >= 10) return "/tickets/1359.jpg";
    return "/tickets/1358.jpg";
  }
  if (game.theme === "jumbo") {
    if (game.price >= 30) return "/tickets/1364.jpg";
    if (game.price >= 20) return "/tickets/1355.jpg";
    return "/tickets/1372.jpg";
  }
  if (game.theme === "multiplier") {
    if (game.price >= 20) return "/tickets/1370.jpg";
    if (game.price >= 10) return "/tickets/1369.jpg";
    return "/tickets/1368.jpg";
  }
  if (game.theme === "high") {
    if (game.price >= 30) return "/tickets/1310.jpg";
    if (game.price >= 10) return "/tickets/1386.jpg";
    return "/tickets/1996.jpg";
  }
  if (game.price >= 30) return "/tickets/1364.jpg";
  if (game.price >= 20) return "/tickets/1370.jpg";
  if (game.price >= 10) return "/tickets/1369.jpg";
  return "/tickets/1376.jpg";
}

export function hasNamedFace(game: Game): boolean {
  const namedOk = !game.stateId || game.stateId === "tn";
  return namedOk && NAMED_FACES.has(game.number);
}

export function money(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return m % 1 === 0 ? `$${m}M` : `$${m.toFixed(1)}M`;
  }
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString("en-US")}`;
}

export function moneyFull(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}


export type PostedRow = {
  amount: number;
  remaining: number | null;
  pool: number | null;
};

export type PostedBook = {
  topPool: number | null;
  knownPool: number;
  knownTiers: number;
  unpublishedTiers: number;
  rows: PostedRow[];
};

/** Dollar value still listed in published remaining-prize tiers. */
export function postedBook(game: Game): PostedBook {
  const rows: PostedRow[] = game.tiers.map((tier) => ({
    amount: tier.amount,
    remaining: tier.remaining,
    pool: tier.remaining == null ? null : tier.amount * tier.remaining,
  }));
  const known = rows.filter((row) => row.pool != null);
  return {
    topPool: rows[0]?.pool ?? null,
    knownPool: known.reduce((sum, row) => sum + (row.pool ?? 0), 0),
    knownTiers: known.length,
    unpublishedTiers: rows.length - known.length,
    rows,
  };
}

export function retailTopPool(topPrize: number, effectiveTop: number | null): number | null {
  if (effectiveTop == null) return null;
  return effectiveTop * topPrize;
}
