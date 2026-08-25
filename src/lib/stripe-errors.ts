/** Safe client copy. Full Stripe payloads stay on the server log. */
export const CHECKOUT_PUBLIC = {
  canceled: "Checkout was canceled. You were not charged.",
  declined:
    "Your card was declined. Try another card or contact your bank.",
  failed: "Payment didn't go through. Please try again.",
  network:
    "We couldn't reach the payment service. Check your connection and try again.",
  server: "We couldn't start checkout. Please try again in a moment.",
  config: "Checkout isn't available right now. Please try again later.",
  portal: "We couldn't open billing. Please try again in a moment.",
} as const;

export function logStripe(scope: string, err: unknown, extra?: Record<string, unknown>): void {
  const stripe = stripeShape(err);
  console.error("[stripe]", scope, {
    ...extra,
    type: stripe?.type,
    code: stripe?.code,
    declineCode: stripe?.decline_code,
    statusCode: stripe?.statusCode,
    message: stripe?.message ?? (err instanceof Error ? err.message : String(err)),
  });
}

function stripeShape(err: unknown): {
  type?: string;
  code?: string;
  decline_code?: string;
  statusCode?: number;
  message?: string;
} | null {
  if (!err || typeof err !== "object") return null;
  const rec = err as {
    type?: unknown;
    code?: unknown;
    decline_code?: unknown;
    statusCode?: unknown;
    message?: unknown;
    rawType?: unknown;
  };
  if (
    rec.type !== "StripeCardError" &&
    rec.type !== "StripeInvalidRequestError" &&
    rec.type !== "StripeAPIError" &&
    rec.type !== "StripeConnectionError" &&
    rec.type !== "StripeAuthenticationError" &&
    rec.type !== "StripeRateLimitError" &&
    rec.type !== "StripeIdempotencyError" &&
    rec.rawType == null &&
    rec.code == null
  ) {
    return rec.message || rec.code ? { message: String(rec.message ?? ""), code: String(rec.code ?? "") } : null;
  }
  return {
    type: typeof rec.type === "string" ? rec.type : undefined,
    code: typeof rec.code === "string" ? rec.code : undefined,
    decline_code: typeof rec.decline_code === "string" ? rec.decline_code : undefined,
    statusCode: typeof rec.statusCode === "number" ? rec.statusCode : undefined,
    message: typeof rec.message === "string" ? rec.message : undefined,
  };
}

export function isStripeMissingResource(err: unknown): boolean {
  const s = stripeShape(err);
  return s?.code === "resource_missing";
}

export function isNetworkError(err: unknown): boolean {
  if (!err) return false;
  const s = stripeShape(err);
  if (s?.type === "StripeConnectionError") return true;
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("load failed") ||
    err.name === "TypeError"
  );
}

/** Map a checkout/portal failure to copy the browser may show. */
export function publicCheckoutMessage(err: unknown): string {
  if (isNetworkError(err)) return CHECKOUT_PUBLIC.network;
  const s = stripeShape(err);
  const code = (s?.code ?? "").toLowerCase();
  const decline = (s?.decline_code ?? "").toLowerCase();
  if (
    s?.type === "StripeCardError" ||
    code === "card_declined" ||
    decline === "generic_decline" ||
    decline === "insufficient_funds" ||
    decline === "lost_card" ||
    decline === "stolen_card" ||
    decline === "expired_card" ||
    code === "expired_card" ||
    code === "incorrect_cvc" ||
    code === "incorrect_number"
  ) {
    return CHECKOUT_PUBLIC.declined;
  }
  if (
    code === "resource_missing" ||
    (typeof s?.message === "string" && /price|product|no such/i.test(s.message))
  ) {
    return CHECKOUT_PUBLIC.config;
  }
  if (s?.type === "StripeRateLimitError") {
    return CHECKOUT_PUBLIC.server;
  }
  return CHECKOUT_PUBLIC.server;
}

export function publicPortalMessage(err: unknown): string {
  if (isNetworkError(err)) return CHECKOUT_PUBLIC.network;
  return CHECKOUT_PUBLIC.portal;
}
