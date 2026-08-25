import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { money } from "@/data/games";
import { publicCatalog } from "@/data/states";
import {
  DEFAULT_STATE_ID,
  type StateId,
  getState,
  isStateId,
} from "@/config/states";
import {
  inPriceFilter,
  pickOpeningFiveDollarGames,
  reportMap,
  sortGames,
  type PriceFilter,
  type SortKey,
} from "@/lib/heat";
import { getDeskSnapshot, type DeskSnapshot } from "@/lib/desk";
import { BandChip, TicketCard } from "@/components/ticket-card";
import { DeskReviewPanel } from "@/components/desk-review";
import { DisclaimerLead, DisclaimerPanel } from "@/components/disclaimer-panel";
import { RadarCashHero } from "@/components/radar-cash-hero";
import { UnlockStrip } from "@/components/unlock-strip";
import { DeskAlertBanner } from "@/components/desk-alert-banner";
import { TripCard } from "@/components/trip-card";
import { TrialCta } from "@/components/trial-cta";
import { StateSelector } from "@/components/state-selector";
import {
  HowTheDataWorks,
  HowThisHelps,
  ProductStory,
  WhatThisAppIs,
} from "@/components/product-story";
import { DataModeBanner } from "@/components/data-mode-banner";
import { TonightHeatStrip } from "@/components/tonight-heat-strip";
import { StateRulesNote } from "@/components/state-rules";
import { useAccess } from "@/lib/use-access";
import { useActiveState } from "@/lib/active-state";
import { writePricePref, pricePrefLabel } from "@/lib/price-pref";
import { SITE_DESCRIPTION, SITE_TITLE, pageHead } from "@/lib/site";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/locale";
import type { MessageKey } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  component: VaultHome,
  validateSearch: (search: Record<string, unknown>): { state?: StateId } => {
    if (isStateId(search.state)) return { state: search.state };
    return {};
  },
  head: () =>
    pageHead({
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      path: "/",
    }),
});

const FILTERS: { id: PriceFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "5", label: "$5" },
  { id: "10", label: "$10" },
  { id: "20", label: "$20" },
  { id: "25", label: "$25" },
  { id: "30", label: "$30" },
  { id: "50", label: "$50" },
];

const SORTS: { id: SortKey; labelKey: MessageKey }[] = [
  { id: "heat", labelKey: "home.sortHeat" },
  { id: "medium", labelKey: "home.sortMedium" },
  { id: "safest", labelKey: "home.sortSafest" },
  { id: "grand", labelKey: "home.sortGrand" },
  { id: "price", labelKey: "home.sortPrice" },
  { id: "name", labelKey: "home.sortName" },
];

function VaultHome() {
  const navigate = useNavigate({ from: "/" });
  const search = Route.useSearch();
  const { stateId, setStateId, config } = useActiveState();
  const { t } = useI18n();
  const [filter, setFilter] = useState<PriceFilter>("all");
  const [sort, setSort] = useState<SortKey>("safest");
  const [query, setQuery] = useState("");
  const { paid } = useAccess();
  const [snap, setSnap] = useState<DeskSnapshot | null>(null);
  const locked = !(snap?.paid ?? paid);
  const [lateNight, setLateNight] = useState(false);

  useEffect(() => {
    if (search.state && search.state !== stateId) {
      setStateId(search.state);
    }
  }, [search.state, setStateId, stateId]);

  useEffect(() => {
    let cancelled = false;
    setSnap(null);
    void getDeskSnapshot({ data: { stateId } })
      .then((next) => {
        if (!cancelled) setSnap(next);
      })
      .catch(() => {
        if (!cancelled) setSnap(null);
      });
    return () => {
      cancelled = true;
    };
  }, [paid, stateId]);

  const selectState = (id: StateId) => {
    setFilter("all");
    setStateId(id);
    void navigate({
      to: "/",
      search: id === DEFAULT_STATE_ID ? {} : { state: id },
      replace: true,
    });
  };

  useEffect(() => {
    try {
      const hour = Number(
        new Intl.DateTimeFormat("en-US", {
          hour: "numeric",
          hour12: false,
          timeZone: "America/Chicago",
        }).format(new Date()),
      );
      setLateNight(hour >= 23 || hour < 6);
    } catch {
      const hour = new Date().getHours();
      setLateNight(hour >= 23 || hour < 6);
    }
  }, []);

  const setPrice = (next: PriceFilter) => {
    setFilter(next);
    writePricePref(next);
  };

  const catalog = snap?.games ?? publicCatalog(stateId);
  const reports = useMemo(
    () => (snap ? reportMap(snap.reports) : new Map()),
    [snap],
  );
  const desk = snap?.desk ?? {
    byPrice: [],
    mediumLeaders: [],
    avoid: [],
    official: [],
    stats: {
      games: catalog.length,
      retailJackpots: 0,
      cashOuts: 0,
      busts: 0,
      officialTiers: 0,
    },
  };

  const openingFive = useMemo(
    () => pickOpeningFiveDollarGames(catalog, reports),
    [catalog, reports],
  );

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = catalog.filter((g) => {
      if (!inPriceFilter(g, filter)) return false;
      if (!q) return true;
      return (
        g.name.toLowerCase().includes(q) || String(g.number).includes(q)
      );
    });
    return sortGames(filtered, sort, reports);
  }, [catalog, filter, sort, query, reports]);

  const tripFilter: PriceFilter = filter === "all" ? "10" : filter;
  const tripGames = useMemo(() => {
    if (!snap) return [];
    const pool = catalog.filter((g) => inPriceFilter(g, tripFilter));
    return sortGames(pool, "medium", reports).slice(0, 3);
  }, [snap, catalog, tripFilter, reports]);

  const publicList = list;
  const prefLabel = pricePrefLabel(filter);

  return (
    <div>
      <StateSelector value={stateId} onChange={selectState} />
      <DataModeBanner
        state={snap ? getState(snap.stateId) : config}
        loadError={snap?.loadError}
        stale={snap?.stale}
        weekLabel={snap?.weekLabel}
      />
      <p className="border-b border-line px-4 py-2 text-center font-mono text-[10px] tracking-[0.16em] text-faint uppercase sm:px-6">
        {snap?.weekLabel ?? config.weekLabel} ·{" "}
        {t("home.tracked", {
          count: snap?.gameCount ?? catalog.length,
          short: config.shortName,
        })}
      </p>
      <TonightHeatStrip
        stateId={stateId}
        cards={snap?.tonight ?? []}
        depleted={snap?.tonightDepleted ?? false}
      />
      {lateNight ? (
        <p className="border-b border-line bg-raised/50 px-4 py-3 text-center text-sm text-muted sm:px-6">
          {t("home.lateNight")}
        </p>
      ) : null}
      <DeskAlertBanner />
      <ProductStory />
      <HowTheDataWorks />
      <HowThisHelps />
      <WhatThisAppIs />
      <StateRulesNote state={config} />
      <RadarCashHero
        priceFilter={filter}
        blips={snap?.blips ?? []}
        gameCount={snap?.gameCount ?? catalog.length}
        skipHref="#tonight"
        stateName={config.name}
        shortName={config.shortName}
        weekLabel={snap?.weekLabel ?? config.weekLabel}
        minAge={config.minAge}
      />

      <section id="tonight" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <p className="font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
            {t("tonight.kicker")}
          </p>
          <h2 className="mt-2 font-display text-2xl tracking-tight">
            {t("tonight.title")}
          </h2>
          {!snap ? (
            <p className="mt-4 text-muted">{t("home.loading")}</p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {openingFive.map((game) => {
                const heat = reports.get(game.number);
                if (!heat) return null;
                return (
                  <TicketCard
                    key={game.number}
                    game={game}
                    heat={heat}
                    locked={locked}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <p className="font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
            {prefLabel
              ? t("home.yourDesk", { price: prefLabel })
              : t("home.bestByPrice")}
          </p>
          <h2 className="mt-2 font-display text-2xl tracking-tight">
            {t("home.highest")}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {desk.byPrice.map((row) =>
              row.pick ? (
                <Link
                  key={row.price}
                  to="/game/$number"
                  params={{ number: String(row.pick.game.number) }}
                  search={{ state: stateId }}
                  className="min-h-11 rounded-lg border border-line bg-surface p-4 hover:border-gold/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-gold">{row.price}</span>
                    <BandChip band={row.pick.heat.band} />
                  </div>
                  <p className="mt-2 font-display text-lg leading-snug">
                    {row.pick.game.name}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {row.pick.why}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-faint">
                    {t("home.top", { prize: money(row.pick.game.topPrize) })}
                  </p>
                </Link>
              ) : (
                <div
                  key={row.price}
                  className="rounded-lg border border-line p-4 text-sm text-faint"
                >
                  {t("home.nothingPosted", { price: row.price })}
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      <section id="skip" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <p className="font-mono text-[10px] tracking-[0.16em] text-danger uppercase">
            {t("home.skipKicker")}
          </p>
          <h2 className="mt-2 font-display text-2xl tracking-tight">
            {t("home.skipTitle")}
          </h2>
          <ul className="mt-4 divide-y divide-line border border-line">
            {desk.avoid.slice(0, 3).map((p) => (
              <li key={p.game.number}>
                <Link
                  to="/game/$number"
                  params={{ number: String(p.game.number) }}
                  search={{ state: stateId }}
                  className="flex min-h-11 items-center justify-between gap-3 px-3 py-3 hover:bg-raised"
                >
                  <span className="truncate text-sm">
                    ${p.game.price} · {p.game.name}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] tracking-[0.14em] text-danger uppercase">
                    {t("home.skip")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <TripCard
        games={tripGames}
        reports={reports}
        filter={tripFilter}
        locked={locked}
      />

      <div id="desk">
        <DeskReviewPanel desk={desk} locked={locked} state={config} />
      </div>

      <UnlockStrip locked={locked} stats={snap?.stats} holdback={config.holdback} />

      <div className="sticky top-[57px] z-10 border-b border-line bg-bg/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-6">
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setPrice(f.id)}
                className={cn(
                  "min-h-11 min-w-11 rounded-md px-3 text-sm",
                  filter === f.id
                    ? "bg-gold text-accent-fg"
                    : "bg-surface text-muted hover:text-fg",
                )}
              >
                {f.id === "all" ? t("home.filterAll") : f.label}
              </button>
            ))}
          </div>
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-end">
            <label className="sr-only" htmlFor="q">
              {t("home.search")}
            </label>
            <input
              id="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("home.searchPh")}
              className="min-h-11 w-full rounded-md border border-line bg-surface px-3 text-sm text-fg placeholder:text-faint sm:max-w-56"
            />
            <label className="sr-only" htmlFor="sort">
              {t("home.sort")}
            </label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="min-h-11 rounded-md border border-line bg-surface px-3 text-sm text-fg"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {t(s.labelKey)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <main id="games" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <p className="text-sm text-faint">
            {locked
              ? t("home.gamesLocked", { count: list.length })
              : t("home.games", { count: list.length })}
          </p>
          <p className="rounded-md border border-line bg-surface px-3 py-2 font-mono text-xs tracking-wide text-muted uppercase">
            {t("inventory.updatedNotLive", { week: config.weekLabel })}
          </p>
        </div>
        {!snap ? (
          <p className="text-muted">{t("home.loading")}</p>
        ) : publicList.length === 0 ? (
          <p className="text-muted">{t("home.none")}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {publicList.map((game) => {
              const heat = reports.get(game.number);
              if (!heat) return null;
              return (
                <TicketCard
                  key={game.number}
                  game={game}
                  heat={heat}
                  locked={locked}
                />
              );
            })}
          </div>
        )}
        {locked ? (
          <div className="mt-6 flex flex-col items-start gap-3 rounded-lg border border-line bg-surface p-5">
            <p className="text-sm text-muted">
              {t("home.vaultTeaser")}
            </p>
            <TrialCta />
          </div>
        ) : (
          <p className="mt-8 text-sm text-muted">
            {t("home.done")}
          </p>
        )}

        <div className="mt-10 max-w-3xl">
          <p className="mb-3 font-mono text-[10px] tracking-[0.16em] text-faint uppercase">
            {t("home.fullDisclaimer")}
          </p>
          <DisclaimerLead />
          <div className="mt-4">
            <DisclaimerPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
