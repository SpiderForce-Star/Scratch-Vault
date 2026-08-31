import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/site";
import { LEGAL_REVIEW_DATE } from "@/lib/state-legal";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () =>
    pageHead({
      title: "Privacy",
      description:
        "Privacy policy for Scratch Vault. Email, profile, and purchases only. Independent remaining-prize desk. 18+ to use; Arizona and Iowa lottery tickets are 21+.",
      path: "/privacy",
    }),
});

function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="font-mono text-xs tracking-[0.16em] text-faint uppercase">
        Legal
      </p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">Privacy</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        Scratch Vault is an independent remaining-prize information product of
        Webb Spinner Visions. It is not a lottery, not a ticket seller, and
        not affiliated with any state lottery. Last updated {LEGAL_REVIEW_DATE}.
      </p>

      <section className="mt-10">
        <h2 className="font-display text-2xl tracking-tight">What we collect</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
          <li>
            <span className="text-fg">Account email and display name</span> when
            you sign in (via our auth provider).
          </li>
          <li>
            <span className="text-fg">Customer profile</span> — legal name,
            date of birth, home state, and timestamps for the age, terms,
            no-refunds, and auto-renewal consents you give before checkout.
          </li>
          <li>
            <span className="text-fg">Auth session</span> (a signed cookie or
            bearer token) so you stay signed in.
          </li>
          <li>
            <span className="text-fg">Billing customer id</span> — Stripe
            customer id on the website, or the App Store / Play Billing /
            RevenueCat customer id in the native apps — so we can tell whether
            Full Access is active.
          </li>
          <li>
            <span className="text-fg">Subscription status</span> (trialing,
            active, canceled, past due) and the current period end date.
          </li>
          <li>
            <span className="text-fg">Session cookie</span> so you stay signed
            in, plus on-device storage for the 18+ confirmation and your last
            price filter. Hosting logs (IP, user agent) may be kept briefly by
            Vercel to run the site.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl tracking-tight">
          What we do not collect
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
          <li>Precise location or GPS.</li>
          <li>Contacts, photos, camera, or microphone.</li>
          <li>Government ID, Social Security number, or payment card numbers
            (card details stay with Stripe or Apple/Google).</li>
          <li>Store-level inventory or any data from lottery retailers.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl tracking-tight">18+</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          You must be 18 or older to use this product. Lottery purchase ages
          vary by state (18+ in most supported states; 21+ in Arizona and Iowa). The
          native apps ask you to confirm age on first launch. This product is
          information only. Remaining-prize counts do not improve the odds of
          winning any prize.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl tracking-tight">How we use data</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          We use the account, profile, and billing fields to sign you in,
          confirm age and consent, unlock Full Access when a trial or paid
          subscription is active, and let you opt out of the next charge. We do not sell personal
          information. We do not use your data to target lottery ads.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl tracking-tight">
          How to delete your account
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Email Webb Spinner Visions at{" "}
          <a
            className="underline underline-offset-2 hover:text-fg"
            href="mailto:webbspinnervisions@gmail.com"
          >
            webbspinnervisions@gmail.com
          </a>{" "}
          from the address on the account and ask us to delete it. We will
          remove the auth profile and billing identifiers we store. If you
          have an App Store or Play subscription, cancel it in that store as
          well — we cannot cancel a store subscription on your behalf.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl tracking-tight">Contact</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Webb Spinner Visions
          <br />
          <a
            className="underline underline-offset-2 hover:text-fg"
            href="mailto:webbspinnervisions@gmail.com"
          >
            webbspinnervisions@gmail.com
          </a>
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          If gambling is a problem, call or text{" "}
          <a className="underline underline-offset-2" href="tel:18005224700">
            1-800-GAMBLER
          </a>{" "}
          (1-800-522-4700). In Tennessee you can also call REDLINE{" "}
          <a className="underline underline-offset-2" href="tel:18008899789">
            1-800-889-9789
          </a>
          .
        </p>
      </section>

      <p className="mt-10 text-sm text-faint">
        <Link to="/" className="underline underline-offset-2 hover:text-fg">
          Back to the vault
        </Link>
        {" · "}
        <Link
          to="/terms"
          className="underline underline-offset-2 hover:text-fg"
        >
          Terms
        </Link>
        {" · "}
        <Link
          to="/disclaimer"
          className="underline underline-offset-2 hover:text-fg"
        >
          Disclaimer
        </Link>
        {" · "}
        <Link
          to="/legal"
          className="underline underline-offset-2 hover:text-fg"
        >
          State notices
        </Link>
      </p>
    </article>
  );
}
