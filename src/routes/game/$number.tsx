import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { moneyFull } from "@/data/games";
import { findPublicGame, publicCatalog, publicGameMatches } from "@/data/states";
import {
  DEFAULT_STATE_ID,
  getState,
  isPublicStateId,
  type DataMode,
  type StateId,
} from "@/config/states";
import { getDeskSnapshot, type DeskSnapshot } from "@/lib/desk";
import {
  pickBetterPicks,
  pickSkipAtPrice,
  reportMap,
  type HeatReport,
} from "@/lib/heat";
import { BandChip, TicketCard } from "@/components/ticket-card";
import { TicketFace } from "@/components/ticket-face";
import { PostedBookPanel } from "@/components/posted-book";
import { DeskAlertBanner } from "@/components/desk-alert-banner";
import { DataModeBanner } from "@/components/data-mode-banner";
import { StateRulesCompact } from "@/components/state-rules";
import { pageHead } from "@/lib/site";
import { useActiveState } from "@/lib/active-state";
import { useI18n } from "@/lib/locale";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/game/$number")({
  component: GameDetail,
  validateSearch: (search: Record<string, unknown>): { state?: StateId } => {
    if (isPublicStateId(search.state)) return { state: search.state };
    return {};
  },
  head: ({ params, match }) => {
    const searchState = match.search?.state;
    const collisions = publicGameMatches(params.number);
    const found = findPublicGame(params.number, searchState);
    if (!found) {
      return pageHead({
        title: "Game not found",
        path: `/game/${params.number}`,
        noindex: true,
      });
    }
    const ambiguous = !searchState && collisions.length > 1;
    if (ambiguous) {
      return pageHead({
        title: `Game #${found.game.number} remaining prizes`,
        description:
          "Independent remaining-prize desk. Game numbers can overlap across states. Remaining counts do not improve odds. 18+ (Iowa Lottery tickets are 21+).",
        path: `/game/${found.game.number}`,
        noindex: true,
      });
    }
    const state = getState(found.stateId);
    const path =
      found.stateId === DEFAULT_STATE_ID
        ? `/game/${found.game.number}`
        : `/game/${found.game.number}?state=${found.stateId}`;
    return pageHead({
      title: `${found.game.name} remaining prizes · ${state.shortName} #${found.game.number}`,
      description: `Posted remaining prizes for ${found.game.name}, a $${found.game.price} ${state.name} scratch-off. Independent desk. Remaining counts do not improve odds. ${state.minAge}+ to buy ${state.shortName} tickets.`,
      path,
    });
  },
});

const EMPTY_HEAT: HeatReport = {
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

function GameDetail() {
  const { number } = Route.useParams();
  const search = Route.useSearch();
  const { stateId: activeStateId, setStateId } = useActiveState();
  const { t } = useI18n();
  const preferred = search.state ?? activeStateId;
  const listed = findPublicGame(number, preferred);
  if (!listed) throw notFound();
  const state = getState(listed.stateId);
  const [game, setGame] = useState(listed.game);
  const [heat, setHeat] = useState<HeatReport>(EMPTY_HEAT);
  const [locked, setLocked] = useState(true);
  const [ready, setReady] = useState(false);
  const [dataMode, setDataMode] = useState<DataMode>(state.dataMode);
  const [desk, setDesk] = useState<DeskSnapshot | null>(null);

  useEffect(() => {
    if (listed.stateId !== activeStateId) setStateId(listed.stateId);
  }, [listed.stateId, activeStateId, setStateId]);

  useEffect(() => {
    let cancelled = false;
    const fallback = listed.game;
    const stateKey = listed.stateId;
    void getDeskSnapshot({ data: { stateId: stateKey } })
      .then((snap) => {
        if (cancelled) return;
        const next = snap.games.find((g) => String(g.number) === number) ?? fallback;
        setGame(next);
        setHeat(snap.reports[String(next.number)] ?? EMPTY_HEAT);
        setLocked(!snap.paid);
        setDataMode(snap.dataMode);
        setDesk(snap);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
    // listed.game is rebuilt each render; number + stateId uniquely identify it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [number, listed.stateId]);

  const catalog = useMemo(
    () => desk?.games ?? publicCatalog(listed.stateId),
    [desk, listed.stateId],
  );
  const reports = useMemo(() => {
    if (desk) return reportMap(desk.reports);
    return new Map(catalog.map((row) => [row.number, EMPTY_HEAT]));
  }, [desk, catalog]);
  const better = useMemo(
    () => pickBetterPicks(catalog, reports, game.price, game.number, 4),
    [catalog, reports, game.price, game.number],
  );
  const skipAt = useMemo(
    () => pickSkipAtPrice(catalog, reports, game.price, game.number, 4),
    [catalog, reports, game.price, game.number],
  );

  return (
    <div>
      <DeskAlertBanner />
      <DataModeBanner state={state} dataMode={dataMode} />
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          to="/"
          search={state.id === DEFAULT_STATE_ID ? {} : { state: state.id }}
          className="inline-flex min-h-11 items-center gap-2 text-sm text-muted hover:text-fg"
        >
          <ArrowLeft className="size-4" />
          {t("game.back")}
        </Link>

        <div className="mt-6 overflow-hidden rounded-xl border border-line bg-surface">
          <TicketFace game={game} full officialUrl={state.remainingPrizesUrl} />
          <div className="flex items-start justify-between gap-3 p-6">
            <div>
              <p className="font-mono text-xs text-faint">
                Game #{game.number} · ${game.price}
              </p>
              <h1 className="mt-2 font-display text-3xl tracking-tight">
                {game.name}
              </h1>
              <p className="mt-2 text-muted">
                {t("odds.overall", {
                  prize: moneyFull(game.topPrize),
                  odds: game.odds.toFixed(2),
                })}
                {state.dataMode === "sample"
                  ? t("odds.sample")
                  : state.dataMode === "compiled"
                    ? t("odds.confirm")
                    : ""}
              </p>
            </div>
            <BandChip band={heat.band} />
          </div>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-faint">
          {t("game.art", { lottery: state.lotteryShort })}
        </p>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <HeatPanel
            title={t("heat.vaultScore")}
            value={heat.vault}
            note={
              heat.role === "cash-out"
                ? t("heat.cashOut")
                : t("heat.combined")
            }
            tone="hot"
          />
          <HeatPanel
            title={state.holdback ? t("heat.grandRetail") : t("heat.grandListed")}
            value={heat.grand}
            note={
              heat.role === "jackpot"
                ? state.holdback
                  ? t("heat.postedHoldback", {
                      posted: heat.topRemaining ?? "—",
                      effective: heat.effectiveTop ?? "—",
                      label: state.holdback.label,
                    })
                  : t("heat.postedTop", {
                      count: heat.topRemaining ?? "—",
                      s: heat.topRemaining === 1 ? "" : "s",
                      es: heat.topRemaining === 1 ? "" : "s",
                    })
                : t("heat.notJackpot")
            }
            tone="hot"
          />
          <HeatPanel
            title={heat.mediumKnown ? t("heat.medium") : t("heat.mediumEst")}
            value={heat.medium}
            note={t("heat.mediumNote")}
            tone="warm"
          />
        </section>

        {heat.role === "jackpot" && state.holdback ? (
          <section className="mt-8 rounded-lg border border-line bg-surface p-5">
            <p className="font-mono text-[10px] tracking-[0.16em] text-faint uppercase">
              {state.holdback.label}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {t("holdback.pia")}{" "}
              {t("holdback.posted", {
                posted: heat.topRemaining ?? "—",
                effective: heat.effectiveTop ?? "—",
              })}
            </p>
          </section>
        ) : null}

        {heat.band === "new" ? (
          <p className="mt-8 rounded-lg border border-gold/40 bg-[#14240c] px-4 py-3 text-sm text-[#c8e08a]">
            {t("game.unposted")}
          </p>
        ) : heat.bust ? (
          <p className="mt-8 rounded-lg border border-bust/40 bg-bust-ink px-4 py-3 text-sm text-bust">
            {t("game.bust")}
          </p>
        ) : null}

        <PostedBookPanel game={game} heat={heat} locked={locked || !ready} />

        {better.length ? (
          <section className="mt-10">
            <h2 className="font-display text-2xl tracking-tight">
              {t("games.betterPicks", { price: game.price })}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {better.map((row) => {
                const rowHeat = reports.get(row.number);
                if (!rowHeat) return null;
                return (
                  <TicketCard
                    key={`better-${row.number}`}
                    game={row}
                    heat={rowHeat}
                    locked={locked || !ready}
                  />
                );
              })}
            </div>
          </section>
        ) : null}

        {skipAt.length ? (
          <section className="mt-10">
            <h2 className="font-display text-2xl tracking-tight">
              {t("games.skipAtPrice", { price: game.price })}
            </h2>
            <ul className="mt-4 divide-y divide-line border border-line">
              {skipAt.map((row) => {
                const rowHeat = reports.get(row.number);
                return (
                  <li key={`skip-${row.number}`}>
                    <Link
                      to="/game/$number"
                      params={{ number: String(row.number) }}
                      search={state.id === DEFAULT_STATE_ID ? {} : { state: state.id }}
                      className="flex min-h-11 items-center justify-between gap-3 px-3 py-3 hover:bg-raised"
                    >
                      <span className="truncate text-sm">
                        ${row.price} · {row.name}
                      </span>
                      {rowHeat ? <BandChip band={rowHeat.band} /> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <p className="mt-8">
          <Link
            to="/games"
            search={state.id === DEFAULT_STATE_ID ? {} : { state: state.id }}
            className="font-mono text-sm tracking-wide text-gold underline underline-offset-4 hover:text-paper"
          >
            {t("games.seeAll")}
          </Link>
        </p>

        <StateRulesCompact state={state} />

        <p className="mt-10 pb-10 text-sm leading-relaxed text-faint">
          {t("game.footer", {
            lottery: state.lotteryShort,
            holdback: state.holdback
              ? t("game.holdbackNote", { label: state.holdback.label })
              : "",
            age: String(state.minAge),
            short: state.shortName,
          })}
        </p>
      </div>
    </div>
  );
}

function HeatPanel({
  title,
  value,
  note,
  tone,
}: {
  title: string;
  value: number;
  note: string;
  tone: "hot" | "warm";
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <p className="text-sm text-muted">{title}</p>
      <p className="mt-2 font-display text-4xl tabular-nums">
        {Math.round(value)}
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-raised">
        <div
          className={tone === "hot" ? "h-full bg-hot" : "h-full bg-warm"}
          style={{ width: `${Math.max(4, value)}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-faint">{note}</p>
    </div>
  );
}
