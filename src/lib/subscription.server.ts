import { getSql } from "./db";
import {
  grantsPaidAccess,
  planFromPriceId,
  type BillingSummary,
  type SubscriptionRow,
} from "./subscription";
import { getStripe, getStripePrices, unixToIso } from "./stripe.server";

type UserBillingRow = {
  email: string | null;
  name: string | null;
  stripeCustomerId: string | null;
  subscriptionStatus: string | null;
  subscriptionPriceId: string | null;
  subscriptionId: string | null;
  currentPeriodEnd: string | Date | null;
};

function toIso(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function asRow(row: UserBillingRow | undefined): SubscriptionRow | null {
  if (!row) return null;
  return {
    stripeCustomerId: row.stripeCustomerId ?? null,
    subscriptionStatus: row.subscriptionStatus ?? null,
    subscriptionPriceId: row.subscriptionPriceId ?? null,
    subscriptionId: row.subscriptionId ?? null,
    currentPeriodEnd: toIso(row.currentPeriodEnd),
  };
}

export async function loadUserBilling(userId: string): Promise<UserBillingRow | null> {
  const sql = await getSql();
  const rows = await sql.query<UserBillingRow>(
    `select email, name,
            "stripeCustomerId" as "stripeCustomerId",
            "subscriptionStatus" as "subscriptionStatus",
            "subscriptionPriceId" as "subscriptionPriceId",
            "subscriptionId" as "subscriptionId",
            "currentPeriodEnd" as "currentPeriodEnd"
       from "user"
      where id = $1`,
    [userId],
  );
  return rows[0] ?? null;
}

export async function persistSubscription(params: {
  userId?: string | null;
  stripeCustomerId: string;
  subscriptionId: string | null;
  subscriptionStatus: string;
  subscriptionPriceId: string | null;
  currentPeriodEnd: string | null;
}): Promise<void> {
  const sql = await getSql();
  if (params.userId) {
    await sql.query(
      `update "user"
          set "stripeCustomerId" = $1,
              "subscriptionStatus" = $2,
              "subscriptionPriceId" = $3,
              "subscriptionId" = $4,
              "currentPeriodEnd" = $5,
              "updatedAt" = CURRENT_TIMESTAMP
        where id = $6`,
      [
        params.stripeCustomerId,
        params.subscriptionStatus,
        params.subscriptionPriceId,
        params.subscriptionId,
        params.currentPeriodEnd,
        params.userId,
      ],
    );
    return;
  }
  await sql.query(
    `update "user"
        set "subscriptionStatus" = $2,
            "subscriptionPriceId" = $3,
            "subscriptionId" = $4,
            "currentPeriodEnd" = $5,
            "updatedAt" = CURRENT_TIMESTAMP
      where "stripeCustomerId" = $1`,
    [
      params.stripeCustomerId,
      params.subscriptionStatus,
      params.subscriptionPriceId,
      params.subscriptionId,
      params.currentPeriodEnd,
    ],
  );
}

export async function persistFromStripeSubscription(input: {
  userId?: string | null;
  customerId: string;
  subscriptionId: string | null;
  status: string;
  priceId?: string | null;
  currentPeriodEnd?: number | null;
  trialEnd?: number | null;
}): Promise<void> {
  const period =
    input.status === "trialing"
      ? unixToIso(input.trialEnd ?? input.currentPeriodEnd)
      : unixToIso(input.currentPeriodEnd ?? input.trialEnd);
  await persistSubscription({
    userId: input.userId,
    stripeCustomerId: input.customerId,
    subscriptionId: input.subscriptionId,
    subscriptionStatus: input.status,
    subscriptionPriceId: input.priceId ?? null,
    currentPeriodEnd: period,
  });
}

function periodEndFromSub(sub: unknown): number | null {
  if (!sub || typeof sub !== "object") return null;
  const rec = sub as {
    current_period_end?: number;
    trial_end?: number | null;
    items?: { data?: Array<{ current_period_end?: number }> };
  };
  return rec.current_period_end ?? rec.items?.data?.[0]?.current_period_end ?? rec.trial_end ?? null;
}

export async function applyStripeSubscriptionObject(sub: {
  id: string;
  status: string;
  customer: string | { id: string };
  trial_end?: number | null;
  current_period_end?: number;
  items?: {
    data?: Array<{
      current_period_end?: number;
      price?: { id?: string };
    }>;
  };
  metadata?: Record<string, string>;
}): Promise<void> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) {
    console.warn("[stripe] subscription object missing customer", sub.id);
    return;
  }
  await persistFromStripeSubscription({
    userId: sub.metadata?.userId ?? null,
    customerId,
    subscriptionId: sub.id,
    status: sub.status,
    priceId: sub.items?.data?.[0]?.price?.id ?? null,
    currentPeriodEnd: periodEndFromSub(sub),
    trialEnd: sub.trial_end,
  });
}

/** Claim a Stripe event id. Returns false if this delivery is a duplicate. */
export async function claimStripeEvent(id: string, type: string): Promise<boolean> {
  if (!id) return true;
  const sql = await getSql();
  const rows = await sql.query<{ id: string }>(
    `insert into stripe_event (id, type)
     values ($1, $2)
     on conflict (id) do nothing
     returning id`,
    [id, type],
  );
  return rows.length > 0;
}

/** Drop a claimed event so Stripe can retry after a handler failure. */
export async function releaseStripeEvent(id: string): Promise<void> {
  if (!id) return;
  const sql = await getSql();
  await sql.query(`delete from stripe_event where id = $1`, [id]);
}

export function accessFromRow(
  row: UserBillingRow | null,
  email: string | null,
): { paid: boolean; subscription: SubscriptionRow | null; email: string | null } {
  const subscription = asRow(row ?? undefined);
  return {
    paid: grantsPaidAccess(subscription),
    subscription,
    email: row?.email ?? email,
  };
}

export async function buildBillingSummary(
  userId: string,
  email: string | null,
): Promise<BillingSummary> {
  const row = await loadUserBilling(userId);
  const base: BillingSummary = {
    signedIn: true,
    paid: grantsPaidAccess({
      subscriptionStatus: row?.subscriptionStatus,
      currentPeriodEnd: toIso(row?.currentPeriodEnd),
    }),
    email: row?.email ?? email,
    plan: planFromPriceId(row?.subscriptionPriceId, getStripePrices()),
    status: row?.subscriptionStatus ?? null,
    trialEnd: row?.subscriptionStatus === "trialing" ? toIso(row?.currentPeriodEnd) : null,
    currentPeriodEnd: toIso(row?.currentPeriodEnd),
    cancelAtPeriodEnd: false,
    hasCustomer: Boolean(row?.stripeCustomerId),
  };

  if (!row?.subscriptionId) return base;

  try {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(row.subscriptionId);
    const period = periodEndFromSub(sub);
    return {
      signedIn: true,
      paid: grantsPaidAccess({
        subscriptionStatus: sub.status,
        currentPeriodEnd: unixToIso(period),
      }),
      email: base.email,
      plan: planFromPriceId(sub.items.data[0]?.price.id, getStripePrices()) ?? base.plan,
      status: sub.status,
      trialEnd: unixToIso(sub.trial_end),
      currentPeriodEnd: unixToIso(period),
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      hasCustomer: true,
    };
  } catch (err) {
    const { isStripeMissingResource, logStripe } = await import("./stripe-errors");
    logStripe("billing.refresh_subscription", err, { userId });
    if (isStripeMissingResource(err)) {
      return { ...base, paid: false, status: row?.subscriptionStatus ?? "canceled" };
    }
    return { ...base, paid: false };
  }
}
