/** Guest skip list: first two names are public, the rest teases Full Access. */
export const SKIP_TEASER_CLEAR = 2;

/** True when this skip row must hide the game name and route to pricing. */
export function skipNameLocked(index: number, paid: boolean): boolean {
  return !paid && index >= SKIP_TEASER_CLEAR;
}
