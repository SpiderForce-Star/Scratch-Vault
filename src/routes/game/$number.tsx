import { useEffect, useState } from "react";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { moneyFull } from "@/data/games";
import { findPublicGame, publicGameMatches } from "@/data/states";
import {
  DEFAULT_STATE_ID,
  getState,
  isStateId,
  type StateId,
} from "@/config/states";
import { getDeskSnapshot } from "@/lib/desk";
import type { HeatReport } from "@/lib/heat";
import { BandChip } from "@/components/ticket-card";
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
    if (isStateId(search.state)) return { state: search.state };
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
          "Independent remaining-prize desk. Game numbers can overlap across states. Remaining counts do not improve odds. 18+ (Arizona Lottery tickets are 21+).",
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

  return (
    <div>
      <DeskAlertBanner />
      <DataModeBanner state={state} />
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
          <TicketFace game={game} full />
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

        {heat.bust ? (
          <p className="mt-8 rounded-lg border border-bust/40 bg-bust-ink px-4 py-3 text-sm text-bust">
            {t("game.bust")}
          </p>
        ) : null}

        <PostedBookPanel game={game} heat={heat} locked={locked || !ready} />

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
