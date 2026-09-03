import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { createCheckoutSession } from "@/lib/billing";
import { getBillingProfile, saveBillingProfile } from "@/lib/profile-api";
import {
  PROFILE_HOME_STATES,
  homeStateLabel,
  type BillingProfile,
} from "@/lib/profile";
import { CHECKOUT_CONSENT_MESSAGE, NO_REFUNDS_LINE } from "@/lib/billing-policy";

export function ProfileForm({
  onSaved,
  highlight,
  plan = "monthly",
}: {
  onSaved?: (profile: BillingProfile) => void;
  highlight?: boolean;
  plan?: "monthly" | "annual";
}) {
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
        setError("Save your profile before adding a card.");
        return;
      }
      if (result?.url) {
        window.location.assign(result.url);
        return;
      }
      setError("Could not start checkout. Please try again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
    } finally {
      setCheckoutBusy(false);
      setBusy(false);
    }
  };

  useEffect(() => {
    void getBillingProfile()
      .then((profile) => {
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
        setError(err instanceof Error ? err.message : "Could not load profile.");
        setLoaded(true);
      });
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!homeState) {
      setError("Select your home state.");
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
      setError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) {
    return <p className="text-sm text-muted">Loading profile…</p>;
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
        Customer profile
      </p>
      <h2 className="mt-2 font-display text-2xl tracking-tight">
        {complete ? "Profile on file" : "Complete your profile to start a trial"}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        A completed profile and a credit or debit card are required for the
        7-day monthly trial. Annual Full Access is $49.99 charged up front.
        {" "}
        {NO_REFUNDS_LINE}
      </p>

      <label className="mt-6 block text-sm text-muted">
        Legal name
        <input
          required
          autoComplete="name"
          value={legalName}
          onChange={(e) => setLegalName(e.target.value)}
          className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 text-sm text-fg"
        />
      </label>

      <label className="mt-4 block text-sm text-muted">
        Date of birth
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
        Home state
        <select
          required
          value={homeState}
          onChange={(e) =>
            setHomeState(e.target.value as (typeof PROFILE_HOME_STATES)[number])
          }
          className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 text-sm text-fg"
        >
          <option value="">Select…</option>
          {PROFILE_HOME_STATES.map((id) => (
            <option key={id} value={id}>
              {homeStateLabel(id)}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-1 text-xs text-faint">
        Arizona and Iowa lottery tickets are 21+. A home state of AZ or IA
        requires you to be 21.
      </p>

      <fieldset className="mt-5 space-y-3 text-sm text-muted">
        <label className="flex gap-3">
          <input
            type="checkbox"
            checked={ageAttested}
            onChange={(e) => setAgeAttested(e.target.checked)}
            className="mt-1"
          />
          <span>
            I am 18 or older. I understand Arizona and Iowa lottery tickets are
            21+ to buy or redeem.
          </span>
        </label>
        <label className="flex gap-3">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1"
          />
          <span>
            I agree to the{" "}
            <Link to="/terms" className="underline underline-offset-2">
              Terms of Service
            </Link>
            ,{" "}
            <Link to="/privacy" className="underline underline-offset-2">
              Privacy Policy
            </Link>
            , and{" "}
            <Link to="/legal" className="underline underline-offset-2">
              state lottery notices
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
          <span>
            I understand there are no refunds. If I opt out, I keep access
            through the period already paid and future charges stop.
          </span>
        </label>
        <label className="flex gap-3">
          <input
            type="checkbox"
            checked={billingConsent}
            onChange={(e) => setBillingConsent(e.target.checked)}
            className="mt-1"
          />
          <span>{CHECKOUT_CONSENT_MESSAGE}</span>
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
            ? "Starting checkout…"
            : "Saving…"
          : complete
            ? "Update profile"
            : "Save profile"}
      </button>
      {complete ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void startCard()}
          className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-gold px-4 text-sm font-medium text-accent-fg disabled:opacity-60"
        >
          {busy ? "Starting checkout…" : plan === "annual" ? "Add a card — pay $49.99" : "Add a card — start 7-day trial"}
        </button>
      ) : null}
    </form>
  );
}
