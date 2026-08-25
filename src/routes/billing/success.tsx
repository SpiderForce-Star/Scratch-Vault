import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { syncCheckoutSession } from "@/lib/billing";
import { grantsPaidAccess } from "@/lib/subscription";
import { CHECKOUT_PUBLIC } from "@/lib/stripe-errors";
import { pageHead } from "@/lib/site";

export const Route = createFileRoute("/billing/success")({
  validateSearch: (search: Record<string, unknown>) => ({
    session_id: typeof search.session_id === "string" ? search.session_id : "",
  }),
  component: SuccessPage,
  head: () =>
    pageHead({
      title: "You’re in",
      path: "/billing/success",
      noindex: true,
    }),
});

function SuccessPage() {
  const { session_id: sessionId } = Route.useSearch();
  const { user, isPending } = useCurrentUserState();
  const [status, setStatus] = useState<"idle" | "saving" | "ready" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [subStatus, setSubStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isPending || !user || !sessionId || user.isDevFallback) {
      if (!isPending && user && !sessionId) setStatus("ready");
      return;
    }
    setStatus("saving");
    void syncCheckoutSession({ data: { sessionId } })
      .then((result) => {
        const nextStatus = result?.status ?? null;
        setSubStatus(nextStatus);
        if (
          nextStatus &&
          !grantsPaidAccess({ subscriptionStatus: nextStatus, currentPeriodEnd: null })
        ) {
          setError(
            nextStatus === "incomplete" || nextStatus === "incomplete_expired"
              ? CHECKOUT_PUBLIC.failed
              : nextStatus === "past_due" || nextStatus === "unpaid"
                ? CHECKOUT_PUBLIC.declined
                : CHECKOUT_PUBLIC.failed,
          );
          setStatus("error");
          return;
        }
        setStatus("ready");
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : CHECKOUT_PUBLIC.failed;
        setError(
          msg === CHECKOUT_PUBLIC.network ||
            msg === CHECKOUT_PUBLIC.declined ||
            msg === CHECKOUT_PUBLIC.failed ||
            msg === CHECKOUT_PUBLIC.server ||
            msg.startsWith("Checkout") ||
            msg.startsWith("That checkout")
            ? msg
            : CHECKOUT_PUBLIC.failed,
        );
        setStatus("error");
      });
  }, [user, isPending, sessionId]);

  if (!isPending && !user) {
    return <Navigate to="/login" search={{ next: "/billing/success" }} />;
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
      <h1 className="font-display text-3xl tracking-tight">
        {status === "error" ? "We couldn’t confirm that payment" : "You’re in. Welcome to the full desk."}
      </h1>
      <p className="mt-4 text-muted">
        {status === "saving"
          ? "Confirming your checkout…"
          : status === "error"
            ? (error ?? CHECKOUT_PUBLIC.failed)
            : subStatus === "active"
              ? "Your subscription is active. You now have complete access to every ranking, heat score, and remaining-prize view."
              : subStatus === "trialing"
              ? "Your 7-day free trial has started. $4.99/month begins when the trial ends unless you opt out in your profile. No refunds."
              : "You now have complete access to every ranking, heat score, and remaining-prize view. No refunds. Opt out of the next charge in your profile."}
      </p>
      <Link
        to={status === "error" ? "/pricing" : "/"}
        className="mt-8 inline-flex min-h-12 items-center justify-center rounded-md bg-accent px-6 text-sm font-medium text-accent-fg"
      >
        {status === "error" ? "Back to pricing" : "Go to the desk"}
      </Link>
      <p className="mt-10 text-xs text-faint">
        Opt out of the next charge anytime from{" "}
        <Link to="/account" className="underline underline-offset-2">
          your account
        </Link>
        .
      </p>
    </div>
  );
}
