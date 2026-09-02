/**
 * Published Stripe Price IDs. Safe to import from client code.
 * Secret keys live only in stripe.server.ts / env.
 *
 * STRIPE_PRICES are the live Full Access prices (copied Aug 2026) for plan labels.
 * SANDBOX_STRIPE_PRICES stay for local/dev when using sk_test_ keys.
 * Live keys use env live IDs when set, otherwise these published live IDs.
 * A production env that still has sandbox IDs (copied from .env.example) is
 * rewritten to live IDs so checkout can start.
 * Monthly checkout trial is 7 days (see `TRIAL_PERIOD_DAYS`); set a matching
 * introductory offer on the monthly Price in the Stripe Dashboard.
 * Annual has no trial — $49.99 is billed immediately and auto-renews.
 */
export const STRIPE_PRICES = {
  monthly: "price_1U5t25RpUVJitDggbykPkMzh",
  annual: "price_1U5t25RpUVJitDggtSQ4Qfws",
} as const;

export const SANDBOX_STRIPE_PRICES = {
  monthly: "price_1U4uLH2OSSYBR9Vqdc9ZrFN2",
  annual: "price_1U4uLH2OSSYBR9VqEfITU1IV",
} as const;

export type Plan = keyof typeof STRIPE_PRICES;
export type StripeSecretMode = "live" | "test" | "unknown";

export function stripeSecretModeFromKey(secretKey: string): StripeSecretMode {
  const key = secretKey.trim();
  if (key.startsWith("sk_live_") || key.startsWith("rk_live_")) return "live";
  if (key.startsWith("sk_test_") || key.startsWith("rk_test_")) return "test";
  return "unknown";
}

/**
 * Resolve Checkout price IDs.
 * Live / unknown keys use env live IDs, or the published live IDs when env is
 * missing or still set to sandbox. Test keys may fall back to sandbox IDs and
 * refuse live IDs.
 */
export function resolveStripePrices(input: {
  mode: StripeSecretMode;
  monthly: string;
  annual: string;
}): { monthly: string; annual: string } {
  const monthly = input.monthly.trim();
  const annual = input.annual.trim();
  const sandboxIds = new Set<string>(Object.values(SANDBOX_STRIPE_PRICES));
  const liveIds = new Set<string>(Object.values(STRIPE_PRICES));

  if (input.mode !== "test") {
    return {
      monthly: !monthly || sandboxIds.has(monthly) ? STRIPE_PRICES.monthly : monthly,
      annual: !annual || sandboxIds.has(annual) ? STRIPE_PRICES.annual : annual,
    };
  }

  const resolved = {
    monthly: monthly || SANDBOX_STRIPE_PRICES.monthly,
    annual: annual || SANDBOX_STRIPE_PRICES.annual,
  };
  if (liveIds.has(resolved.monthly) || liveIds.has(resolved.annual)) {
    throw new Error("Test Stripe keys cannot use live price IDs");
  }
  return resolved;
}
