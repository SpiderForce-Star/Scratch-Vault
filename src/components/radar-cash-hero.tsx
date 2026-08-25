import { useEffect, useState } from "react";
import { money } from "@/data/games";
import { DESK_META } from "@/data/desk-meta";
import type { CashBlip, PriceFilter } from "@/lib/heat";
import { useDeskAlert } from "@/lib/use-desk-alert";
import { deskNotifyEnabled } from "@/lib/desk-alert";
import { TrialCta } from "@/components/trial-cta";
import { useAccess } from "@/lib/use-access";
import { pricePrefLabel } from "@/lib/price-pref";
import { useI18n } from "@/lib/locale";

const SIZE = 360;
const CX = SIZE / 2;
const CY = SIZE / 2;

export function RadarCashHero({
  priceFilter = "all",
  blips = [],
  gameCount = 0,
  skipHref = "#tonight",
  stateName = "Tennessee",
  shortName = "TN",
  weekLabel = DESK_META.weekLabel,
  minAge = 18,
}: {
  priceFilter?: PriceFilter;
  blips?: CashBlip[];
  gameCount?: number;
  skipHref?: string;
  stateName?: string;
  shortName?: string;
  weekLabel?: string;
  minAge?: 18 | 21;
}) {
  const { unseen, markSeen, reviewDesk } = useDeskAlert();
  const { paid } = useAccess();
  const { t } = useI18n();
  const priceLabel = pricePrefLabel(priceFilter);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduce(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!unseen || reduce || !deskNotifyEnabled()) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 880;
      gain.gain.value = 0.04;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      window.setTimeout(() => {
        osc.stop();
        void ctx.close();
      }, 120);
    } catch {
      /* default mute if audio is blocked */
    }
  }, [unseen, reduce]);

  return (
    <section className="border-b border-line">
      <div className="mx-auto grid max-w-[1120px] items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,400px)_1fr] lg:py-14">
        <div className="mx-auto w-full max-w-[320px] min-w-0 sm:max-w-[360px] lg:max-w-none">
          <RadarScope
            blips={blips}
            reduce={reduce}
            alert={unseen}
            stateName={stateName}
          />
          <p className="mt-3 overflow-hidden text-center font-mono text-[10px] tracking-[0.14em] text-gold uppercase">
            {unseen
              ? t("hero.newDrop", { week: weekLabel })
              : t("hero.scanning", {
                  short: shortName,
                  count: gameCount,
                  week: weekLabel,
                })}
          </p>
          {unseen ? (
            <div className="mt-3 rounded-md border border-gold/40 bg-gold/10 px-3 py-3 text-center">
              <p className="text-sm leading-relaxed text-paper">
                {t("hero.newCounts")}
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() => reviewDesk()}
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-gold px-4 text-sm font-medium text-accent-fg"
                >
                  {t("hero.review")}
                </button>
                <button
                  type="button"
                  onClick={() => markSeen()}
                  className="inline-flex min-h-11 items-center justify-center px-3 text-sm text-muted underline underline-offset-4 hover:text-paper"
                >
                  {t("hero.dismiss")}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="min-w-0">
          <p className="font-mono text-xs tracking-[0.16em] text-gold uppercase">
            {t("hero.independent", { name: stateName })}
          </p>
          <h1 className="mt-3 font-display text-4xl leading-tight tracking-tight text-paper sm:text-5xl">
            {priceLabel
              ? t("hero.titlePrice", { price: priceLabel })
              : t("hero.titleAll")}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            {t("hero.body")}
          </p>
          <p className="mt-3 font-mono text-[10px] tracking-[0.12em] text-faint uppercase">
            {t("hero.meta", { age: `${minAge}+` })}
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            {paid ? null : <TrialCta />}
            <a
              href={skipHref}
              className="inline-flex min-h-11 items-center justify-center px-2 text-sm text-sage underline underline-offset-4 hover:text-paper"
            >
              {t("hero.tonight")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function RadarScope({
  blips,
  reduce,
  alert,
  stateName,
}: {
  blips: CashBlip[];
  reduce: boolean;
  alert: boolean;
  stateName: string;
}) {
  const rings = [56, 96, 136, 168];
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="block h-auto w-full overflow-visible"
      role="img"
      aria-label={`${stateName} remaining-prize radar`}
    >
      <defs>
        <radialGradient id="vsv-scope" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#141a16" />
          <stop offset="100%" stopColor="#0b0f0c" />
        </radialGradient>
        <linearGradient id="vsv-beam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#c4a574" stopOpacity="0" />
          <stop offset="55%" stopColor="#7c9a72" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#c4a574" stopOpacity="0.18" />
        </linearGradient>
      </defs>

      <circle cx={CX} cy={CY} r={174} fill="url(#vsv-scope)" stroke="#2a332c" />
      {alert ? (
        <>
          <circle
            cx={CX}
            cy={CY}
            r={176}
            fill="none"
            stroke="#c4a574"
            style={{
              animation: reduce ? undefined : "vsv-contact 1.6s ease-in-out infinite",
            }}
          />
          <text
            x={CX}
            y={22}
            textAnchor="middle"
            fill="#c4a574"
            fontSize="8"
            fontFamily="IBM Plex Mono, ui-monospace, monospace"
            letterSpacing="2"
          >
            CONTACT
          </text>
        </>
      ) : null}
      {rings.map((r) => (
        <circle
          key={r}
          cx={CX}
          cy={CY}
          r={r}
          fill="none"
          stroke="#7c9a72"
          strokeOpacity="0.22"
          strokeWidth="0.75"
        />
      ))}
      {Array.from({ length: 36 }, (_, i) => {
        const a = (i * 10 * Math.PI) / 180;
        const inner = i % 3 === 0 ? 168 : 172;
        return (
          <line
            key={i}
            x1={CX + Math.cos(a) * inner}
            y1={CY + Math.sin(a) * inner}
            x2={CX + Math.cos(a) * 174}
            y2={CY + Math.sin(a) * 174}
            stroke="#c4a574"
            strokeOpacity={i % 3 === 0 ? 0.35 : 0.16}
            strokeWidth="0.8"
          />
        );
      })}

      <g
        style={{
          transformOrigin: `${CX}px ${CY}px`,
          animation: reduce
            ? undefined
            : `vsv-radar-sweep ${alert ? "4s" : "5.5s"} linear infinite`,
        }}
      >
        <path
          d={`M ${CX} ${CY} L ${CX} ${CY - 170} A 170 170 0 0 1 ${CX + 92} ${CY - 143} Z`}
          fill="url(#vsv-beam)"
        />
        <line
          x1={CX}
          y1={CY}
          x2={CX}
          y2={CY - 170}
          stroke="#c4a574"
          strokeOpacity="0.7"
          strokeWidth="1.2"
        />
      </g>

      {blips.map((blip) => {
        const rad = ((blip.angle - 90) * Math.PI) / 180;
        const r = blip.radius * 168;
        const x = CX + Math.cos(rad) * r;
        const y = CY + Math.sin(rad) * r;
        const period = alert ? 4 : 5.5;
        const delay = reduce ? "0s" : `${(blip.angle / 360) * period}s`;
        return (
          <g
            key={blip.id}
            transform={`translate(${x} ${y})`}
            style={{
              opacity: reduce ? 1 : undefined,
              animation: reduce ? undefined : "vsv-blip-in 0.55s ease-out both",
              animationDelay: delay,
            }}
          >
            {!reduce ? (
              <circle
                r="10"
                fill="none"
                stroke="#c4a574"
                strokeWidth="0.8"
                style={{
                  animation: "vsv-ping 1.1s ease-out both",
                  animationDelay: delay,
                  transformOrigin: "0 0",
                }}
              />
            ) : null}
            <rect
              x="-11"
              y="-7"
              width="22"
              height="14"
              rx="1.5"
              fill="#141a16"
              stroke="#c4a574"
              strokeWidth="0.9"
            />
            <text
              y="3"
              textAnchor="middle"
              fill="#e8e2d6"
              fontSize="7"
              fontFamily="IBM Plex Mono, ui-monospace, monospace"
            >
              {money(blip.amount)}
            </text>
            <text
              y="18"
              textAnchor="middle"
              fill="#7c9a72"
              fontSize="6"
              fontFamily="IBM Plex Mono, ui-monospace, monospace"
            >
              {blip.name} · {money(blip.amount)}
            </text>
          </g>
        );
      })}

      <circle cx={CX} cy={CY} r="24" fill="#0b0f0c" stroke="#c4a574" strokeWidth="1.1" />
      <rect
        x={CX - 6}
        y={CY - 9}
        width="12"
        height="10"
        rx="1"
        fill="none"
        stroke="#c4a574"
        strokeWidth="1.1"
      />
      <path
        d={`M${CX - 4} ${CY - 9} v-4 a4 4 0 0 1 8 0 v4`}
        fill="none"
        stroke="#c4a574"
        strokeWidth="1.1"
      />
      <text
        x={CX}
        y={CY + 18}
        textAnchor="middle"
        fill="#c4a574"
        fontSize="6"
        fontFamily="IBM Plex Mono, ui-monospace, monospace"
      >
        SV
      </text>
    </svg>
  );
}
