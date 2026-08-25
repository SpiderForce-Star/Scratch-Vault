import { useActiveState } from "@/lib/active-state";
import type { StateConfig } from "@/config/states";
import { useI18n } from "@/lib/locale";
import type { MessageKey } from "@/lib/i18n";

function benefitsFor(
  state: StateConfig,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
) {
  const top = state.holdback
    ? t("helps.topHoldback", { name: state.name, label: state.holdback.label })
    : t("helps.topPlain", { name: state.name });
  const counts =
    state.dataMode === "compiled"
      ? { title: t("helps.compiledTitle"), body: t("helps.compiledBody") }
      : { title: t("helps.countsTitle"), body: t("helps.countsBody") };
  return [
    { title: t("helps.topTitle"), body: top },
    { title: t("helps.midTitle"), body: t("helps.midBody") },
    { title: t("helps.skipTitle"), body: t("helps.skipBody") },
    counts,
    { title: t("helps.choiceTitle"), body: t("helps.choiceBody") },
  ];
}

export function ProductStory() {
  const { config } = useActiveState();
  const { t } = useI18n();
  return (
    <section id="about" className="border-b border-line">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
          {t("story.kicker")}
        </p>
        <h2 className="mt-2 max-w-3xl font-display text-3xl tracking-tight sm:text-4xl">
          {t("story.title")}
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted">
          {t("story.body", { name: config.name })}
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-faint">
          {t("story.notAffiliated", {
            lottery: config.lotteryShort,
            age: String(config.minAge),
            short: config.shortName,
          })}{" "}
          {t("age.help")}{" "}
          <a className="underline underline-offset-2" href="tel:18005224700">
            1-800-GAMBLER
          </a>
          .
        </p>
      </div>
    </section>
  );
}

export function HowTheDataWorks() {
  const { config } = useActiveState();
  const { t } = useI18n();
  const sourceUrl = config.remainingPrizesUrl;
  const grandBody = config.holdback
    ? t("data.grandHoldback", { label: config.holdback.label })
    : t("data.grandPlain", { name: config.name });

  return (
    <section id="how-data-works" className="border-b border-line">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
          {t("data.kicker")}
        </p>
        <h2 className="mt-2 max-w-3xl font-display text-2xl tracking-tight sm:text-3xl">
          {t("data.title")}
        </h2>
        <div className="mt-5 max-w-3xl space-y-4 text-base leading-relaxed text-muted">
          {config.dataMode === "sample" ? (
            <p>
              {t("data.demoTable", {
                name: config.name,
                lottery: config.lotteryShort,
              })}
            </p>
          ) : (
            <p>
              {t("data.fromTables", { lottery: config.lotteryShort })}{" "}
              {sourceUrl ? (
                <a
                  className="text-fg underline underline-offset-2 hover:text-gold"
                  href={sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {config.lotteryShort}
                </a>
              ) : null}
              {config.dataMode === "compiled"
                ? t("data.snapshot", { week: config.weekLabel })
                : null}{" "}
              {t("data.publicChange")}
            </p>
          )}
          {config.holdback ? (
            <p>
              {t("holdback.pia")} {t("holdback.piaExtra")}
            </p>
          ) : (
            <p>
              {t("holdback.none")}
            </p>
          )}
          <p>{config.remainingDefinition}</p>
          <p>
            {t("data.printedVsRemaining")}
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <HeatExplain
            kicker={t("heat.grand")}
            title={t("data.grandTitle")}
            body={grandBody}
          />
          <HeatExplain
            kicker={t("heat.medium")}
            title={t("data.mediumTitle")}
            body={t("data.mediumBody")}
          />
          <HeatExplain
            kicker={t("heat.bust")}
            title={t("data.bustTitle")}
            body={t("data.bustBody")}
          />
        </div>
      </div>
    </section>
  );
}

export function HowThisHelps() {
  const { config } = useActiveState();
  const { t } = useI18n();
  return (
    <section id="how-this-helps" className="border-b border-line bg-surface/40">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
          {t("helps.kicker")}
        </p>
        <h2 className="mt-2 max-w-3xl font-display text-2xl tracking-tight sm:text-3xl">
          {t("helps.title")}
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted">
          {t("helps.lead")}
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {benefitsFor(config, t).map((item) => (
            <li
              key={item.title}
              className="rounded-lg border border-line bg-bg p-4"
            >
              <p className="font-display text-lg leading-snug tracking-tight">
                {item.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function WhatThisAppIs() {
  const { config } = useActiveState();
  const { t } = useI18n();
  return (
    <section id="what-this-is" className="border-b border-line">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-2 sm:px-6">
        <div>
          <p className="font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
            {t("what.is")}
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
            <li>{t("what.is1")}</li>
            <li>{t("what.is2", { name: config.name })}</li>
            <li>{t("what.is3")}</li>
          </ul>
        </div>
        <div>
          <p className="font-mono text-[10px] tracking-[0.16em] text-faint uppercase">
            {t("what.not")}
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
            <li>{t("what.not1")}</li>
            <li>{t("what.not2", { lottery: config.lotteryName })}</li>
            <li>{t("what.not3")}</li>
          </ul>
        </div>
        <p className="text-sm leading-relaxed text-faint sm:col-span-2">
          {t("what.ageHelp", {
            age: String(config.minAge),
            lottery: config.lotteryShort,
          })}{" "}
          <a className="underline underline-offset-2" href="tel:18005224700">
            1-800-GAMBLER
          </a>{" "}
          (1-800-522-4700).
        </p>
      </div>
    </section>
  );
}

function HeatExplain({
  kicker,
  title,
  body,
}: {
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-lg border border-line bg-surface p-4">
      <p className="font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
        {kicker}
      </p>
      <h3 className="mt-2 font-display text-lg tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
    </article>
  );
}
