/**
 * Client-safe state catalogs. Remaining-prize overlays stay on the server.
 */
import { GAMES, type Game } from "@/data/games";
import {
  DEFAULT_STATE_ID,
  STATE_IDS,
  type StateId,
  parseStateId,
} from "@/config/states";
import { AZ_GAMES } from "./az";
import { CT_GAMES } from "./ct";
import { IA_GAMES } from "./ia";
import { ID_GAMES } from "./id";
import { IL_GAMES } from "./il";
import { KY_GAMES } from "./ky";
import { MA_GAMES } from "./ma";
import { MI_GAMES } from "./mi";
import { MO_GAMES } from "./mo";
import { NC_GAMES } from "./nc";
import { OH_GAMES } from "./oh";
import { OK_GAMES } from "./ok";
import { PA_GAMES } from "./pa";
import { SC_GAMES } from "./sc";
import { TX_GAMES } from "./tx";

const PUBLIC: Record<StateId, Game[]> = {
  tn: GAMES,
  ky: KY_GAMES,
  sc: SC_GAMES,
  ok: OK_GAMES,
  mi: MI_GAMES,
  az: AZ_GAMES,
  nc: NC_GAMES,
  pa: PA_GAMES,
  tx: TX_GAMES,
  mo: MO_GAMES,
  oh: OH_GAMES,
  il: IL_GAMES,
  ma: MA_GAMES,
  ia: IA_GAMES,
  id: ID_GAMES,
  ct: CT_GAMES,
};

export function publicCatalog(stateId: StateId | string | null | undefined): Game[] {
  const id = parseStateId(stateId);
  return PUBLIC[id].map((game) => ({ ...game, stateId: id }));
}

export function publicGameMatches(
  number: number | string,
): { game: Game; stateId: StateId }[] {
  const n = Number(number);
  if (!Number.isFinite(n)) return [];
  const matches: { game: Game; stateId: StateId }[] = [];
  for (const id of STATE_IDS) {
    const game = PUBLIC[id].find((row) => row.number === n);
    if (game) matches.push({ game: { ...game, stateId: id }, stateId: id });
  }
  return matches;
}

export function findPublicGame(
  number: number | string,
  preferred?: StateId | string | null,
): { game: Game; stateId: StateId } | null {
  const matches = publicGameMatches(number);
  if (!matches.length) return null;
  if (preferred) {
    const id = parseStateId(preferred);
    return matches.find((row) => row.stateId === id) ?? matches[0];
  }
  return matches[0];
}

export function defaultPublicCatalog(): Game[] {
  return publicCatalog(DEFAULT_STATE_ID);
}

export {
  AZ_GAMES,
  CT_GAMES,
  IA_GAMES,
  ID_GAMES,
  IL_GAMES,
  KY_GAMES,
  MA_GAMES,
  MI_GAMES,
  MO_GAMES,
  NC_GAMES,
  OH_GAMES,
  OK_GAMES,
  PA_GAMES,
  SC_GAMES,
  TX_GAMES,
};
