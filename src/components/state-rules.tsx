import { purchaseAgeLine, type StateConfig } from "@/config/states";
import { useI18n } from "@/lib/locale";

export function StateRulesNote({ state }: { state: StateConfig }) {
  const { t } = useI18n();
  return (
    <section id="state-rules" className="border-b border-line">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
          {t("rules.kicker", { short: state.shortName })}
        </p>
        <h2 className="mt-2 font-display text-2xl tracking-tight">
          {t("rules.title", { name: state.name })}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
          {state.remainingDefinition}
        </p>
        <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
          {state.rulesNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
          <li>{state.claimWindow}</li>
          <li>
            {purchaseAgeLine(state)} {t("rules.oddsLine", { lottery: state.lotteryShort })}
          </li>
        </ul>
        <p className="mt-4 text-sm text-faint">
          {state.remainingPrizesUrl ? (
            <>
              {t("rules.official")}{" "}
              <a
                className="underline underline-offset-2 hover:text-fg"
                href={state.remainingPrizesUrl}
                target="_blank"
                rel="noreferrer"
              >
                {state.lotteryShort}
              </a>
              {" · "}
            </>
          ) : null}
          {state.playResponsiblyUrl ? (
            <>
              <a
                className="underline underline-offset-2 hover:text-fg"
                href={state.playResponsiblyUrl}
                target="_blank"
                rel="noreferrer"
              >
                {t("rules.play")}
              </a>
              {" · "}
            </>
          ) : null}
          {t("rules.help")}{" "}
          <a className="underline underline-offset-2" href="tel:18005224700">
            1-800-GAMBLER
          </a>
          {state.helplineExtra ? (
            <>
              {" "}
              {t("rules.or")} {state.helplineExtra.label}{" "}
              <a
                className="underline underline-offset-2"
                href={`tel:${state.helplineExtra.tel}`}
              >
                {formatTel(state.helplineExtra.tel)}
              </a>
            </>
          ) : null}
          .
        </p>
      </div>
    </section>
  );
}

export function StateRulesCompact({ state }: { state: StateConfig }) {
  const { t } = useI18n();
  return (
    <section className="mt-8 rounded-lg border border-line bg-surface p-5">
      <p className="font-mono text-[10px] tracking-[0.16em] text-faint uppercase">
        {t("rules.compact", { short: state.shortName })}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {state.remainingDefinition} {state.claimWindow}
      </p>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
        {state.rulesNotes.slice(0, 3).map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-faint">
        {t("rules.compactFoot", {
          lottery: state.lotteryName,
          age: String(state.minAge),
          short: state.shortName,
        })}
      </p>
    </section>
  );
}

function formatTel(tel: string): string {
  if (tel.length === 11 && tel.startsWith("1")) {
    return tel.replace(/(\d)(\d{3})(\d{3})(\d{4})/, "$1-$2-$3-$4");
  }
  return tel;
}
