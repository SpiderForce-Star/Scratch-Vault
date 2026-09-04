import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { publicCatalog } from "@/data/states";
import {
  DEFAULT_STATE_ID,
  type StateId,
  getState,
  isPublicStateId,
} from "@/config/states";
import {
  pickNewGames,
  pickSkipGames,
  pickTripGames,
  reportMap,
  skipChipBand,
  type HeatReport,
  type PriceFilter,
} from "@/lib/heat";
import { getDeskSnapshot, getRadarScope, type DeskSnapshot } from "@/lib/desk";
import { EMPTY_RADAR, type RadarScopePayload } from "@/lib/radar";
import { BandChip, NewGameChip, TicketCard } from "@/components/ticket-card";
import { TicketFace } from "@/components/ticket-face";
import { RadarCashHero } from "@/components/radar-cash-hero";
import { StateSelector } from "@/components/state-selector";
import { DataModeBanner } from "@/components/data-mode-banner";
import { useAccess } from "@/lib/use-access";
import { deskPageSearch, deskSearch, useActiveState } from "@/lib/active-state";
import { readPricePref, writePricePref, pricePrefLabel } from "@/lib/price-pref";
import { SITE_DESCRIPTION, SITE_TITLE, pageHead } from "@/lib/site";
import { cn } from "@/lib/utils";
import { skipNameLocked } from "@/lib/skip-teaser";
import { useI18n } from "@/lib/locale";

export const Route = createFileRoute("/")({
  component: VaultHome,
  validateSearch: (search: Record<string, unknown>): { state?: StateId } => {
    if (isPublicStateId(search.state)) return { state: search.state };
    return {};
  },
  loaderDeps: ({ search }) => ({
    stateId: search.state ?? DEFAULT_STATE_ID,
  }),
  loader: async ({ deps }): Promise<{ desk: DeskSnapshot | null; radar: RadarScopePayload }> => {
    const [desk, radar] = await Promise.all([
      getDeskSnapshot({ data: { stateId: deps.stateId } }).catch(() => null),
      getRadarScope({ data: { stateId: deps.stateId } }).catch(() => ({
        ...EMPTY_RADAR,
        stateId: deps.stateId,
      })),
    ]);
    return { desk, radar: radar ?? { ...EMPTY_RADAR, stateId: deps.stateId } };
  },
  head: () =>
    pageHead({
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      path: "/",
    }),
});

const FILTERS: { id: PriceFilter; label: string }[] = [
  { id: "5", label: "$5" },
  { id: "10", label: "$10" },
  { id: "20", label: "$20" },
  { id: "25", label: "$25" },
  { id: "30", label: "$30" },
  { id: "50", label: "$50" },
];

const FALLBACK_HEAT: HeatReport = {
  grand: 0,
  medium: 0,
  vault: 0,
  band: "cool",
  bust: false,
  mediumKnown: false,
  role: "jackpot",
  topRemaining: null,
  effectiveTop: null,
  midRemaining: null,
  lowRemaining: null,
};

function VaultHome() {
  const navigate = useNavigate({ from: "/" });
  const search = Route.useSearch();
  const loaded = Route.useLoaderData();
  const loadedSnap = loaded?.desk ?? null;
  const loadedRadar = loaded?.radar ?? EMPTY_RADAR;
  const { stateId, setStateId, setDeskMode } = useActiveState();
  const viewState = search.state ?? stateId;
  const { t } = useI18n();
  const [filter, setFilter] = useState<PriceFilter>("10");
  const { paid } = useAccess();
  const [snap, setSnap] = useState<DeskSnapshot | null>(loadedSnap);
  const [radar, setRadar] = useState<RadarScopePayload>(loadedRadar);
  const locked = !(snap?.paid ?? paid);

  useEffect(() => {
    if (search.state && search.state !== stateId) {
      setStateId(search.state);
    }
  }, [search.state, setStateId, stateId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = new URLSearchParams(window.location.search).get("state");
    if (raw && !isPublicStateId(raw)) {
      void navigate({ to: "/", search: {}, replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!loadedSnap) return;
    setSnap(loadedSnap);
    setDeskMode(loadedSnap.dataMode);
  }, [loadedSnap, setDeskMode]);

  useEffect(() => {
    setRadar(loadedRadar);
  }, [loadedRadar]);

  useEffect(() => {
    let cancelled = false;
    void getDeskSnapshot({ data: { stateId: viewState } })
      .then((next) => {
        if (cancelled) return;
        setSnap(next);
        setDeskMode(next.dataMode);
      })
      .catch(() => {
        /* keep loader snapshot — do not stick on “Loading the desk…” */
      });
    return () => {
      cancelled = true;
    };
  }, [paid, viewState, setDeskMode]);

  useEffect(() => {
    let cancelled = false;
    void getRadarScope({ data: { stateId: viewState } })
      .then((next) => {
        if (!cancelled) setRadar(next);
      })
      .catch(() => {
        /* keep loader radar */
      });
    return () => {
      cancelled = true;
    };
  }, [viewState]);

  const selectState = (id: StateId) => {
    setStateId(id);
    void navigate({
      to: "/",
      search: deskPageSearch(id),
      replace: true,
    });
  };

  useEffect(() => {
    const pref = readPricePref();
    if (pref) setFilter(pref);
  }, []);

  const setPrice = (next: PriceFilter) => {
    setFilter(next);
    writePricePref(next);
  };

  const catalog = snap?.games ?? publicCatalog(viewState);
  const reports = useMemo(() => {
    if (snap) return reportMap(snap.reports);
    return new Map(catalog.map((game) => [game.number, FALLBACK_HEAT]));
  }, [snap, catalog]);

  const tripGames = useMemo(
    () => pickTripGames(catalog, reports, filter, 3),
    [catalog, reports, filter],
  );
  const skipGames = useMemo(
    () =>
      pickSkipGames(
        catalog,
        reports,
        filter,
        5,
        tripGames.map((game) => game.number),
      ),
    [catalog, reports, filter, tripGames],
  );
  const newGames = useMemo(
    () => pickNewGames(catalog, reports, 8),
    [catalog, reports],
  );

  const priceLabel = pricePrefLabel(filter) ?? "$10";

  return (
    <div>
      <StateSelector value={viewState} onChange={selectState} />
      <DataModeBanner
        state={snap ? getState(snap.stateId) : getState(viewState)}
        dataMode={snap?.dataMode}
        loadError={snap?.loadError}
        stale={snap?.stale}
      />

      <section id="desk" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
            <RadarCashHero
              key={viewState}
              stateId={viewState}
              captures={radar.captures}
              contacts={radar.contacts}
              cycleId={radar.cycleId}
              bleeps={radar.bleeps}
            />
            <div className="min-w-0">
              <div className="mb-4 flex flex-wrap gap-1">
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
                    {f.label}
                  </button>
                ))}
              </div>
              {newGames.length > 0 ? (
                <div className="mb-6">
                  <p className="font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
                    {t("home.newKicker")}
                  </p>
                  <h2 className="mt-1 font-display text-xl tracking-tight">
                    {t("home.newTitle")}
                  </h2>
                  <p className="mt-1 text-sm text-muted">{t("home.newSub")}</p>
                  <div className="-mx-1 mt-3 flex gap-3 overflow-x-auto pb-2">
                    {newGames.map((game) => {
                      const heat = reports.get(game.number);
                      if (!heat) return null;
                      return (
                        <Link
                          key={`new-${game.number}`}
                          to="/game/$number"
                          params={{ number: String(game.number) }}
                          search={deskSearch(game.stateId ?? viewState)}
                          className="w-56 shrink-0 overflow-hidden rounded-xl border border-gold/40 bg-surface hover:border-gold"
                        >
                          <div className="relative">
                            <TicketFace game={game} />
                            <NewGameChip className="absolute top-2 left-2 z-10" />
                            <BandChip
                              band={heat.band}
                              className="absolute top-2 right-2 z-10"
                            />
                          </div>
                          <div className="p-3">
                            <p className="font-mono text-[10px] tracking-[0.14em] text-gold uppercase">
                              ${game.price}
                            </p>
                            <p className="mt-1 truncate font-display text-base leading-snug">
                              {game.name}
                            </p>
                            <p className="mt-1 font-mono text-[10px] text-faint uppercase">
                              #{game.number}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <p className="font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
                {t("trip.kicker", { price: priceLabel })}
              </p>
              <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
                {t("trip.title")}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
                {t("trip.body")}
              </p>
              {tripGames.length === 0 ? (
                <p className="mt-4 text-muted">
                  {t("home.nothingPosted", { price: priceLabel })}
                </p>
              ) : (
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  {tripGames.map((game) => {
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
              <p className="mt-5">
                <Link
                  to="/games"
                  search={deskPageSearch(viewState)}
                  className="font-mono text-sm tracking-wide text-gold underline underline-offset-4 hover:text-paper"
                >
                  {t("games.seeAll")}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="skip" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <h2 className="font-display text-4xl tracking-[0.16em] text-gold uppercase sm:text-6xl [text-shadow:0_0_28px_rgb(196,92,74,0.45)]">
            {t("home.skipKicker")}
          </h2>
          <p className="mt-3 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
            {t("home.skipTitle")}
          </p>
          {skipGames.length === 0 ? (
            <p className="mt-4 text-sm text-muted">{t("home.skipEmpty")}</p>
          ) : (
            <ul className="mt-4 divide-y divide-line border border-line">
              {skipGames.map((game, index) => {
                const heat = reports.get(game.number);
                const hideName = skipNameLocked(index, !locked);
                const chip = (
                  <BandChip band={heat ? skipChipBand(heat) : "bust"} />
                );
                const label = (
                  <span className="flex min-w-0 items-center gap-2 truncate text-sm">
                    <span className="shrink-0">${game.price} ·</span>
                    {hideName ? (
                      <span
                        className="inline-block max-w-[14rem] truncate blur-[8px] select-none"
                        aria-hidden
                      >
                        {t("home.skipHidden")}
                      </span>
                    ) : (
                      <span className="truncate">{game.name}</span>
                    )}
                  </span>
                );
                return (
                  <li key={`${game.stateId ?? stateId}-${game.number}`}>
                    {hideName ? (
                      <Link
                        to="/pricing"
                        aria-label={t("home.skipLockedAria")}
                        className="flex min-h-11 items-center justify-between gap-3 px-3 py-3 hover:bg-raised"
                      >
                        {label}
                        {chip}
                      </Link>
                    ) : (
                      <Link
                        to="/game/$number"
                        params={{ number: String(game.number) }}
                        search={deskSearch(game.stateId ?? viewState)}
                        className="flex min-h-11 items-center justify-between gap-3 px-3 py-3 hover:bg-raised"
                      >
                        {label}
                        {chip}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <p className="font-display text-2xl tracking-tight sm:text-3xl">
            {t("home.done")}
          </p>
          <p className="mt-3">
            <Link
              to="/games"
              search={deskPageSearch(viewState)}
              className="font-mono text-sm tracking-wide text-gold underline underline-offset-4 hover:text-paper"
            >
              {t("games.seeAll")}
            </Link>
          </p>
          <p className="mt-3">
            <Link
              to="/disclaimer"
              className="text-sm text-muted underline underline-offset-2 hover:text-fg"
            >
              {t("home.fullDisclaimer")}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
