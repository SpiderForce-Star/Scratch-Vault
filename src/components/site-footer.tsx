import { Link } from "@tanstack/react-router";
import { useActiveState } from "@/lib/active-state";
import { SITE_NAME } from "@/lib/site";
import { useI18n } from "@/lib/locale";

export function SiteFooter() {
  const { config } = useActiveState();
  const { t } = useI18n();
  const extra = config.helplineExtra;

  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="font-display text-lg">{SITE_NAME}</p>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              {t("footer.blurb", { lottery: config.lotteryName })}
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] tracking-[0.16em] text-faint uppercase">
              {t("footer.ifNoFun")}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-fg">
              {t("footer.callOrText")}{" "}
              <a className="underline underline-offset-2" href="tel:18005224700">
                1-800-GAMBLER
              </a>{" "}
              (1-800-522-4700)
              {extra ? (
                <>
                  {" "}
                  · {extra.label}{" "}
                  <a
                    className="underline underline-offset-2"
                    href={`tel:${extra.tel}`}
                  >
                    {extra.tel.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, "$1-$2-$3-$4")}
                  </a>
                </>
              ) : null}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4">
              <Link
                to="/disclaimer"
                className="inline-flex min-h-11 items-center text-sm text-muted underline underline-offset-2 hover:text-fg"
              >
                {t("footer.disclaimer")}
              </Link>
              <Link
                to="/privacy"
                className="inline-flex min-h-11 items-center text-sm text-muted underline underline-offset-2 hover:text-fg"
              >
                {t("footer.privacy")}
              </Link>
              <Link
                to="/terms"
                className="inline-flex min-h-11 items-center text-sm text-muted underline underline-offset-2 hover:text-fg"
              >
                {t("footer.terms")}
              </Link>
              <Link
                to="/pricing"
                className="inline-flex min-h-11 items-center text-sm text-muted underline underline-offset-2 hover:text-fg"
              >
                {t("footer.pricing")}
              </Link>
              <Link
                to="/legal"
                className="inline-flex min-h-11 items-center text-sm text-muted underline underline-offset-2 hover:text-fg"
              >
                {t("footer.stateLaws")}
              </Link>
            </div>
          </div>
        </div>

        <p className="max-w-3xl text-xs leading-relaxed text-faint">
          {t("footer.legal", {
            name: config.name,
            age: String(config.minAge),
            az: config.minAge < 21 ? t("footer.azNote") : "",
          })}
        </p>

        <a
          href="https://webbspinnervisions.net"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center font-mono text-[10px] tracking-[0.18em] text-faint uppercase hover:text-gold"
        >
          {t("footer.built")}
        </a>
      </div>
    </footer>
  );
}
