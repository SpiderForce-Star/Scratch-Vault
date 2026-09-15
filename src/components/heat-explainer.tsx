import { useI18n } from "@/lib/locale";

/** Illustrative leftover-pace math from tests — not a live game. */
const SAMPLE = {
  prior: 100,
  now: 92,
  claimed: 8,
  days: 16,
  dropPct: 8,
  vault: 55,
  lift: 10,
  desk: 65,
} as const;

export function HeatExplainer({ neon = false }: { neon?: boolean }) {
  const { t } = useI18n();
  const priorPct = 100;
  const nowPct = Math.round((SAMPLE.now / SAMPLE.prior) * 100);

  return (
    <section className="border-b border-line bg-surface/50">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        {neon ? (
          <aside className="sv-neon-decay sv-neon-decay-pulse mb-6 max-w-3xl rounded-lg px-4 py-4 sm:px-5">
            <p className="font-mono text-[10px] tracking-[0.18em] text-neon uppercase">
              {t("heat.neonKicker")}
            </p>
            <h2 className="mt-2 font-display text-xl tracking-tight text-neon sm:text-2xl">
              {t("heat.neonTitle")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-paper">
              {t("heat.neonBody")}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-neon/80">
              {t("heat.neonFoot")}
            </p>
          </aside>
        ) : null}

        <h2 className="font-display text-xl tracking-tight sm:text-2xl">
          {t("heat.whatTitle")}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          {t("heat.whatBody")}
        </p>
        <p className="mt-2 text-xs text-faint">{t("heat.whatAge")}</p>

        <div className="mt-6">
          <h3 className="font-display text-lg tracking-tight sm:text-xl">
            {t("heat.statTitle")}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
            {t("heat.statLead")}
          </p>
          <ol className="mt-4 grid gap-3 sm:grid-cols-3">
            <li className="rounded-lg border border-line bg-raised/40 p-4">
              <p className="font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
                01
              </p>
              <h4 className="mt-2 font-display text-base tracking-tight">
                {t("heat.statStep1Title")}
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {t("heat.statStep1Body")}
              </p>
            </li>
            <li className="rounded-lg border border-line bg-raised/40 p-4">
              <p className="font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
                02
              </p>
              <h4 className="mt-2 font-display text-base tracking-tight">
                {t("heat.statStep2Title")}
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {t("heat.statStep2Body")}
              </p>
            </li>
            <li className="rounded-lg border border-line bg-raised/40 p-4">
              <p className="font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
                03
              </p>
              <h4 className="mt-2 font-display text-base tracking-tight">
                {t("heat.statStep3Title")}
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {t("heat.statStep3Body")}
              </p>
            </li>
          </ol>
        </div>

        <div className="mt-6 max-w-3xl rounded-lg border border-gold/30 bg-raised/50 p-4 sm:p-5">
          <p className="font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
            {t("heat.statExampleKicker")}
          </p>
          <h3 className="mt-2 font-display text-lg tracking-tight">
            {t("heat.statExampleTitle")}
          </h3>

          <div className="mt-4 space-y-3">
            <StatBar
              label={t("heat.statPriorLabel")}
              value={SAMPLE.prior.toLocaleString()}
              width={priorPct}
              tone="paper"
            />
            <StatBar
              label={t("heat.statNowLabel")}
              value={SAMPLE.now.toLocaleString()}
              width={nowPct}
              tone="gold"
            />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCell label={t("heat.statClaimedLabel")} value={`−${SAMPLE.claimed}`} />
            <StatCell
              label={t("heat.statDropLabel")}
              value={`${SAMPLE.dropPct}% / ${SAMPLE.days}d`}
              neon
            />
            <StatCell label={t("heat.statPaceLabel")} value={t("pace.fast")} neon />
            <StatCell label={t("heat.statVaultLabel")} value={String(SAMPLE.vault)} />
            <StatCell label={t("heat.statBumpLabel")} value={`+${SAMPLE.lift}`} neon />
            <StatCell label={t("heat.statDeskLabel")} value={String(SAMPLE.desk)} accent />
          </dl>

          <p className="mt-4 text-sm leading-relaxed text-paper">
            {t("heat.statResult")}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted">{t("heat.statNote")}</p>
          <p className="mt-2 text-xs text-faint">{t("heat.statOdds")}</p>
        </div>

        <div className="mt-6 max-w-3xl">
          <h3 className="font-display text-lg tracking-tight">
            {t("heat.recipeTitle")}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {t("heat.recipeLead")}
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
            <li>{t("heat.recipe1")}</li>
            <li>{t("heat.recipe2")}</li>
            <li>{t("heat.recipe3")}</li>
          </ol>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {t("heat.recipeWhy")}
          </p>
        </div>
      </div>
    </section>
  );
}

function StatBar({
  label,
  value,
  width,
  tone,
}: {
  label: string;
  value: string;
  width: number;
  tone: "paper" | "gold";
}) {
  const bar = tone === "gold" ? "bg-gold" : "bg-paper/80";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs text-muted">{label}</p>
        <p className="font-mono text-sm tabular-nums text-paper">{value}</p>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function StatCell({
  label,
  value,
  accent = false,
  neon = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  neon?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className={neon ? "text-xs leading-snug text-neon/70" : "text-xs leading-snug text-faint"}>
        {label}
      </dt>
      <dd
        className={
          neon
            ? "mt-1 font-mono text-sm tabular-nums text-neon"
            : accent
              ? "mt-1 font-display text-xl tabular-nums tracking-tight text-gold"
              : "mt-1 font-mono text-sm tabular-nums text-paper"
        }
      >
        {value}
      </dd>
    </div>
  );
}
