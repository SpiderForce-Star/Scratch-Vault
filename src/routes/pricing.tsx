import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { createCheckoutSession } from "@/lib/billing";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useAccess } from "@/lib/use-access";
import { isNativeApp } from "@/lib/native";
import { purchasePlan, restoreNativePurchases } from "@/lib/iap";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { pageHead } from "@/lib/site";
import { CHECKOUT_PUBLIC, isNetworkError } from "@/lib/stripe-errors";
import { useI18n } from "@/lib/locale";

type CheckoutNotice = "canceled" | "failed" | "declined";

export const Route = createFileRoute("/pricing")({
  validateSearch: (search: Record<string, unknown>): { checkout?: CheckoutNotice } => {
    if (
      search.checkout === "canceled" ||
      search.checkout === "failed" ||
      search.checkout === "declined"
    ) {
      return { checkout: search.checkout };
    }
    if (search.canceled === "1" || search.canceled === true) {
      return { checkout: "canceled" };
    }
    return {};
  },
  component: PricingPage,
  head: () =>
    pageHead({
      title: "Pricing",
      description:
        "Scratch Vault Full Access. $4.99/month after a 7-day card-required trial, or $49.99/year billed now. No refunds. Opt out in your profile. 18+ to use; Arizona and Iowa lottery tickets are 21+. Independent remaining-prize desk. Not affiliated with any lottery.",
      path: "/pricing",
    }),
});

function checkoutClientMessage(err: unknown): string {
  if (isNetworkError(err)) return CHECKOUT_PUBLIC.network;
  const msg = err instanceof Error ? err.message : "";
  if (msg === "Unauthorized") return msg;
  if (msg === "Purchase canceled.") return CHECKOUT_PUBLIC.canceled;
  if (
    msg === CHECKOUT_PUBLIC.canceled ||
    msg === CHECKOUT_PUBLIC.declined ||
    msg === CHECKOUT_PUBLIC.failed ||
    msg === CHECKOUT_PUBLIC.network ||
    msg === CHECKOUT_PUBLIC.server ||
    msg === CHECKOUT_PUBLIC.config
  ) {
    return msg;
  }
  return CHECKOUT_PUBLIC.server;
}

function PricingPage() {
  const { checkout } = Route.useSearch();
  const { user, isPending } = useCurrentUserState();
  const { paid, isPending: accessPending } = useAccess();
  const [loading, setLoading] = useState<"monthly" | "annual" | "restore" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const native = isNativeApp();
  const { t } = useI18n();

  const startCheckout = async (plan: "monthly" | "annual") => {
    if (isPending || accessPending) return;
    setLoading(plan);
    setError(null);
    try {
      if (native) {
        const access = await purchasePlan(plan);
        if (access.paid) {
          window.location.href = "/";
          return;
        }
        setError(t("pricing.purchasePending"));
        setLoading(null);
        return;
      }
      if (!user) {
        window.location.href = `/login?next=${encodeURIComponent("/pricing")}`;
        return;
      }
      const result = await createCheckoutSession({ data: { plan } });
      if (result?.url) {
        window.location.href = result.url;
      } else {
        setError(t("pricing.checkoutFail"));
        setLoading(null);
      }
    } catch (err) {
      const message = checkoutClientMessage(err);
      if (err instanceof Error && err.message === "Unauthorized") {
        window.location.href = `/login?next=${encodeURIComponent("/pricing")}`;
        return;
      }
      if (message === CHECKOUT_PUBLIC.canceled) {
        setLoading(null);
        return;
      }
      setError(message);
      setLoading(null);
    }
  };

  const restore = async () => {
    setLoading("restore");
    setError(null);
    try {
      const access = await restoreNativePurchases();
      if (access.paid) {
        window.location.href = "/";
        return;
      }
      setError(t("pricing.restoreEmpty"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("pricing.restoreFailed"));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <p className="font-mono text-xs tracking-[0.16em] text-faint uppercase">
          {t("pricing.kicker")}
        </p>
        <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
          {t("pricing.title")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted">
          {t("pricing.lead")}
        </p>
      </div>

      {checkout === "canceled" ? (
        <p className="mt-6 text-center text-sm text-warm">{CHECKOUT_PUBLIC.canceled}</p>
      ) : null}
      {checkout === "declined" ? (
        <p className="mt-6 text-center text-sm text-bust">{CHECKOUT_PUBLIC.declined}</p>
      ) : null}
      {checkout === "failed" ? (
        <p className="mt-6 text-center text-sm text-bust">{CHECKOUT_PUBLIC.failed}</p>
      ) : null}

      {native ? (
        <p className="mt-6 text-center text-sm text-muted">
          {t("pricing.native")}
        </p>
      ) : null}

      {paid ? (
        <p className="mt-6 text-center text-sm text-hot">
          {t("pricing.unlocked")}{" "}
          <Link to="/account" className="underline underline-offset-2">
            {t("pricing.manage")}
          </Link>
        </p>
      ) : null}

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-gold bg-surface p-6 ring-1 ring-gold/30 sm:order-2">
          <p className="font-mono text-xs tracking-wide text-gold uppercase">
            {t("pricing.annual")}
          </p>
          <p className="mt-2 font-display text-3xl">
            $49.99<span className="text-lg text-muted">{t("pricing.perYear")}</span>
          </p>
          <p className="mt-1 text-sm text-muted">{t("pricing.annualCard")}</p>
          <button
            type="button"
            disabled={loading !== null || paid}
            onClick={() => startCheckout("annual")}
            className="mt-8 flex min-h-12 w-full items-center justify-center rounded-md bg-gold px-4 text-sm font-medium text-accent-fg disabled:opacity-60"
          >
            {loading === "annual" ? t("pricing.startingAnnual") : t("cta.annual")}
          </button>
        </div>

        <div className="rounded-xl border border-line bg-surface p-6 sm:order-1">
          <p className="font-mono text-xs tracking-wide text-faint uppercase">
            {t("pricing.monthly")}
          </p>
          <p className="mt-2 font-display text-3xl">
            $4.99<span className="text-lg text-muted">{t("pricing.perMo")}</span>
          </p>
          <p className="mt-1 text-sm text-muted">{t("pricing.trialCard")}</p>
          <button
            type="button"
            disabled={loading !== null || paid}
            onClick={() => startCheckout("monthly")}
            className="mt-8 flex min-h-12 w-full items-center justify-center rounded-md border border-line px-4 text-sm text-paper disabled:opacity-60"
          >
            {loading === "monthly" ? t("pricing.starting") : t("cta.trial")}
          </button>
        </div>
      </div>

      <ul className="mx-auto mt-8 max-w-md space-y-1 text-center text-sm text-muted">
        <li>{t("pricing.featHeat")}</li>
        <li>{t("pricing.featSkip")}</li>
        <li>{t("pricing.featRadar")}</li>
      </ul>

      {error && (
        <p className="mt-6 text-center text-sm text-bust">{error}</p>
      )}

      <p className="mx-auto mt-8 max-w-md text-center text-xs leading-relaxed text-faint">
        {t("pricing.agree")}{" "}
        <Link to="/terms" className="underline underline-offset-2 hover:text-fg">
          {t("footer.terms")}
        </Link>{" "}
        {t("pricing.and")}{" "}
        <Link
          to="/privacy"
          className="underline underline-offset-2 hover:text-fg"
        >
          {t("pricing.privacyPolicy")}
        </Link>
        . {t("pricing.only18")}
      </p>

      {native ? (
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => void restore()}
          className="mx-auto mt-6 flex min-h-11 items-center justify-center text-sm text-muted underline underline-offset-2 hover:text-fg disabled:opacity-60"
        >
          {loading === "restore" ? t("pricing.restoring") : t("pricing.restore")}
        </button>
      ) : null}

      <section className="mx-auto mt-16 max-w-2xl">
        <h2 className="font-display text-2xl tracking-tight">{t("pricing.faqTitle")}</h2>
        <Accordion type="single" collapsible className="mt-4">
          <AccordionItem value="trial">
            <AccordionTrigger>{t("pricing.faqTrialQ")}</AccordionTrigger>
            <AccordionContent>{t("pricing.faqTrialA")}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="cancel">
            <AccordionTrigger>{t("pricing.faqCancelQ")}</AccordionTrigger>
            <AccordionContent>{t("pricing.faqCancelA")}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="includes">
            <AccordionTrigger>{t("pricing.faqIncludesQ")}</AccordionTrigger>
            <AccordionContent>{t("pricing.faqIncludesA")}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="lottery">
            <AccordionTrigger>{t("pricing.faqLotteryQ")}</AccordionTrigger>
            <AccordionContent>{t("pricing.faqLotteryA")}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="age">
            <AccordionTrigger>{t("pricing.faqAgeQ")}</AccordionTrigger>
            <AccordionContent>{t("pricing.faqAgeA")}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="refunds">
            <AccordionTrigger>{t("pricing.faqRefundsQ")}</AccordionTrigger>
            <AccordionContent>{t("pricing.faqRefundsA")}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="optout">
            <AccordionTrigger>{t("pricing.faqOptQ")}</AccordionTrigger>
            <AccordionContent>{t("pricing.faqOptA")}</AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <p className="mt-10 text-center text-xs text-faint">{t("pricing.foot")}</p>
    </div>
  );
}
