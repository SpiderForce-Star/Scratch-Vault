import type { Game, GameSource, TicketTheme } from "@/data/games";

/** Remaining overlay aligned to published prize tiers (top first). */
export type RemainingRow = readonly (number | null)[];

export type CompiledDraft = {
  number: number;
  name: string;
  price: 5 | 10 | 20 | 25 | 30 | 50;
  topPrize: number;
  odds: number;
  tiers: { amount: number }[];
  source?: GameSource;
  theme?: TicketTheme;
};

/** Public catalog row — remaining stays null until the server overlay. */
export function compiledGame(draft: CompiledDraft): Game {
  return {
    number: draft.number,
    name: draft.name,
    price: draft.price,
    topPrize: draft.topPrize,
    odds: draft.odds,
    source: draft.source ?? "official-remaining",
    theme: draft.theme ?? "cash",
    tiers: draft.tiers.map((tier) => ({ amount: tier.amount, remaining: null })),
  };
}
