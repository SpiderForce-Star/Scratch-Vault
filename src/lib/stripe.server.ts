import Stripe from "stripe";
import {
  resolveStripePrices,
  stripeSecretModeFromKey,
  type Plan,
  type StripeSecretMode,
} from "./stripe.prices";

export type { Plan, StripeSecretMode };

/**
 * Server-only Stripe client.
 * Uses the Secret key from environment variables.
 */
export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(secretKey, {
    apiVersion: "2025-02-24.acacia",
    typescript: true,
  });
}

export function stripeSecretMode(): StripeSecretMode {
  return stripeSecretModeFromKey(process.env.STRIPE_SECRET_KEY ?? "");
}

function envPrice(name: "STRIPE_PRICE_MONTHLY" | "STRIPE_PRICE_ANNUAL"): string {
  return process.env[name]?.trim() ?? "";
}

/**
 * Resolve monthly/annual Price IDs at call time.
 * Live keys require env price IDs and refuse sandbox IDs.
 * Test keys use env or the sandbox IDs and refuse live IDs.
 */
export function getStripePrices(): { monthly: string; annual: string } {
  return resolveStripePrices({
    mode: stripeSecretMode(),
    monthly: envPrice("STRIPE_PRICE_MONTHLY"),
    annual: envPrice("STRIPE_PRICE_ANNUAL"),
  });
}

/** Live getters so module-load env timing cannot pin sandbox fallbacks. */
export const STRIPE_PRICES = {
  get monthly() {
    return getStripePrices().monthly;
  },
  get annual() {
    return getStripePrices().annual;
  },
};

export function automaticTaxEnabled(): boolean {
  const raw = process.env.STRIPE_AUTOMATIC_TAX?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function appOrigin(): string {
  return (
    process.env.BETTER_AUTH_URL?.trim() ||
    process.env.VITE_APP_URL?.trim() ||
    "https://volunteer-scratch-vault.vercel.app"
  );
}

function hostOf(value: string): string | null {
  try {
    const url = value.includes("://") ? new URL(value) : new URL(`https://${value}`);
    return url.host.split(":")[0].toLowerCase();
  } catch {
    return null;
  }
}

function allowedHosts(): Set<string> {
  const hosts = new Set<string>(["volunteer-scratch-vault.vercel.app"]);
  for (const raw of [
    process.env.BETTER_AUTH_URL,
    process.env.VITE_APP_URL,
    process.env.ALLOWED_CHECKOUT_HOSTS,
  ]) {
    if (!raw) continue;
    for (const part of raw.split(",")) {
      const host = hostOf(part.trim());
      if (host) hosts.add(host);
    }
  }
  return hosts;
}

/** Checkout return URLs may only point at this app — never a caller-supplied host. */
export function requestOrigin(request?: Request | null): string {
  const fallback = appOrigin();
  if (!request) return fallback;
  try {
    const url = new URL(request.url);
    const forwarded = (
      request.headers.get("x-forwarded-host") ??
      request.headers.get("host") ??
      url.host
    )
      .split(",")[0]
      .trim();
    const host = hostOf(forwarded);
    if (!host || !allowedHosts().has(host)) return fallback;
    return `https://${host}`;
  } catch {
    return fallback;
  }
}

export function unixToIso(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000).toISOString();
}

export function isStripeCheckoutSessionId(id: string): boolean {
  return /^cs_(test|live)_[A-Za-z0-9]+$/.test(id);
}
