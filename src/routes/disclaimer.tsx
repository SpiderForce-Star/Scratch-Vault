import { createFileRoute, Link } from "@tanstack/react-router";
import {
  DisclaimerLead,
  DisclaimerPanel,
} from "@/components/disclaimer-panel";
import { pageHead } from "@/lib/site";
import { useI18n } from "@/lib/locale";

export const Route = createFileRoute("/disclaimer")({
  component: DisclaimerPage,
  head: () =>
    pageHead({
      title: "Disclaimer & responsible play",
      description:
        "Independent remaining-prize desk. Not affiliated with any state lottery. Remaining counts do not improve odds. 18+ to use; Arizona and Iowa lottery tickets are 21+. 1-800-GAMBLER.",
      path: "/disclaimer",
    }),
});

function DisclaimerPage() {
  const { t } = useI18n();
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="font-mono text-xs tracking-[0.16em] text-faint uppercase">
        {t("disc.pageKicker")}
      </p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">{t("disc.pageTitle")}</h1>
      <div className="mt-4 mb-8">
        <DisclaimerLead />
      </div>
      <DisclaimerPanel />
      <p className="mt-10 text-sm text-faint">
        <Link to="/" className="underline underline-offset-2 hover:text-fg">
          {t("disc.back")}
        </Link>
        {" · "}
        <Link
          to="/terms"
          className="underline underline-offset-2 hover:text-fg"
        >
          {t("footer.terms")}
        </Link>
        {" · "}
        <Link
          to="/privacy"
          className="underline underline-offset-2 hover:text-fg"
        >
          {t("footer.privacy")}
        </Link>
      </p>
    </article>
  );
}
