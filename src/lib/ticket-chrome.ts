import type { Game, TicketTheme } from "../data/games";

export type TicketPalette = {
  bg: string;
  bg2: string;
  foil: string;
  accent: string;
  ink: string;
};

export type TicketFamily =
  | "holiday"
  | "sevens"
  | "gold"
  | "crossword"
  | "loteria"
  | "wild"
  | "slots"
  | "sports"
  | "cash"
  | "multiplier"
  | "frenzy"
  | "high"
  | "hearts"
  | "currency";

export type SportsKind = "cowboys" | "texans" | "nascar" | "football";

/** One palette per pack — case-match color, not a photocopy. */
export const FAMILY_PALETTES: Record<TicketFamily, TicketPalette> = {
  holiday: { bg: "#6b1020", bg2: "#9a1c2c", foil: "#e8c872", accent: "#f0d48a", ink: "#fff4dc" },
  sevens: { bg: "#5a0810", bg2: "#c41428", foil: "#f4d48a", accent: "#ffcc44", ink: "#fff0d8" },
  gold: { bg: "#3a2a08", bg2: "#c8a010", foil: "#ffe89a", accent: "#f0c430", ink: "#fff6d0" },
  crossword: { bg: "#0f2a62", bg2: "#2f6fe0", foil: "#d8e6ff", accent: "#7eb4ff", ink: "#eef4ff" },
  loteria: { bg: "#7a1028", bg2: "#e8a020", foil: "#ffe8a0", accent: "#2ec4b6", ink: "#fff8e8" },
  wild: { bg: "#1c3a0c", bg2: "#5a7a18", foil: "#e8d48a", accent: "#c4a040", ink: "#f4ecd0" },
  slots: { bg: "#1a0818", bg2: "#6a1038", foil: "#f0d27a", accent: "#e8b020", ink: "#fff0d4" },
  sports: { bg: "#143018", bg2: "#2a6a28", foil: "#e8e0c8", accent: "#c4b48a", ink: "#f4f0e0" },
  cash: { bg: "#0d3b2c", bg2: "#1f8a58", foil: "#f0d27a", accent: "#e8b84a", ink: "#f6ead4" },
  multiplier: { bg: "#3a1468", bg2: "#7a38d4", foil: "#ead8ff", accent: "#c090ff", ink: "#f6ecff" },
  frenzy: { bg: "#7a1414", bg2: "#e02828", foil: "#ffd070", accent: "#ff9c20", ink: "#fff0d8" },
  high: { bg: "#1a1408", bg2: "#8a7040", foil: "#f0e0b0", accent: "#d4b06a", ink: "#f8f0dc" },
  hearts: { bg: "#5c1028", bg2: "#d43068", foil: "#ffd0dc", accent: "#ff6a98", ink: "#ffe8ee" },
  currency: { bg: "#1c2838", bg2: "#4a6888", foil: "#d8e4f0", accent: "#88a8c8", ink: "#eef4f8" },
};

/** Sports colors only — no team marks. */
export const SPORTS_PALETTES: Record<SportsKind, TicketPalette> = {
  cowboys: { bg: "#041e42", bg2: "#003594", foil: "#c8c8c8", accent: "#869397", ink: "#f4f6fa" },
  texans: { bg: "#03202f", bg2: "#a71930", foil: "#e8e8e8", accent: "#c45c4a", ink: "#f8f0ec" },
  nascar: { bg: "#101010", bg2: "#d4a017", foil: "#f0e0a0", accent: "#e8c040", ink: "#fff8e0" },
  football: { bg: "#143018", bg2: "#2a6a28", foil: "#e8e0c8", accent: "#c4b48a", ink: "#f4f0e0" },
};

export type TicketChrome = {
  state: string;
  number: number;
  name: string;
  price: number;
  topPrize: number;
  winUpTo: string;
  theme: TicketTheme;
  family: TicketFamily;
  palette: TicketPalette;
  sportsKind: SportsKind | null;
  sashAngle: number;
  extraCount: number;
  nudge: number;
  mark: string;
};

function fnv1a(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function stateCode(game: Game): string {
  const raw = (game.stateId ?? "tn").trim().toLowerCase();
  return raw || "tn";
}

function nameMark(name: string): string {
  const letters = name.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();
  return letters || "SV";
}

export function formatWinUpTo(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return m % 1 === 0 ? `$${m} MILLION` : `$${m.toFixed(1)} MILLION`;
  }
  return `$${n.toLocaleString("en-US")}`;
}

export function sportsKind(name: string): SportsKind | null {
  const n = name.toLowerCase();
  if (/cowboys/.test(n)) return "cowboys";
  if (/texans/.test(n)) return "texans";
  if (/nascar/.test(n)) return "nascar";
  if (/football/.test(n)) return "football";
  return null;
}

/**
 * Keyword packs beat generic multiplier/cash. First match wins.
 * Crossword/loteria beat gold so a jumbo crossword still reads as a grid.
 * Holiday beats multiplier (Merry Multiplier is crimson/gold, not a purple X).
 */
export function ticketFamily(name: string, theme: TicketTheme): TicketFamily {
  const n = name.toLowerCase();
  if (/\b(merry|holiday|christmas|jingle|santa|wreath|tree|snow|festive)\b/.test(n)) {
    return "holiday";
  }
  if (/7'?s\b|\bsevens?\b|lucky\s*7/.test(n)) return "sevens";
  if (/\b(crossword|cashword|bingo|slingo)\b/.test(n)) return "crossword";
  if (/\bloteria\b/.test(n)) return "loteria";
  if (/\b(jumbo|gold|24k|platinum|riches)\b/.test(n)) return "gold";
  if (/\b(wild|safari|animal|lion)\b/.test(n)) return "wild";
  if (/\b(slot|casino|poker|blackjack)s?\b/.test(n)) return "slots";
  if (/\b(cowboys|texans|football|nascar)\b/.test(n)) return "sports";
  if (/\b(50|100|200)\s*x\b|\bmultiplier\b|\btimes\b|\d+\s*x\b/.test(n)) return "multiplier";
  if (/\b(cash|money|payday|bank|wallet|dollar)\b/.test(n)) return "cash";
  if (/\b(frenzy|fever|blowout)\b|hit\s*\$/.test(n)) return "frenzy";
  if (/\b(million|mega|ultimate|max)\b/.test(n)) return "high";
  if (/\b(heart|queen|love|valentine)\b/.test(n)) return "hearts";
  if (/\b(lincoln|hamilton|jackson|washington|franklin|grant)\b/.test(n)) return "currency";
  if (theme === "crossword") return "crossword";
  if (theme === "jumbo") return "gold";
  if (theme === "frenzy") return "frenzy";
  if (theme === "multiplier") return "multiplier";
  if (theme === "high") return "high";
  return "cash";
}

/** Deterministic original chrome. Palette/motif from the pack; hash only nudges. */
export function ticketChrome(game: Game): TicketChrome {
  const state = stateCode(game);
  const family = ticketFamily(game.name, game.theme);
  const kind = family === "sports" ? sportsKind(game.name) ?? "football" : null;
  const palette = kind ? SPORTS_PALETTES[kind] : FAMILY_PALETTES[family];
  const seed = fnv1a(`${state}:${game.number}`);
  const sashAngle = (seed % 21) - 10;
  const extraCount = 3 + (seed % 4);
  const nudge = seed % 17;
  return {
    state,
    number: game.number,
    name: game.name,
    price: game.price,
    topPrize: game.topPrize,
    winUpTo: formatWinUpTo(game.topPrize),
    theme: game.theme,
    family,
    palette,
    sportsKind: kind,
    sashAngle,
    extraCount,
    nudge,
    mark: nameMark(game.name),
  };
}

/** Compact visual id so tests can prove two games do not share a face. */
export function ticketChromeFingerprint(game: Game): string {
  const c = ticketChrome(game);
  return [
    c.state,
    c.number,
    c.family,
    c.sportsKind ?? "",
    c.sashAngle,
    c.extraCount,
    c.nudge,
    c.theme,
    c.price,
    c.mark,
    c.name,
  ].join("|");
}
