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
  pickSkipGames,
  pickTripGames,
  reportMap,
  sortGames,
  type HeatReport,
  type PriceFilter,
  type SortKey,
} from "@/lib/heat";
import { getDeskSnapshot, type DeskSnapshot } from "@/lib/desk";
import { BandChip, TicketCard } from "@/components/ticket-card";
import { StateSelector } from "@/components/state-selector";
import { DataModeBanner } from "@/components/data-mode-banner";
import { useAccess } from "@/lib/use-access";
import { useActiveState } from "@/lib/active-state";
import { readPricePref, writePricePref, pricePrefLabel } from "@/lib/price-pref";
import { SITE_DESCRIPTION, SITE_TITLE, pageHead } from "@/lib/site";
import { cn } from "@/lib/utils";
import { skipNameLocked } from "@/lib/skip-teaser";
import { useI18n } from "@/lib/locale";
import type { MessageKey } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  component: VaultHome,
  validateSearch: (search: Record<string, unknown>): { state?: StateId } => {
    if (isPublicStateId(search.state)) return { state: search.state };
    return {};
  },
  loaderDeps: ({ search }) => ({
    stateId: search.state ?? DEFAULT_STATE_ID,
  }),
  loader: async ({ deps }): Promise<DeskSnapshot | null> => {
    try {
      return await getDeskSnapshot({ data: { stateId: deps.stateId } });
    } catch {
      return null;
    }
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
  const loadedSnap = Route.useLoaderData();
  const { stateId, setStateId, config, setDeskMode } = useActiveState();
  const { t } = useI18n();
  const [filter, setFilter] = useState<PriceFilter>("10");
  const [sort, setSort] = useState<SortKey>("safest");
  const [query, setQuery] = useState("");
  const { paid } = useAccess();
  const [snap, setSnap] = useState<DeskSnapshot | null>(loadedSnap);
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
    let cancelled = false;
    void getDeskSnapshot({ data: { stateId } })
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
  }, [paid, stateId, setDeskMode]);

  const selectState = (id: StateId) => {
    setStateId(id);
    void navigate({
      to: "/",
      search: id === DEFAULT_STATE_ID ? {} : { state: id },
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

  const catalog = snap?.games ?? publicCatalog(stateId);
  const reports = useMemo(() => {
    if (snap) return reportMap(snap.reports);
    return new Map(catalog.map((game) => [game.number, FALLBACK_HEAT]));
  }, [snap, catalog]);

  const tripGames = useMemo(
    () => pickTripGames(catalog, reports, filter, 3),
    [catalog, reports, filter],
  );
  const skipGames = useMemo(
    () => pickSkipGames(catalog, reports, filter, 5),
    [catalog, reports, filter],
  );

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = catalog.filter((g) => {
      if (!q) return true;
      return (
        g.name.toLowerCase().includes(q) || String(g.number).includes(q)
      );
    });
    return sortGames(filtered, sort, reports);
  }, [catalog, sort, query, reports]);

  const priceLabel = pricePrefLabel(filter) ?? "$10";

  return (
    <div>
      <StateSelector value={stateId} onChange={selectState} />
      <DataModeBanner
        state={snap ? getState(snap.stateId) : config}
        dataMode={snap?.dataMode}
        loadError={snap?.loadError}
        stale={snap?.stale}
        weekLabel={snap?.weekLabel}
      />

      <section id="desk" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
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
          {skipGames.length === 0 ? (
            <p className="mt-4 text-sm text-muted">{t("home.skipEmpty")}</p>
          ) : (
            <ul className="mt-4 divide-y divide-line border border-line">
              {skipGames.map((game, index) => {
                const heat = reports.get(game.number);
                const hideName = skipNameLocked(index, !locked);
                const chip = heat ? (
                  <BandChip band={heat.band} />
                ) : (
                  <span className="shrink-0 font-mono text-[10px] tracking-[0.14em] text-danger uppercase">
                    {t("home.skip")}
                  </span>
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
                        search={{ state: stateId }}
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
              to="/disclaimer"
              className="text-sm text-muted underline underline-offset-2 hover:text-fg"
            >
              {t("home.fullDisclaimer")}
            </Link>
          </p>
        </div>
      </section>

      <details id="games" className="border-b border-line">
        <summary className="mx-auto flex max-w-6xl min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-left sm:px-6 [&::-webkit-details-marker]:hidden">
          <span className="font-display text-xl tracking-tight">
            {t("home.allGames")}
          </span>
          <span className="font-mono text-xs text-faint uppercase">
            {locked
              ? t("home.gamesLocked", { count: catalog.length })
              : t("home.games", { count: catalog.length })}
          </span>
        </summary>
        <div className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
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
          {list.length === 0 ? (
            <p className="text-muted">{t("home.none")}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((game) => {
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
            <p className="mt-6 text-sm text-muted">{t("home.vaultTeaser")}</p>
          ) : null}
        </div>
      </details>
    </div>
  );
}
