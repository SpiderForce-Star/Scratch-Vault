import { Link, createFileRoute } from "@tanstack/react-router";
import { HeatExplainer } from "@/components/heat-explainer";
import { pageHead } from "@/lib/site";
import { useI18n } from "@/lib/locale";

export const Route = createFileRoute("/methods")({
  component: MethodsPage,
  head: () =>
    pageHead({
      title: "The leftover ledger",
      description:
        "How Scratch Vault reads leftover prizes: three leftover bands after a game starts, plus leftover-prize pace from official lists. Remaining counts do not improve your odds. Printed odds never change. 18+ (Iowa tickets 21+).",
      path: "/methods",
    }),
});

function MethodsPage() {
  const { t } = useI18n();
  return (
    <article id="explain" className="border-b border-line">
      <header className="border-b border-line bg-raised/30">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
          <p className="font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
            {t("methods.kicker")}
          </p>
          <h1 className="mt-3 font-display text-3xl tracking-tight sm:text-5xl">
            {t("methods.title")}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            {t("methods.lead")}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <ol className="grid gap-4">
          <MethodStep n="01" kicker={t("methods.s1Kicker")} title={t("methods.s1Title")}>
            {t("methods.s1Body")}
          </MethodStep>
          <MethodStep n="02" kicker={t("methods.s2Kicker")} title={t("methods.s2Title")}>
            {t("methods.s2Body")}
          </MethodStep>
          <MethodStep n="03" kicker={t("methods.s3Kicker")} title={t("methods.s3Title")}>
            {t("methods.s3Body")}
          </MethodStep>
          <MethodStep n="04" kicker={t("methods.s4Kicker")} title={t("methods.s4Title")}>
            {t("methods.s4Body")}
          </MethodStep>
        </ol>

        <aside className="mt-10 rounded-lg border border-line bg-surface/60 px-4 py-4 sm:px-5">
          <p className="font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
            {t("methods.honestKicker")}
          </p>
          <h2 className="mt-2 font-display text-xl tracking-tight">
            {t("methods.honestTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t("methods.honestBody")}</p>
        </aside>
      </div>

      <HeatExplainer neon />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="flex flex-wrap gap-x-6 gap-y-3">
          <Link
            to="/"
            className="font-mono text-sm tracking-wide text-gold underline underline-offset-4 hover:text-paper"
          >
            {t("methods.ctaDesk")}
          </Link>
          <Link
            to="/strategy"
            className="font-mono text-sm tracking-wide text-muted underline underline-offset-4 hover:text-gold"
          >
            {t("methods.ctaStrategy")}
          </Link>
        </p>
        <p className="mt-8 text-sm leading-relaxed text-muted">{t("methods.foot")}</p>
        <p className="mt-4">
          <Link
            to="/disclaimer"
            className="text-sm text-muted underline underline-offset-2 hover:text-fg"
          >
            {t("home.fullDisclaimer")}
          </Link>
        </p>
      </div>
    </article>
  );
}

function MethodStep({
  n,
  kicker,
  title,
  children,
}: {
  n: string;
  kicker: string;
  title: string;
  children: string;
}) {
  return (
    <li className="rounded-lg border border-line bg-raised/40 px-4 py-4 sm:px-5">
      <p className="font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
        {n} · {kicker}
      </p>
      <h2 className="mt-2 font-display text-xl tracking-tight sm:text-2xl">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{children}</p>
    </li>
  );
}
