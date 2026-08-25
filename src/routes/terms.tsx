import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { pageHead } from "@/lib/site";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () =>
    pageHead({
      title: "Terms of Service",
      description:
        "Terms of use for Scratch Vault. Independent remaining-prize desk. 18+ to use; Arizona and Iowa lottery tickets are 21+. No refunds. Not affiliated with any state lottery.",
      path: "/terms",
    }),
});

function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="font-mono text-xs tracking-[0.16em] text-faint uppercase">
        Legal
      </p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">
        Terms of Service
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        These Terms govern your use of Scratch Vault, an independent
        remaining-prize information product of Webb Spinner Visions. By using
        the website, the native apps, or starting a trial, you agree to these
        Terms and to the{" "}
        <Link to="/privacy" className="underline underline-offset-2 hover:text-fg">
          Privacy Policy
        </Link>
        . Last updated August 25, 2026.
      </p>

      <Section title="1. Who we are">
        <p>
          Scratch Vault is operated by Webb Spinner Visions. Contact:{" "}
          <a
            className="underline underline-offset-2 hover:text-fg"
            href="mailto:webbspinnervisions@gmail.com"
          >
            webbspinnervisions@gmail.com
          </a>
          .
        </p>
        <p className="mt-3">
          This product is not a lottery, not a ticket seller, and not affiliated
          with, endorsed by, sponsored by, or connected to any state lottery,
          including the Tennessee Education Lottery Corporation.
        </p>
      </Section>

      <Section title="2. What this product is">
        <p>
          The Vault compiles remaining-prize counts from publicly posted
          remaining-prizes tables and other published game information.
          Tennessee uses the live public table when available; other desks may
          be compiled snapshots or demo catalogs and are labeled as such.
          Counts are not live store inventory. You cannot buy, scan, check, or
          redeem tickets here. Remaining counts change as tickets sell.
          Remaining counts do not improve the odds of winning any prize.
        </p>
        <p className="mt-3">
          Ticket faces shown in the product are independent reconstructions for
          identification. They are not official Lottery artwork.
        </p>
      </Section>

      <Section title="3. Eligibility">
        <p>
          You must be 18 or older to use this product. Lottery purchase and
          redeem ages vary by state: 21+ in Arizona and Iowa (Iowa Code
          § 99G.30); 18+ in Tennessee, Kentucky, South Carolina, Oklahoma,
          Michigan, North Carolina, Pennsylvania, Texas, Missouri, Ohio,
          Illinois, Massachusetts, Idaho, and Connecticut. Do not use this
          product to help anyone under the applicable lottery age obtain
          tickets. We may suspend or close an account if we reasonably believe
          the user is under 18, or under 21 when the selected desk is Arizona
          or Iowa.
        </p>
      </Section>

      <Section title="4. Accounts">
        <p>
          Some features require an account. You are responsible for the activity
          on that account and for keeping sign-in details to yourself. Tell us
          promptly if you think someone else used it.
        </p>
        <p className="mt-3">
          We may refuse, suspend, or close an account that violates these Terms,
          abuses trials, or attempts to bypass Full Access.
        </p>
      </Section>

      <Section title="5. Subscriptions, trials, billing, and no refunds">
        <p>
          Full Access is a recurring subscription. Current advertised prices are
          $4.99 per month or $49.99 per year, unless a store or checkout page
          shows a different price at the time you subscribe. Taxes may apply.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            <span className="text-fg">Profile and card required.</span> You must
            complete your customer profile (legal name, date of birth, home
            state, and the billing consents on that form) and add a credit or
            debit card before a trial or paid plan can start. No profile, no
            card, no trial.
          </li>
          <li>
            <span className="text-fg">Monthly — 7-day free trial, then $4.99.</span>{" "}
            Starting the monthly trial authorizes Stripe to charge $4.99 when
            the 7-day trial ends unless you opt out of monthly payments in your
            profile before that date. After the first paid month, the plan
            auto-renews at $4.99 each month until you opt out.
          </li>
          <li>
            <span className="text-fg">Annual — $49.99 billed now.</span> There is
            no trial on the annual plan. You pay $49.99 for twelve months and
            you keep that year no matter what. At the end of the year Stripe
            automatically charges another $49.99 for another year unless you
            opt out of renewal in your profile before the renewal date.
          </li>
          <li>
            <span className="text-fg">No refunds.</span> All fees are
            non-refundable, including after an annual purchase and after a
            monthly charge posts. Opting out stops the next charge only. You
            keep access through the trial or paid period already started. This
            does not limit refunds that Apple, Google, or a law that cannot be
            waived requires.
          </li>
          <li>
            <span className="text-fg">How to opt out.</span> On the website, open
            Account and use Opt out of monthly payments / Opt out of next year’s
            charge. That is a one-click cancel of future charges (ROSCA). You
            can also update your card from Account. In the iOS or Android app,
            use Manage subscription (or the store’s subscription settings).
          </li>
          <li>
            Illinois customers on an annual plan also receive Stripe’s upcoming
            invoice email 30–60 days before renewal (815 ILCS 601). Online
            signup means online cancel: Account → opt out. If you live in a
            state that is not one of the 16 lottery desks, that same Account
            control still stops the next charge.
          </li>
        </ul>
        <p className="mt-3">
          A charge made in error — tell us at{" "}
          <a
            className="underline underline-offset-2 hover:text-fg"
            href="mailto:webbspinnervisions@gmail.com"
          >
            webbspinnervisions@gmail.com
          </a>{" "}
          and we will review it. Billing errors are the only refunds we consider
          unless law or a store policy requires more.
        </p>
      </Section>

      <Section title="6. Acceptable use">
        <p>You agree not to:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Scrape, harvest, or republish the desk at scale without written permission.</li>
          <li>Circumvent the paywall, trial limits, or age gate.</li>
          <li>Probe, overload, or attack the service, or attempt to access another user’s account.</li>
          <li>Use the product to sell tickets, take wagers, or imply official Lottery status.</li>
          <li>Claim that remaining counts make any ticket more likely to win.</li>
        </ul>
      </Section>

      <Section title="7. Intellectual property">
        <p>
          The Vault name, layout, rankings, copy, and reconstructed ticket faces
          are owned by Webb Spinner Visions or its licensors. Official Lottery
          names, game titles, and trademarks belong to their owners. We use
          public remaining-prize information; we do not claim those official
          marks.
        </p>
      </Section>

      <Section title="8. No warranty">
        <p>
          The product is provided “as is.” Public counts can be late, incomplete,
          or wrong. We do not warrant that the desk is current, error-free, or
          fit for any particular purpose. Information here is not financial,
          gambling, or legal advice.
        </p>
      </Section>

      <Section title="9. Limitation of liability">
        <p>
          To the fullest extent allowed by law, Webb Spinner Visions is not
          liable for lost tickets, lost winnings, lost profits, or any indirect
          or consequential damages arising from use of the desk. Our total
          liability for a claim relating to the product is limited to the
          amount you paid us for Full Access in the 12 months before the claim,
          or $50 if you paid nothing.
        </p>
        <p className="mt-3">
          Some states do not allow certain limitations. In those states, the
          limit applies only as far as the law allows. These Terms do not
          limit liability that cannot be limited under Tennessee or U.S. law.
        </p>
      </Section>

      <Section title="10. Indemnity">
        <p>
          You will defend and indemnify Webb Spinner Visions against claims
          arising from your misuse of the product, your violation of these
          Terms, or your violation of law.
        </p>
      </Section>

      <Section title="11. Third-party services">
        <p>
          Sign-in, hosting, and payments are provided by third parties (including
          Stripe, Vercel, Apple, Google, and our auth provider). Their terms
          govern their services. We are not responsible for an outage or
          decision by those providers.
        </p>
      </Section>

      <Section title="12. Changes and termination">
        <p>
          We may update these Terms. The “Last updated” date will change. If a
          change is material, we will post it on this page before it applies to
          you. Continued use after that date is acceptance. We may stop offering
          the product or a plan with reasonable notice where required.
        </p>
      </Section>

      <Section title="13. Governing law">
        <p>
          These Terms are governed by the laws of the State of Tennessee,
          without regard to conflict-of-law rules. Courts in Tennessee have
          exclusive venue, except that you may have additional rights in your
          home state that cannot be waived, and Apple or Google may require
          store disputes to follow their rules.
        </p>
      </Section>

      <Section title="14. State lottery desks">
        <p>
          Scratch Vault compiles remaining-prize facts each listed lottery
          already publishes. It is not a lottery, ticket seller, courier, or
          prize payer, and it is not affiliated with any lottery named on the
          desks. Game names identify publicly offered games. Official logos and
          ticket artwork are not used. Rankings do not improve the odds of any
          individual ticket. See the{" "}
          <Link
            to="/legal"
            className="underline underline-offset-2 hover:text-fg"
          >
            state lottery notices
          </Link>{" "}
          for age, claim-window, and affiliation notes for Tennessee, Kentucky,
          South Carolina, Oklahoma, Michigan, Arizona, North Carolina,
          Pennsylvania, Texas, Missouri, Ohio, Illinois, Massachusetts, Iowa,
          Idaho, and Connecticut. Those notes are product compliance summaries,
          not legal advice.
        </p>
      </Section>

      <Section title="15. Responsible play">
        <p>
          Play only with money you can afford to lose. Do not chase losses. If
          gambling is no longer fun, call or text{" "}
          <a className="underline underline-offset-2" href="tel:18005224700">
            1-800-GAMBLER
          </a>{" "}
          (1-800-522-4700) or Tennessee REDLINE{" "}
          <a className="underline underline-offset-2" href="tel:18008899789">
            1-800-889-9789
          </a>
          . See the{" "}
          <Link
            to="/disclaimer"
            className="underline underline-offset-2 hover:text-fg"
          >
            full disclaimer
          </Link>
          .
        </p>
      </Section>

      <p className="mt-10 text-sm text-faint">
        <Link to="/" className="underline underline-offset-2 hover:text-fg">
          Back to the vault
        </Link>
        {" · "}
        <Link
          to="/privacy"
          className="underline underline-offset-2 hover:text-fg"
        >
          Privacy
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

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl tracking-tight">{title}</h2>
      <div className="mt-3 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}
