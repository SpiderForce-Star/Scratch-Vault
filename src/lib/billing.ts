import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "./auth/middleware";
import { optionalAuthMiddleware } from "./auth/optional";
import { grantsPaidAccess, type AccessState, type BillingSummary } from "./subscription";
import type { Plan } from "./stripe.prices";
import { TRIAL_PERIOD_DAYS } from "./trial";
import {
  CHECKOUT_CONSENT_MESSAGE,
} from "./billing-policy";
import {
  isStripeMissingResource,
  logStripe,
  publicCheckoutMessage,
  publicPortalMessage,
} from "./stripe-errors";

export type { AccessState, BillingSummary, Plan };

export const getAccessState = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .handler(async ({ context }): Promise<AccessState> => {
    if (!context.userId) {
      return { signedIn: false, paid: false, email: null, subscription: null };
    }
    const { loadUserBilling, accessFromRow } = await import("./subscription.server");
    const row = await loadUserBilling(context.userId);
    const access = accessFromRow(row, context.email);
    return {
      signedIn: true,
      paid: access.paid,
      email: access.email,
      subscription: access.subscription,
    };
  });

export const getBillingSummary = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<BillingSummary> => {
    const { buildBillingSummary } = await import("./subscription.server");
    return buildBillingSummary(context.userId, null);
  });

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid payload");
    }
    const plan = (data as { plan?: string }).plan;
    if (plan !== "monthly" && plan !== "annual") {
      throw new Error("plan must be 'monthly' or 'annual'");
    }
    return { plan: plan as Plan };
  })
  .handler(async ({ data, context }) => {
    try {
      const { getStripe, STRIPE_PRICES, requestOrigin, automaticTaxEnabled } =
        await import("./stripe.server");
      const { loadUserBilling } = await import("./subscription.server");
      const { loadBillingProfile } = await import("./profile.server");
      const { getRequest } = await import("@tanstack/react-start/server");

      const stripe = getStripe();
      const priceId = STRIPE_PRICES[data.plan];
      const row = await loadUserBilling(context.userId);
      const profile = await loadBillingProfile(context.userId);
      if (!profile.complete) {
        return {
          url: "/account?complete=1",
          alreadySubscribed: false as const,
          needsProfile: true as const,
        };
      }

      if (
        grantsPaidAccess({
          subscriptionStatus: row?.subscriptionStatus,
          currentPeriodEnd:
            row?.currentPeriodEnd instanceof Date
              ? row.currentPeriodEnd.toISOString()
              : (row?.currentPeriodEnd ?? null),
        })
      ) {
        return { url: "/account", alreadySubscribed: true as const };
      }

      const origin = requestOrigin(getRequest());
      const taxOn = automaticTaxEnabled();

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/pricing?checkout=canceled`,
        client_reference_id: context.userId,
        customer: row?.stripeCustomerId || undefined,
        customer_email: row?.stripeCustomerId ? undefined : (row?.email ?? undefined),
        customer_update: row?.stripeCustomerId
          ? { address: "auto", name: "auto" }
          : undefined,
        allow_promotion_codes: true,
        billing_address_collection: "required",
        payment_method_collection: "always",
        automatic_tax: taxOn ? { enabled: true } : undefined,
        consent_collection: {
          terms_of_service: "required",
        },
        custom_text: {
          submit: { message: CHECKOUT_CONSENT_MESSAGE },
          terms_of_service_acceptance: {
            message: CHECKOUT_CONSENT_MESSAGE,
          },
        },
        subscription_data: {
          ...(data.plan === "monthly"
            ? { trial_period_days: TRIAL_PERIOD_DAYS }
            : {}),
          description:
            data.plan === "annual"
              ? "Scratch Vault Full Access — $49.99/year, no refunds, auto-renews"
              : "Scratch Vault Full Access — 7-day trial then $4.99/month, no refunds",
          metadata: {
            plan: data.plan,
            userId: context.userId,
            product: "Scratch Vault Full Access",
          },
        },
        metadata: {
          plan: data.plan,
          userId: context.userId,
          product: "Scratch Vault Full Access",
        },
      });

      if (!session.url) {
        logStripe("checkout.missing_url", new Error("no session.url"), {
          userId: context.userId,
          plan: data.plan,
        });
        throw new Error(publicCheckoutMessage(new Error("no session.url")));
      }

      return { url: session.url, alreadySubscribed: false as const };
    } catch (err) {
      if (err instanceof Error && err.message === "Unauthorized") throw err;
      logStripe("checkout.create", err, { userId: context.userId, plan: data.plan });
      throw new Error(publicCheckoutMessage(err));
    }
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getStripe, requestOrigin } = await import("./stripe.server");
    const { loadUserBilling } = await import("./subscription.server");
    const { getRequest } = await import("@tanstack/react-start/server");

    try {
      const row = await loadUserBilling(context.userId);
      if (!row?.stripeCustomerId) {
        throw new Error("No billing customer on this account yet.");
      }
      const stripe = getStripe();
      const origin = requestOrigin(getRequest());
      const session = await stripe.billingPortal.sessions.create({
        customer: row.stripeCustomerId,
        return_url: `${origin}/account`,
      });
      if (!session.url) {
        throw new Error("Stripe did not return a portal URL");
      }
      return { url: session.url };
    } catch (err) {
      if (err instanceof Error && err.message === "Unauthorized") throw err;
      if (err instanceof Error && err.message.startsWith("No billing customer")) {
        throw err;
      }
      logStripe("portal.create", err, { userId: context.userId });
      throw new Error(publicPortalMessage(err));
    }
  });


export const setCancelAtPeriodEnd = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid payload");
    }
    const cancel = (data as { cancel?: unknown }).cancel;
    if (typeof cancel !== "boolean") {
      throw new Error("cancel must be a boolean");
    }
    return { cancel };
  })
  .handler(async ({ data, context }): Promise<BillingSummary> => {
    const { getStripe } = await import("./stripe.server");
    const { loadUserBilling, persistFromStripeSubscription, buildBillingSummary } =
      await import("./subscription.server");
    try {
      const row = await loadUserBilling(context.userId);
      if (!row?.subscriptionId) {
        throw new Error("No subscription on this account yet.");
      }
      const stripe = getStripe();
      const sub = await stripe.subscriptions.update(row.subscriptionId, {
        cancel_at_period_end: data.cancel,
      });
      await persistFromStripeSubscription({
        userId: context.userId,
        customerId:
          typeof sub.customer === "string"
            ? sub.customer
            : (sub.customer?.id ?? row.stripeCustomerId ?? ""),
        subscriptionId: sub.id,
        status: sub.status,
        priceId: sub.items.data[0]?.price.id ?? null,
        currentPeriodEnd: periodEndOf(sub),
        trialEnd: sub.trial_end,
      });
      return buildBillingSummary(context.userId, null);
    } catch (err) {
      if (err instanceof Error && err.message === "Unauthorized") throw err;
      if (err instanceof Error && err.message.startsWith("No subscription")) {
        throw err;
      }
      logStripe("subscription.cancel_toggle", err, { userId: context.userId });
      throw new Error(publicPortalMessage(err));
    }
  });

export const syncCheckoutSession = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid payload");
    }
    const sessionId = (data as { sessionId?: string }).sessionId;
    if (!sessionId || typeof sessionId !== "string") {
      throw new Error("sessionId is required");
    }
    if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
      throw new Error("Invalid checkout session");
    }
    return { sessionId };
  })
  .handler(async ({ data, context }) => {
    const { getStripe } = await import("./stripe.server");
    const { persistFromStripeSubscription } = await import("./subscription.server");

    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(data.sessionId, {
        expand: ["subscription"],
      });

      const owner = session.client_reference_id || session.metadata?.userId || null;
      if (owner && owner !== context.userId) {
        throw new Error("This checkout session belongs to a different account.");
      }

      if (session.status === "expired") {
        throw new Error("That checkout session expired. Start again from Pricing.");
      }

      const customerId = customerIdOf(session.customer);
      const subRaw = session.subscription;
      const sub =
        typeof subRaw === "string"
          ? await stripe.subscriptions.retrieve(subRaw)
          : subRaw;

      if (!customerId || !sub || typeof sub === "string") {
        throw new Error("Checkout did not finish. If you were charged, contact support.");
      }

      await persistFromStripeSubscription({
        userId: context.userId,
        customerId,
        subscriptionId: sub.id,
        status: sub.status,
        priceId: sub.items.data[0]?.price.id ?? null,
        currentPeriodEnd: periodEndOf(sub),
        trialEnd: sub.trial_end,
      });

      return { ok: true as const, status: sub.status };
    } catch (err) {
      if (err instanceof Error && err.message === "Unauthorized") throw err;
      if (
        err instanceof Error &&
        (err.message.startsWith("This checkout session") ||
          err.message.startsWith("That checkout session") ||
          err.message.startsWith("Checkout did not finish") ||
          err.message.startsWith("Invalid checkout") ||
          err.message.startsWith("sessionId"))
      ) {
        throw err;
      }
      logStripe("checkout.sync", err, { userId: context.userId });
      throw new Error(publicCheckoutMessage(err));
    }
  });

function customerIdOf(customer: unknown): string | null {
  if (typeof customer === "string" && customer) return customer;
  if (customer && typeof customer === "object" && "id" in customer) {
    const id = (customer as { id?: unknown }).id;
    return typeof id === "string" ? id : null;
  }
  return null;
}

/** Invoice.subscription moved under parent.subscription_details in 2025 APIs. */
export function invoiceSubscriptionId(invoice: {
  subscription?: unknown;
  parent?: { subscription_details?: { subscription?: unknown } };
}): string | null {
  const direct = invoice.subscription;
  if (typeof direct === "string" && direct) return direct;
  const nested = invoice.parent?.subscription_details?.subscription;
  if (typeof nested === "string" && nested) return nested;
  return null;
}

function periodEndOf(sub: unknown): number | null {
  if (!sub || typeof sub !== "object") return null;
  const rec = sub as {
    current_period_end?: number;
    trial_end?: number | null;
    items?: { data?: Array<{ current_period_end?: number }> };
  };
  return rec.current_period_end ?? rec.items?.data?.[0]?.current_period_end ?? rec.trial_end ?? null;
}

const HANDLED_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
  "invoice.paid",
]);

async function retrieveSubscription(subRef: unknown) {
  const { getStripe } = await import("./stripe.server");
  if (!subRef) return null;
  if (typeof subRef === "object" && subRef && "id" in subRef && "status" in subRef) {
    return subRef as Awaited<ReturnType<ReturnType<typeof getStripe>["subscriptions"]["retrieve"]>>;
  }
  if (typeof subRef !== "string") return null;
  try {
    return await getStripe().subscriptions.retrieve(subRef);
  } catch (err) {
    if (isStripeMissingResource(err)) {
      console.warn("[stripe] subscription not found", subRef);
      return null;
    }
    throw err;
  }
}

export async function handleStripeEvent(event: {
  id?: string;
  type: string;
  data: { object: Record<string, unknown> };
}): Promise<"handled" | "ignored"> {
  if (!HANDLED_EVENTS.has(event.type)) {
    console.info("[stripe] ignored event", event.type, event.id ?? "");
    return "ignored";
  }

  const { applyStripeSubscriptionObject, persistFromStripeSubscription } =
    await import("./subscription.server");

  if (event.type === "checkout.session.expired") {
    console.info("[stripe] checkout expired", event.id ?? "");
    return "handled";
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_failed"
  ) {
    const session = event.data.object as {
      client_reference_id?: string | null;
      metadata?: { userId?: string };
      customer?: unknown;
      subscription?: unknown;
      payment_status?: string;
    };
    const userId = session.client_reference_id || session.metadata?.userId || null;
    const customerId = customerIdOf(session.customer);
    if (!customerId) {
      console.warn("[stripe] checkout event missing customer", event.type, event.id ?? "");
      return "handled";
    }

    const sub = await retrieveSubscription(session.subscription);
    if (!sub) {
      console.warn("[stripe] checkout event missing subscription", event.type, event.id ?? "");
      return "handled";
    }

    const failed =
      event.type === "checkout.session.async_payment_failed" ||
      session.payment_status === "unpaid";
    await persistFromStripeSubscription({
      userId,
      customerId,
      subscriptionId: sub.id,
      status: failed
        ? sub.status === "active" || sub.status === "trialing"
          ? "past_due"
          : sub.status
        : sub.status,
      priceId: sub.items.data[0]?.price.id ?? null,
      currentPeriodEnd: periodEndOf(sub),
      trialEnd: sub.trial_end,
    });
    return "handled";
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const obj = event.data.object as {
      id?: string;
      customer?: unknown;
      status?: string;
    };
    if (!obj.id || !customerIdOf(obj.customer)) {
      console.warn("[stripe] subscription event missing customer", event.type, event.id ?? "");
      return "handled";
    }
    await applyStripeSubscriptionObject(
      event.data.object as Parameters<typeof applyStripeSubscriptionObject>[0],
    );
    return "handled";
  }

  if (event.type === "invoice.payment_failed" || event.type === "invoice.paid") {
    const invoice = event.data.object as {
      customer?: unknown;
      subscription?: unknown;
      parent?: { subscription_details?: { subscription?: unknown } };
    };
    const customerId = customerIdOf(invoice.customer);
    const subRef = invoiceSubscriptionId(invoice);
    if (!customerId || !subRef) {
      console.warn("[stripe] invoice event missing customer or subscription", event.type, event.id ?? "");
      return "handled";
    }
    const sub = await retrieveSubscription(subRef);
    if (!sub) return "handled";
    await persistFromStripeSubscription({
      userId: sub.metadata?.userId ?? null,
      customerId,
      subscriptionId: sub.id,
      status:
        event.type === "invoice.payment_failed"
          ? (sub.status === "active" || sub.status === "trialing"
              ? "past_due"
              : sub.status)
          : sub.status,
      priceId: sub.items.data[0]?.price.id ?? null,
      currentPeriodEnd: periodEndOf(sub),
      trialEnd: sub.trial_end,
    });
    return "handled";
  }

  return "ignored";
}
