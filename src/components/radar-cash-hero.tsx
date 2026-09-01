import { useEffect, useState } from "react";
import { money } from "@/data/games";
import { deskNotifyEnabled } from "@/lib/desk-alert";
import { useI18n } from "@/lib/locale";
import type { RadarCapture, RadarContact } from "@/lib/radar";

const SIZE = 360;
const CX = SIZE / 2;
const CY = SIZE / 2;
const SEEN_CYCLE_KEY = "vsv.radar.seenCycle";
const PLAYED_CYCLE_KEY = "vsv.radar.playedCycle";

function r2(n: number) {
  return Math.round(n * 100) / 100;
}

function readKey(key: string): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeKey(store: "local" | "session", key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    const bag = store === "session" ? window.sessionStorage : window.localStorage;
    bag.setItem(key, value);
  } catch {
    /* private mode */
  }
}

function readSession(key: string): string {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function playGoldBleeps(count: 1 | 2): void {
  const ctx = new AudioContext();
  const beep = (offsetMs: number) => {
    window.setTimeout(() => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 880;
      gain.gain.value = 0.04;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      window.setTimeout(() => osc.stop(), 120);
    }, offsetMs);
  };
  beep(0);
  if (count === 2) beep(140);
  window.setTimeout(() => {
    void ctx.close();
  }, 500);
}

export function RadarCashHero({
  captures = [],
  contacts = [],
  cycleId = "",
  bleeps = 0,
}: {
  captures?: RadarCapture[];
  contacts?: RadarContact[];
  cycleId?: string;
  bleeps?: 0 | 1 | 2;
}) {
  const { t } = useI18n();
  const [reduce, setReduce] = useState(false);
  const [scopeReady, setScopeReady] = useState(false);
  const [seenCycle, setSeenCycle] = useState("");

  useEffect(() => {
    setScopeReady(true);
    setSeenCycle(readKey(SEEN_CYCLE_KEY));
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduce(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const fresh = Boolean(cycleId) && captures.length > 0 && seenCycle !== cycleId;

  useEffect(() => {
    if (!fresh || reduce || !bleeps) return;
    if (!deskNotifyEnabled()) return;
    if (readSession(PLAYED_CYCLE_KEY) === cycleId) return;
    writeKey("session", PLAYED_CYCLE_KEY, cycleId);
    try {
      playGoldBleeps(bleeps === 2 ? 2 : 1);
    } catch {
      /* default mute if audio is blocked */
    }
  }, [fresh, reduce, bleeps, cycleId]);

  const dismiss = () => {
    if (!cycleId) return;
    writeKey("local", SEEN_CYCLE_KEY, cycleId);
    setSeenCycle(cycleId);
  };

  const hit = captures[0];
  const status = fresh
    ? hit
      ? t("hero.captureLine", {
          short: hit.shortName,
          name: hit.name,
          prize: money(hit.amount),
        })
      : t("hero.contact")
    : t("hero.scanningJackpots");

  return (
    <div className="min-w-0">
      <p className="font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
        {fresh ? t("hero.contact") : t("hero.radarKicker")}
      </p>
      <div className="mx-auto mt-3 w-full max-w-[320px] min-w-0">
        {scopeReady ? (
          <RadarScope
            captures={captures}
            contacts={contacts}
            reduce={reduce}
            alert={fresh}
          />
        ) : (
          <div className="aspect-square w-full rounded-full border border-line bg-raised" />
        )}
      </div>
      <p className="mt-3 text-center font-mono text-[10px] tracking-[0.12em] text-sage uppercase">
        {status}
      </p>
      <p className="mt-1 text-center text-[11px] leading-relaxed text-faint">
        {t("hero.radarNote")}
      </p>
      {fresh ? (
        <div className="mt-3 rounded-md border border-gold/40 bg-gold/10 px-3 py-3">
          <p className="text-sm leading-relaxed text-paper">{t("hero.captureHint")}</p>
          {captures.slice(0, 2).map((row) => (
            <p
              key={row.id}
              className="mt-1 font-mono text-[11px] tracking-wide text-gold uppercase"
            >
              {t("hero.captureLine", {
                short: row.shortName,
                name: row.name,
                prize: money(row.amount),
              })}
            </p>
          ))}
          <button
            type="button"
            onClick={dismiss}
            className="mt-3 inline-flex min-h-11 items-center justify-center px-3 text-sm text-muted underline underline-offset-4 hover:text-paper"
          >
            {t("hero.dismiss")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function RadarScope({
  captures,
  contacts,
  reduce,
  alert,
}: {
  captures: RadarCapture[];
  contacts: RadarContact[];
  reduce: boolean;
  alert: boolean;
}) {
  const rings = [56, 96, 136, 168];
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="block h-auto w-full overflow-visible"
      role="img"
      aria-label={
        alert
          ? captures
              .slice(0, 2)
              .map((row) => `${row.shortName} ${row.name} ${money(row.amount)}`)
              .join("; ") || "Grand-prize capture"
          : "Published remaining-jackpot radar. Not store inventory."
      }
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
        <linearGradient id="vsv-bill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2a2418" />
          <stop offset="55%" stopColor="#1a211c" />
          <stop offset="100%" stopColor="#141a16" />
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
            x1={r2(CX + Math.cos(a) * inner)}
            y1={r2(CY + Math.sin(a) * inner)}
            x2={r2(CX + Math.cos(a) * 174)}
            y2={r2(CY + Math.sin(a) * 174)}
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

      {contacts.map((blip) => (
        <ScopeMark
          key={blip.id}
          angle={blip.angle}
          radius={blip.radius}
          label={`${blip.shortName} ${blip.name} ${money(blip.amount)}`}
          amount={blip.amount}
          stacked={0}
          dim
          ping={false}
          reduce={reduce}
        />
      ))}

      {captures.map((blip) => (
        <ScopeMark
          key={blip.id}
          angle={blip.angle}
          radius={blip.radius}
          label={`${blip.shortName} ${blip.name} ${money(blip.amount)}`}
          amount={blip.amount}
          stacked={alert ? blip.stack : 0}
          dim={!alert}
          ping={alert && !reduce}
          reduce={reduce}
        />
      ))}

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
        x={CX - 4}
        y={CY + 18}
        textAnchor="middle"
        fill="#c4a574"
        fontSize="6"
        fontFamily="IBM Plex Mono, ui-monospace, monospace"
      >
        $
      </text>
      <text
        x={CX + 4}
        y={CY + 18}
        textAnchor="middle"
        fill="#7c9a72"
        fontSize="6"
        fontFamily="IBM Plex Mono, ui-monospace, monospace"
      >
        V
      </text>
    </svg>
  );
}

function ScopeMark({
  angle,
  radius,
  label,
  amount,
  stacked,
  dim,
  ping,
  reduce,
}: {
  angle: number;
  radius: number;
  label: string;
  amount: number;
  stacked: 0 | 1 | 2;
  dim: boolean;
  ping: boolean;
  reduce: boolean;
}) {
  const rad = ((angle - 90) * Math.PI) / 180;
  const r = radius * 168;
  const x = r2(CX + Math.cos(rad) * r);
  const y = r2(CY + Math.sin(rad) * r);
  return (
    <g
      transform={`translate(${x} ${y})`}
      opacity={dim ? 0.34 : 1}
      style={{
        animation: reduce || dim ? undefined : "vsv-blip-in 0.55s ease-out both",
      }}
    >
      {ping ? (
        <circle
          r="14"
          fill="none"
          stroke="#c4a574"
          strokeWidth="0.9"
          style={{
            animation: "vsv-ping 1.1s ease-out both",
            transformOrigin: "0 0",
          }}
        />
      ) : null}
      {stacked >= 2 ? <DollarBill x={-14} y={-13} /> : null}
      {stacked >= 1 ? (
        <DollarBill x={stacked >= 2 ? -9 : -12} y={stacked >= 2 ? -6 : -8} />
      ) : (
        <rect
          x="-8"
          y="-5"
          width="16"
          height="10"
          rx="1.2"
          fill="#141a16"
          stroke="#c4a574"
          strokeWidth="0.7"
        />
      )}
      {dim ? null : (
        <>
          <text
            y={stacked >= 1 ? 16 : 12}
            textAnchor="middle"
            fill="#c4a574"
            fontSize="6"
            fontFamily="IBM Plex Mono, ui-monospace, monospace"
          >
            {money(amount)}
          </text>
          <text
            y={stacked >= 1 ? 25 : 21}
            textAnchor="middle"
            fill="#7c9a72"
            fontSize="5.5"
            fontFamily="IBM Plex Mono, ui-monospace, monospace"
          >
            {label}
          </text>
        </>
      )}
    </g>
  );
}

/** Original $V chrome bills — not lottery ticket art. */
function DollarBill({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        width="24"
        height="14"
        rx="1.6"
        fill="url(#vsv-bill)"
        stroke="#c4a574"
        strokeWidth="0.95"
      />
      <rect
        x="1.4"
        y="1.3"
        width="21.2"
        height="11.4"
        rx="1"
        fill="none"
        stroke="#7c9a72"
        strokeOpacity="0.45"
        strokeWidth="0.5"
      />
      <text
        x="9"
        y="10"
        textAnchor="middle"
        fill="#c4a574"
        fontSize="7"
        fontFamily="IBM Plex Mono, ui-monospace, monospace"
      >
        $
      </text>
      <text
        x="15.5"
        y="10"
        textAnchor="middle"
        fill="#7c9a72"
        fontSize="7"
        fontFamily="IBM Plex Mono, ui-monospace, monospace"
      >
        V
      </text>
    </g>
  );
}
