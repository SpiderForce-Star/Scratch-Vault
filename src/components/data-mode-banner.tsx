import { postCadenceFor, type DataMode, type StateConfig } from "@/config/states";
import { deskFreshnessLabel } from "@/lib/desk-freshness";
import { useI18n } from "@/lib/locale";

export function DataModeBanner({
  state,
  loadError = null,
  stale = false,
  fetchedAt = null,
  dataMode,
  leftover = false,
  now,
}: {
  state: StateConfig;
  loadError?: string | null;
  stale?: boolean;
  fetchedAt?: string | null;
  dataMode?: DataMode;
  leftover?: boolean;
  /** Server clock from the snapshot so the label matches the header. */
  now?: number;
}) {
  const { t, locale } = useI18n();
  const mode = dataMode ?? state.dataMode;
  const freshness = deskFreshnessLabel({
    fetchedAt,
    publishedAt: state.publishedAt,
    stale,
    cadence: postCadenceFor(state.id),
    now,
    locale: locale === "es" ? "es" : "en-US",
  });
  const aged = mode !== "sample" && freshness.stale;
  const asOfLabel = freshness.when;

  if (loadError) {
    return (
      <div role="alert" className="border-b border-danger/40 bg-danger/10 px-4 py-3 sm:px-6">
        <p className="mx-auto max-w-6xl text-center text-sm leading-relaxed text-paper">
          {t("banner.loadFail")}
          {state.remainingPrizesUrl ? (
            <>
              {" "}
              <a
                className="underline underline-offset-2 hover:text-gold"
                href={state.remainingPrizesUrl}
                target="_blank"
                rel="noreferrer"
              >
                {t("banner.officialPage", { lottery: state.lotteryShort })}
              </a>
            </>
          ) : null}
        </p>
      </div>
    );
  }

  if (mode === "sample") {
    return (
      <div role="status" className="border-b border-danger/40 bg-danger/10 px-4 py-3 sm:px-6">
        <p className="mx-auto max-w-6xl text-center text-sm leading-relaxed text-paper">
          {t("banner.demo", { name: state.name, lottery: state.lotteryShort })}
        </p>
      </div>
    );
  }

  if (aged) {
    return (
      <div role="status" className="border-b border-gold/70 bg-gold/20 px-4 py-3 sm:px-6">
        <p className="mx-auto max-w-6xl text-center text-sm font-semibold leading-relaxed text-paper">
          {t("banner.staleAsOf", { date: asOfLabel || "—" })}
          {" "}
          {t("banner.scanHeadline")}
          {state.remainingPrizesUrl ? (
            <>
              {" "}
              <a
                className="underline underline-offset-2 hover:text-gold"
                href={state.remainingPrizesUrl}
                target="_blank"
                rel="noreferrer"
              >
                {t("banner.officialPage", { lottery: state.lotteryShort })}
              </a>
            </>
          ) : null}
        </p>
      </div>
    );
  }

  return (
    <div role="status" className="border-b border-line bg-raised/40 px-4 py-2 sm:px-6">
      <p className="mx-auto max-w-6xl text-center text-sm leading-relaxed text-paper">
        {leftover
          ? t("banner.leftover")
          : `${t("banner.deskSnapshot")} ${t("banner.scanHeadline")}`}
      </p>
    </div>
  );
}
