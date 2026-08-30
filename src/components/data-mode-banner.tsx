import type { DataMode, StateConfig } from "@/config/states";
import { useI18n } from "@/lib/locale";

export function DataModeBanner({
  state,
  loadError = null,
  dataMode,
}: {
  state: StateConfig;
  loadError?: string | null;
  stale?: boolean;
  weekLabel?: string;
  dataMode?: DataMode;
}) {
  const { t } = useI18n();
  const mode = dataMode ?? state.dataMode;

  if (loadError) {
    return (
      <div
        role="alert"
        className="border-b border-danger/40 bg-danger/10 px-4 py-3 sm:px-6"
      >
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
      <div
        role="status"
        className="border-b border-danger/40 bg-danger/10 px-4 py-3 sm:px-6"
      >
        <p className="mx-auto max-w-6xl text-center text-sm leading-relaxed text-paper">
          {t("banner.demo", { name: state.name, lottery: state.lotteryShort })}
        </p>
      </div>
    );
  }

  return (
    <div role="status" className="border-b border-line bg-raised/40 px-4 py-2 sm:px-6">
      <p className="mx-auto max-w-6xl text-center text-sm leading-relaxed text-paper">
        {t("banner.deskSnapshot")}
      </p>
    </div>
  );
}
