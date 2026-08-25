import type { StateConfig } from "@/config/states";
import { useI18n } from "@/lib/locale";

export function DataModeBanner({
  state,
  loadError = null,
  stale = false,
  weekLabel,
}: {
  state: StateConfig;
  loadError?: string | null;
  stale?: boolean;
  weekLabel?: string;
}) {
  const { t } = useI18n();
  const week = (weekLabel ?? state.weekLabel).replace(/^Compiled · /i, "");

  if (loadError) {
    return (
      <div
        role="alert"
        className="border-b border-danger/40 bg-danger/10 px-4 py-3 sm:px-6"
      >
        <p className="mx-auto max-w-6xl text-center text-sm leading-relaxed text-paper">
          {t("banner.loadFail")} {t("banner.inventory")}
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

  if (stale) {
    return (
      <div
        role="status"
        className="border-b border-gold/40 bg-gold/10 px-4 py-3 sm:px-6"
      >
        <p className="mx-auto max-w-6xl text-center text-sm leading-relaxed text-paper">
          <span className="mr-2 inline-block rounded-sm border border-gold/60 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
            {t("banner.lastGoodBadge")}
          </span>
          {t("banner.lastGood", { date: week })}
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
          {state.id === "ia" ? ` ${t("banner.iaFifty")}` : ""}
        </p>
      </div>
    );
  }

  if (state.dataMode === "sample") {
    return (
      <div
        role="status"
        className="border-b border-danger/40 bg-danger/10 px-4 py-3 sm:px-6"
      >
        <p className="mx-auto max-w-6xl text-center text-sm leading-relaxed text-paper">
          <span className="mr-2 inline-block rounded-sm border border-danger/70 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.16em] text-danger uppercase">
            {t("banner.demoBadge")}
          </span>
          {t("banner.demo", { name: state.name, lottery: state.lotteryShort })}
        </p>
      </div>
    );
  }

  if (state.dataMode === "live") {
    return (
      <div role="status" className="border-b border-line bg-raised/40 px-4 py-2 sm:px-6">
        <p className="mx-auto max-w-6xl text-center text-xs leading-relaxed text-faint">
          {t("banner.inventory")}
        </p>
      </div>
    );
  }

  const officialLabel = t("banner.officialPage", { lottery: state.lotteryShort });
  const [before, after] = t("banner.compiled", {
    week,
    official: "|||",
  }).split("|||");

  return (
    <div
      role="status"
      className="border-b border-gold/40 bg-gold/10 px-4 py-3 sm:px-6"
    >
      <p className="mx-auto max-w-6xl text-center text-sm leading-relaxed text-paper">
        <span className="mr-2 inline-block rounded-sm border border-gold/60 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
          {t("banner.compiledBadge")}
        </span>
        {before}
        {state.remainingPrizesUrl ? (
          <a
            className="underline underline-offset-2 hover:text-gold"
            href={state.remainingPrizesUrl}
            target="_blank"
            rel="noreferrer"
          >
            {officialLabel}
          </a>
        ) : (
          officialLabel
        )}
        {after}
        {state.id === "ia" ? ` ${t("banner.iaFifty")}` : ""}
      </p>
    </div>
  );
}
