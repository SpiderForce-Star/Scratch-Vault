import type { CatalogHeatStats } from "@/lib/heat";
import { useI18n } from "@/lib/locale";

export function LeftoverDecayStrip({
  stats,
  locked = false,
}: {
  stats: CatalogHeatStats | null | undefined;
  locked?: boolean;
}) {
  const { t } = useI18n();
  if (!stats?.games) return null;
  const leftover = stats.leftover;
  const mean =
    !locked && leftover.meanPct16 != null
      ? leftover.meanPct16.toFixed(1)
      : null;

  return (
    <section className="border-b border-line bg-raised/30">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
        <p className="font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
          {t("decay.kicker")}
        </p>
        <h2 className="mt-1 font-display text-xl tracking-tight sm:text-2xl">
          {t("decay.title")}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          {t("decay.body")}
        </p>
        <p className="mt-2 font-display text-lg tracking-tight text-gold sm:text-xl">
          {t("decay.heatLine", { score: Math.round(stats.heat) })}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <DecayStat label={t("pace.fast")} value={String(leftover.fast)} hot />
          <DecayStat label={t("pace.moving")} value={String(leftover.moving)} hot />
          <DecayStat label={t("pace.quiet")} value={String(leftover.quiet)} />
          <DecayStat label={t("pace.still")} value={String(leftover.still)} />
          <DecayStat label={t("decay.movers")} value={String(leftover.movers)} hot />
          <DecayStat
            label={t("decay.mean")}
            value={mean != null ? t("decay.meanPct", { pct: mean }) : t("decay.meanNone")}
          />
        </dl>
        <p className="mt-3 text-xs leading-relaxed text-faint">{t("decay.foot")}</p>
      </div>
    </section>
  );
}

function DecayStat({
  label,
  value,
  hot = false,
}: {
  label: string;
  value: string;
  hot?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-line bg-bg px-3 py-3">
      <dt className="font-mono text-[10px] tracking-[0.14em] text-faint uppercase">
        {label}
      </dt>
      <dd
        className={
          hot
            ? "mt-1 font-display text-2xl tabular-nums text-gold"
            : "mt-1 font-display text-2xl tabular-nums text-fg"
        }
      >
        {value}
      </dd>
    </div>
  );
}
