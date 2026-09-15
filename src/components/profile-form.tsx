import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { createCheckoutSession } from "@/lib/billing";
import { getBillingProfile, saveBillingProfile } from "@/lib/profile-api";
import {
  PROFILE_HOME_STATES,
  homeStateLabel,
  type BillingProfile,
} from "@/lib/profile";
import { useI18n } from "@/lib/locale";
import type { MessageKey } from "@/lib/i18n";

function profileErr(
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
  err: unknown,
  fallback: MessageKey,
): string {
  const msg = err instanceof Error ? err.message : "";
  if (msg.startsWith("profile.err")) return t(msg as MessageKey);
  return t(fallback);
}

export function ProfileForm({
  onSaved,
  highlight,
  plan = "monthly",
}: {
  onSaved?: (profile: BillingProfile) => void;
  highlight?: boolean;
  plan?: "monthly" | "annual";
}) {
  const { t } = useI18n();
  const [legalName, setLegalName] = useState("");
  const [dob, setDob] = useState("");
  const [homeState, setHomeState] = useState<(typeof PROFILE_HOME_STATES)[number] | "">(
    "",
  );
  const [ageAttested, setAgeAttested] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [noRefundsAccepted, setNoRefundsAccepted] = useState(false);
  const [billingConsent, setBillingConsent] = useState(false);
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const startCard = async () => {
    setBusy(true);
    setCheckoutBusy(true);
    setError(null);
    try {
      const result = await createCheckoutSession({ data: { plan } });
      if (result?.alreadySubscribed) {
        window.location.assign("/account");
        return;
      }
      if (result?.needsProfile) {
        setError(t("profile.needSave"));
        return;
      }
      if (result?.url) {
        window.location.assign(result.url);
        return;
      }
      setError(t("pricing.checkoutFail"));
    } catch (err) {
      setError(profileErr(t, err, "pricing.checkoutFail"));
    } finally {
      setCheckoutBusy(false);
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!highlight || !loaded) return;
    document
      .getElementById("account-profile")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [highlight, loaded]);

  useEffect(() => {
    let cancelled = false;
    void getBillingProfile()
      .then((profile) => {
        if (cancelled) return;
        setLegalName(profile.legalName ?? "");
        setDob(profile.dob ?? "");
        setHomeState(profile.homeState ?? "");
        setAgeAttested(Boolean(profile.ageAttestedAt));
        setTermsAccepted(Boolean(profile.termsAcceptedAt));
        setNoRefundsAccepted(Boolean(profile.noRefundsAcceptedAt));
        setBillingConsent(Boolean(profile.billingConsentAt));
        setComplete(profile.complete);
        setLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(profileErr(t, err, "profile.loadFail"));
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!homeState) {
      setError(t("profile.selectState"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const profile = await saveBillingProfile({
        data: {
          legalName,
          dob,
          homeState,
          ageAttested,
          termsAccepted,
          noRefundsAccepted,
          billingConsent,
        },
      });
      setComplete(profile.complete);
      onSaved?.(profile);
      if (profile.complete && !complete) {
        await startCard();
        return;
      }
    } catch (err) {
      setError(profileErr(t, err, "profile.saveFail"));
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) {
    return <p className="text-sm text-muted">{t("profile.loading")}</p>;
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className={
        highlight
          ? "rounded-xl border border-gold bg-surface p-6 ring-1 ring-gold/30"
          : "rounded-xl border border-line bg-surface p-6"
      }
    >
      <p className="font-mono text-[10px] tracking-[0.16em] text-faint uppercase">
        {t("profile.kicker")}
      </p>
      <h2 className="mt-2 font-display text-2xl tracking-tight">
        {complete ? t("profile.onFile") : t("profile.title")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {t("profile.lead")} {t("profile.noRefunds")}
      </p>

      <label className="mt-6 block text-sm text-muted">
        {t("profile.legalName")}
        <input
          required
          autoComplete="name"
          value={legalName}
          onChange={(e) => setLegalName(e.target.value)}
          className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 text-sm text-fg"
        />
      </label>

      <label className="mt-4 block text-sm text-muted">
        {t("profile.dob")}
        <input
          required
          type="date"
          autoComplete="bday"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 text-sm text-fg"
        />
      </label>

      <label className="mt-4 block text-sm text-muted">
        {t("profile.homeState")}
        <select
          required
          value={homeState}
          onChange={(e) =>
            setHomeState(e.target.value as (typeof PROFILE_HOME_STATES)[number])
          }
          className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 text-sm text-fg"
        >
          <option value="">{t("profile.select")}</option>
          {PROFILE_HOME_STATES.map((id) => (
            <option key={id} value={id}>
              {id === "other" ? t("profile.stateOther") : homeStateLabel(id)}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-1 text-xs text-faint">{t("profile.ageNote")}</p>

      <fieldset className="mt-5 space-y-3 text-sm text-muted">
        <label className="flex gap-3">
          <input
            type="checkbox"
            checked={ageAttested}
            onChange={(e) => setAgeAttested(e.target.checked)}
            className="mt-1"
          />
          <span>{t("profile.ageCheck")}</span>
        </label>
        <label className="flex gap-3">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1"
          />
          <span>
            {t("profile.termsCheckA")}{" "}
            <Link to="/terms" className="underline underline-offset-2">
              {t("profile.terms")}
            </Link>
            ,{" "}
            <Link to="/privacy" className="underline underline-offset-2">
              {t("pricing.privacyPolicy")}
            </Link>
            , {t("pricing.and")}{" "}
            <Link to="/legal" className="underline underline-offset-2">
              {t("profile.notices")}
            </Link>
            .
          </span>
        </label>
        <label className="flex gap-3">
          <input
            type="checkbox"
            checked={noRefundsAccepted}
            onChange={(e) => setNoRefundsAccepted(e.target.checked)}
            className="mt-1"
          />
          <span>{t("profile.refundsCheck")}</span>
        </label>
        <label className="flex gap-3">
          <input
            type="checkbox"
            checked={billingConsent}
            onChange={(e) => setBillingConsent(e.target.checked)}
            className="mt-1"
          />
          <span>{t("profile.consent")}</span>
        </label>
      </fieldset>

      {error ? <p className="mt-4 text-sm text-bust">{error}</p> : null}

      <button
        type="submit"
        disabled={busy}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg disabled:opacity-60"
      >
        {busy
          ? checkoutBusy
            ? t("pricing.startingAnnual")
            : t("profile.saving")
          : complete
            ? t("profile.update")
            : t("profile.save")}
      </button>
      {complete ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void startCard()}
          className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-gold px-4 text-sm font-medium text-accent-fg disabled:opacity-60"
        >
          {busy
            ? t("pricing.startingAnnual")
            : plan === "annual"
              ? t("profile.addCardAnnual")
              : t("profile.addCardTrial")}
        </button>
      ) : null}
    </form>
  );
}
