import type { PriceFilter } from "./heat";

const KEY = "vsv.desk.pricePref";

export function readPricePref(): PriceFilter | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (
      raw === "5" ||
      raw === "10" ||
      raw === "20" ||
      raw === "25" ||
      raw === "30" ||
      raw === "50"
    ) {
      return raw;
    }
    if (raw === "higher") return "25";
    return null;
  } catch {
    return null;
  }
}

export function writePricePref(filter: PriceFilter): void {
  if (typeof window === "undefined") return;
  if (filter === "all") return;
  try {
    window.localStorage.setItem(KEY, filter);
  } catch {
    /* ignore */
  }
}

export function pricePrefLabel(filter: PriceFilter | null): string | null {
  if (!filter || filter === "all") return null;
  return `$${filter}`;
}
