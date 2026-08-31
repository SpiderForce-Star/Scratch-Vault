import type { Game, TicketTheme } from "../data/games";

export const TICKET_PATTERNS = [
  "stripes",
  "diamonds",
  "burst",
  "dots",
  "chevrons",
  "bands",
  "hex",
  "arcs",
] as const;

export type TicketPattern = (typeof TICKET_PATTERNS)[number];

export type TicketPalette = {
  bg: string;
  bg2: string;
  foil: string;
  accent: string;
  ink: string;
};

/** Original Scratch Vault stock — not lottery art. Distinct jewel/foil sets. */
export const TICKET_PALETTES: readonly TicketPalette[] = [
  { bg: "#0d3b2c", bg2: "#1f8a58", foil: "#f0d27a", accent: "#e8b84a", ink: "#f6ead4" },
  { bg: "#6b1020", bg2: "#d4223c", foil: "#f4d48a", accent: "#f0b020", ink: "#fff0d8" },
  { bg: "#0f2a62", bg2: "#2f6fe0", foil: "#d8e6ff", accent: "#7eb4ff", ink: "#eef4ff" },
  { bg: "#3a1468", bg2: "#7a38d4", foil: "#ead8ff", accent: "#c090ff", ink: "#f6ecff" },
  { bg: "#5a2a0c", bg2: "#d46a18", foil: "#ffd8a0", accent: "#f0a040", ink: "#fff0dc" },
  { bg: "#0a3c3c", bg2: "#18a090", foil: "#c8fff0", accent: "#40e0c8", ink: "#e8fff8" },
  { bg: "#5c1028", bg2: "#d43068", foil: "#ffd0dc", accent: "#ff6a98", ink: "#ffe8ee" },
  { bg: "#1c3a0c", bg2: "#5aa018", foil: "#e8ff9c", accent: "#b4e038", ink: "#f4ffd4" },
  { bg: "#142848", bg2: "#3a68b0", foil: "#d0e4ff", accent: "#68a0e8", ink: "#e8f0ff" },
  { bg: "#0c4a28", bg2: "#1cb868", foil: "#d4ffc0", accent: "#48e888", ink: "#e8ffe8" },
  { bg: "#5a1038", bg2: "#e03890", foil: "#ffd0e8", accent: "#ff68b8", ink: "#ffe8f4" },
  { bg: "#4a3c08", bg2: "#c8a010", foil: "#ffe89a", accent: "#f0c430", ink: "#fff6d0" },
  { bg: "#0c3848", bg2: "#1890b8", foil: "#c8f0ff", accent: "#40c8e8", ink: "#e4f8ff" },
  { bg: "#6a2010", bg2: "#e05020", foil: "#ffd0b0", accent: "#ff7840", ink: "#ffece0" },
  { bg: "#2c1460", bg2: "#6830c8", foil: "#e0c8ff", accent: "#a068ff", ink: "#f4e8ff" },
  { bg: "#2c4010", bg2: "#78a018", foil: "#e8f0a0", accent: "#c0d040", ink: "#f4f8d8" },
  { bg: "#2a2418", bg2: "#8a7040", foil: "#f0e0b0", accent: "#d4b06a", ink: "#f8f0dc" },
  { bg: "#6a0814", bg2: "#e01830", foil: "#ffc8c0", accent: "#ff4058", ink: "#ffe8e4" },
  { bg: "#0c4038", bg2: "#20a888", foil: "#c0ffe8", accent: "#38d4b0", ink: "#e4fff4" },
  { bg: "#6a3008", bg2: "#e87810", foil: "#ffd890", accent: "#ff9c20", ink: "#fff0d0" },
  { bg: "#1c2838", bg2: "#4a6888", foil: "#d8e4f0", accent: "#88a8c8", ink: "#eef4f8" },
  { bg: "#501018", bg2: "#b82840", foil: "#ffc8d0", accent: "#e85068", ink: "#ffe8ec" },
  { bg: "#081848", bg2: "#2048c8", foil: "#c8d8ff", accent: "#5080ff", ink: "#e8eeff" },
  { bg: "#143028", bg2: "#2a8860", foil: "#c8f0d8", accent: "#48c890", ink: "#e4f8ec" },
];

export type TicketChrome = {
  state: string;
  number: number;
  name: string;
  price: number;
  theme: TicketTheme;
  palette: TicketPalette;
  paletteIndex: number;
  sash: TicketPalette;
  sashIndex: number;
  pattern: TicketPattern;
  rotate: number;
  phase: number;
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

/** Deterministic original chrome for one game. Keyed by state + number. */
export function ticketChrome(game: Game): TicketChrome {
  const state = stateCode(game);
  const seed = fnv1a(`${state}:${game.number}:${game.theme}:${game.price}`);
  const n = TICKET_PALETTES.length;
  const paletteIndex = (game.number * 7 + (seed % 13) + state.charCodeAt(0) * 11) % n;
  const sashIndex = (paletteIndex + 7 + (seed % 5) + game.price) % n;
  const patternIndex = (game.number * 3 + (seed >>> 8) + state.length * 5) % TICKET_PATTERNS.length;
  const rotate = ((seed >>> 16) % 21) - 10;
  const phase = (game.number * 11 + (seed >>> 4)) % 48;
  return {
    state,
    number: game.number,
    name: game.name,
    price: game.price,
    theme: game.theme,
    palette: TICKET_PALETTES[paletteIndex]!,
    paletteIndex,
    sash: TICKET_PALETTES[sashIndex]!,
    sashIndex,
    pattern: TICKET_PATTERNS[patternIndex]!,
    rotate,
    phase,
    mark: nameMark(game.name),
  };
}

/** Compact visual id so tests can prove two games do not share a face. */
export function ticketChromeFingerprint(game: Game): string {
  const c = ticketChrome(game);
  return [
    c.state,
    c.number,
    c.paletteIndex,
    c.sashIndex,
    c.pattern,
    c.rotate,
    c.phase,
    c.theme,
    c.price,
    c.mark,
  ].join("|");
}
