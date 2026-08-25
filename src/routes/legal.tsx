import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/site";
import {
  ANNUAL_PRICE_LABEL,
  MONTHLY_PRICE_LABEL,
  NO_REFUNDS_LINE,
  TRIAL_LABEL,
} from "@/lib/billing-policy";
import {
  COMMON_LEGAL_LIMITS,
  LEGAL_REVIEW_DATE,
  NATIONAL_HELPLINE,
  STATE_LEGAL_LIST,
} from "@/lib/state-legal";
import { getState } from "@/config/states";

export const Route = createFileRoute("/legal")({
  component: LegalPage,
  head: () =>
    pageHead({
      title: "State lottery notices",
      description:
        "Scratch Vault state-by-state lottery notices. Independent remaining-prize desk. Not affiliated with any lottery. 18+ to use; Arizona and Iowa lottery tickets are 21+.",
      path: "/legal",
    }),
});

function LegalPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="font-mono text-xs tracking-[0.16em] text-faint uppercase">
        Legal
      </p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">
        State lottery notices
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        Scratch Vault publishes remaining-prize information for sixteen public
        lottery desks. The notes below are product compliance summaries reviewed{" "}
        {LEGAL_REVIEW_DATE}. They are not legal advice and they do not replace
        the issuing lottery’s own rules. Last updated {LEGAL_REVIEW_DATE}.
      </p>

      <section className="mt-10">
        <h2 className="font-display text-2xl tracking-tight">
          What this product may and may not do
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
          {COMMON_LEGAL_LIMITS.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl tracking-tight">
          Billing, trial, and opt-out
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Full Access is a remaining-prize information subscription, not a
          lottery ticket. You must complete a profile and add a credit or debit
          card before a trial or paid year can start.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
          <li>
            Monthly: {TRIAL_LABEL}, then {MONTHLY_PRICE_LABEL} unless you opt
            out in your profile before the trial ends.
          </li>
          <li>
            Annual: {ANNUAL_PRICE_LABEL} billed now for twelve months. You keep
            that year. It auto-renews unless you opt out before the renewal.
          </li>
          <li>{NO_REFUNDS_LINE}</li>
          <li>
            Opt out is one click on Account — same medium as signup (ROSCA).
            Illinois annual plans also get Stripe’s 30–60 day upcoming-invoice
            notice (815 ILCS 601).
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl tracking-tight">
          Every listed state
        </h2>
        <div className="mt-6 space-y-8">
          {STATE_LEGAL_LIST.map((note) => {
            const config = getState(note.id);
            return (
              <section
                key={note.id}
                id={note.id}
                className="rounded-xl border border-line bg-surface p-5"
              >
                <p className="font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
                  {config.shortName} · tickets {note.purchaseAge}+
                </p>
                <h3 className="mt-2 font-display text-xl tracking-tight">
                  {config.name}
                </h3>
                <p className="mt-2 text-sm text-muted">{config.lotteryName}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {note.statuteHint} Claim window: {note.claimWindow}
                </p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
                  {note.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                  {config.rulesNotes.map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-faint">
                  Public remaining-prizes source:{" "}
                  <a
                    className="underline underline-offset-2"
                    href={note.remainingSource}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {note.remainingSource.replace(/^https?:\/\//, "")}
                  </a>
                </p>
                <p className="mt-2 text-sm text-muted">
                  Help:{" "}
                  <a className="underline underline-offset-2" href={`tel:${NATIONAL_HELPLINE.tel}`}>
                    {NATIONAL_HELPLINE.label}
                  </a>
                  {note.helpline.tel !== NATIONAL_HELPLINE.tel ? (
                    <>
                      {" · "}
                      {note.helpline.label}{" "}
                      <a
                        className="underline underline-offset-2"
                        href={`tel:${note.helpline.tel}`}
                      >
                        {formatTel(note.helpline.tel)}
                      </a>
                    </>
                  ) : null}
                </p>
              </section>
            );
          })}
        </div>
      </section>

      <p className="mt-10 text-sm text-faint">
        <Link to="/" className="underline underline-offset-2 hover:text-fg">
          Back to the vault
        </Link>
        {" · "}
        <Link to="/terms" className="underline underline-offset-2 hover:text-fg">
          Terms
        </Link>
        {" · "}
        <Link to="/disclaimer" className="underline underline-offset-2 hover:text-fg">
          Disclaimer
        </Link>
      </p>
    </article>
  );
}

function formatTel(tel: string): string {
  const digits = tel.replace(/\D/g, "");
  if (digits.length === 11) {
    return digits.replace(/(\d)(\d{3})(\d{3})(\d{4})/, "$1-$2-$3-$4");
  }
  if (digits.length === 10) {
    return digits.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
  }
  return tel;
}
