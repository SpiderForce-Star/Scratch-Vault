import { SANDBOX_STRIPE_PRICES, STRIPE_PRICES } from "./stripe.prices";

/** Stripe subscription statuses that unlock the full desk. */
export const PAID_STATUSES = ["trialing", "active"] as const;

export type PaidStatus = (typeof PAID_STATUSES)[number];
export type Plan = "monthly" | "annual";

export type SubscriptionRow = {
  stripeCustomerId: string | null;
  subscriptionStatus: string | null;
  subscriptionPriceId: string | null;
  subscriptionId: string | null;
  currentPeriodEnd: string | null;
};

export type AccessState = {
  signedIn: boolean;
  paid: boolean;
  email: string | null;
  subscription: SubscriptionRow | null;
};

export type BillingSummary = {
  signedIn: boolean;
  paid: boolean;
  email: string | null;
  plan: Plan | null;
  status: string | null;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasCustomer: boolean;
};

const UNPAID_STATUSES = new Set([
  "past_due",
  "unpaid",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "paused",
]);

export function isPaidStatus(status: string | null | undefined): boolean {
  return status === "trialing" || status === "active";
}

/** Fail closed: only trialing/active, and not clearly expired. */
export function grantsPaidAccess(input: {
  subscriptionStatus?: string | null;
  currentPeriodEnd?: string | null;
} | null | undefined): boolean {
  if (!input) return false;
  const status = input.subscriptionStatus ?? null;
  if (!isPaidStatus(status) || UNPAID_STATUSES.has(status ?? "")) return false;
  const end = input.currentPeriodEnd;
  if (!end) return true;
  const t = Date.parse(end);
  if (!Number.isFinite(t)) return true;
  return t + 36 * 60 * 60 * 1000 > Date.now();
}

export function subscriptionStatusKey(
  status: string | null | undefined,
):
  | "billing.pastDue"
  | "billing.unpaid"
  | "billing.canceled"
  | "billing.incomplete"
  | "billing.paused"
  | null {
  if (status === "past_due") return "billing.pastDue";
  if (status === "unpaid") return "billing.unpaid";
  if (status === "canceled") return "billing.canceled";
  if (status === "incomplete" || status === "incomplete_expired") {
    return "billing.incomplete";
  }
  if (status === "paused") return "billing.paused";
  return null;
}

export function subscriptionStatusCopy(status: string | null | undefined): string | null {
  const key = subscriptionStatusKey(status);
  if (key === "billing.pastDue") {
    return "Payment is past due. Update your card to keep Full Access.";
  }
  if (key === "billing.unpaid") {
    return "This subscription is unpaid. Update billing to restore Full Access.";
  }
  if (key === "billing.canceled") {
    return "This subscription is canceled. Start a new plan to unlock the desk.";
  }
  if (key === "billing.incomplete") {
    return "Checkout did not finish. Start again from Pricing.";
  }
  if (key === "billing.paused") {
    return "This subscription is paused. Full Access is locked until it resumes.";
  }
  return null;
}

export function planFromPriceId(
  priceId: string | null | undefined,
  catalog?: { monthly: string; annual: string },
): Plan | null {
  if (!priceId) return null;
  if (
    priceId === catalog?.monthly ||
    priceId === STRIPE_PRICES.monthly ||
    priceId === SANDBOX_STRIPE_PRICES.monthly
  ) {
    return "monthly";
  }
  if (
    priceId === catalog?.annual ||
    priceId === STRIPE_PRICES.annual ||
    priceId === SANDBOX_STRIPE_PRICES.annual
  ) {
    return "annual";
  }
  return null;
}

export function planLabel(plan: Plan | null): string {
  if (plan === "annual") return "Annual";
  if (plan === "monthly") return "Monthly";
  return "None";
}

export function formatBillingDate(
  iso: string | null | undefined,
  locale = "en-US",
): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
