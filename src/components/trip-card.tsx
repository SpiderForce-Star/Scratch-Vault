import { Link } from "@tanstack/react-router";
import { money, type Game } from "@/data/games";
import { type HeatReport, type PriceFilter } from "@/lib/heat";
import { pricePrefLabel } from "@/lib/price-pref";
import { TrialCta } from "@/components/trial-cta";
import { useActiveState } from "@/lib/active-state";
import { useI18n } from "@/lib/locale";
import { heatBandKey } from "@/lib/i18n";

export function TripCard({
  games,
  reports,
  filter,
  locked,
}: {
  games: Game[];
  reports: Map<number, HeatReport>;
  filter: PriceFilter;
  locked: boolean;
}) {
  const { stateId } = useActiveState();
  const { t } = useI18n();
  const label = pricePrefLabel(filter) ?? t("home.sortPrice").toLowerCase();
  const picks = games.slice(0, 3);

  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <p className="font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
          {t("trip.kicker")}
        </p>
        <h2 className="mt-2 font-display text-2xl tracking-tight">
          {t("trip.title", { label })}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {t("trip.body")}
        </p>

        {locked ? (
          <div className="relative mt-4 overflow-hidden rounded-lg border border-line">
            <ul className="pointer-events-none select-none divide-y divide-line opacity-40">
              {picks.map((game) => (
                <TripRow
                  key={game.number}
                  game={game}
                  heat={reports.get(game.number)!}
                />
              ))}
            </ul>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg/60 px-4 text-center">
              <p className="text-sm text-muted">
                {t("trip.locked")}
              </p>
              <TrialCta />
            </div>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-line border border-line">
            {picks.map((game) => (
              <li key={game.number}>
                <Link
                  to="/game/$number"
                  params={{ number: String(game.number) }}
                  search={{ state: stateId }}
                  className="block min-h-11 hover:bg-raised"
                >
                  <TripRow game={game} heat={reports.get(game.number)!} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function TripRow({ game, heat }: { game: Game; heat: HeatReport }) {
  const { t } = useI18n();
  const mid = heat.midRemaining ?? heat.topRemaining;
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm text-fg">
          ${game.price} · {game.name}
        </p>
        <p className="font-mono text-[10px] text-faint uppercase">
          {t(heatBandKey(heat.band))}
          {mid != null ? ` · ${t("heat.mediumShort")} ${mid.toLocaleString()}` : ""}
          {` · ${t("home.top", { prize: money(game.topPrize) })}`}
        </p>
      </div>
      <span className="shrink-0 font-mono text-xs text-gold">
        {t("heat.score", { score: Math.round(heat.vault) })}
      </span>
    </div>
  );
}
