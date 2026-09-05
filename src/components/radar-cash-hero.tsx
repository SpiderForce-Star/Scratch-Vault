import { useEffect, useState } from "react";
import { money } from "@/data/games";
import { deskNotifyEnabled } from "@/lib/desk-alert";
import { useI18n } from "@/lib/locale";
import { radarBillCount, type RadarCapture, type RadarContact } from "@/lib/radar";

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
  stateId = "",
  captures = [],
  contacts = [],
  cycleId = "",
  bleeps = 0,
}: {
  stateId?: string;
  captures?: RadarCapture[];
  contacts?: RadarContact[];
  cycleId?: string;
  bleeps?: 0 | 1 | 2;
}) {
  const { t } = useI18n();
  const [reduce, setReduce] = useState(false);
  const [scopeReady, setScopeReady] = useState(false);
  const [seenCycle, setSeenCycle] = useState("");
  const seenStore = stateId ? `${SEEN_CYCLE_KEY}.${stateId}` : SEEN_CYCLE_KEY;
  const playedStore = stateId ? `${PLAYED_CYCLE_KEY}.${stateId}` : PLAYED_CYCLE_KEY;

  useEffect(() => {
    setScopeReady(true);
    setSeenCycle(readKey(seenStore));
  }, [seenStore]);

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
    if (readSession(playedStore) === cycleId) return;
    writeKey("session", playedStore, cycleId);
    try {
      playGoldBleeps(bleeps === 2 ? 2 : 1);
    } catch {
      /* default mute if audio is blocked */
    }
  }, [fresh, reduce, bleeps, cycleId, playedStore]);

  const dismiss = () => {
    if (!cycleId) return;
    writeKey("local", seenStore, cycleId);
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
      {fresh ? (
        <p className="font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
          {t("hero.contact")}
        </p>
      ) : null}
      <div className="mx-auto mt-3 w-full max-w-[360px] min-w-0 lg:max-w-none">
        {scopeReady ? (
          <RadarScope
            stateId={stateId}
            cycleId={cycleId}
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
  stateId,
  cycleId,
  captures,
  contacts,
  reduce,
  alert,
}: {
  stateId: string;
  cycleId: string;
  captures: RadarCapture[];
  contacts: RadarContact[];
  reduce: boolean;
  alert: boolean;
}) {
  const rings = [56, 96, 136, 168];
  const uid = `vsv-${stateId || "desk"}-${cycleId.slice(0, 24) || "idle"}`;
  const sweepSec = alert ? 4 : 5.5;
  return (
    <svg
      key={uid}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="block h-auto w-full overflow-visible"
      data-radar-state={stateId}
      data-radar-cycle={cycleId}
      data-radar-hub="cash"
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
        <radialGradient id={`${uid}-scope`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#243028" />
          <stop offset="42%" stopColor="#141a16" />
          <stop offset="100%" stopColor="#070a08" />
        </radialGradient>
        <linearGradient id={`${uid}-beam`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#c4a574" stopOpacity="0" />
          <stop offset="45%" stopColor="#7c9a72" stopOpacity="0.12" />
          <stop offset="82%" stopColor="#c4a574" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#e8d5b0" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={`${uid}-bill`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#355a44" />
          <stop offset="48%" stopColor="#1e3328" />
          <stop offset="100%" stopColor="#13221a" />
        </linearGradient>
        <filter id={`${uid}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx={CX} cy={CY} r={176} fill={`url(#${uid}-scope)`} />
      <circle
        cx={CX}
        cy={CY}
        r={174}
        fill="none"
        stroke="#c4a574"
        strokeWidth="1.7"
        strokeOpacity="0.85"
      />
      <circle
        cx={CX}
        cy={CY}
        r={170}
        fill="none"
        stroke="#7c9a72"
        strokeWidth="0.6"
        strokeOpacity="0.35"
      />
      {alert ? (
        <>
          <circle
            cx={CX}
            cy={CY}
            r={178}
            fill="none"
            stroke="#c4a574"
            style={{
              animation: reduce ? undefined : "vsv-contact 1.6s ease-in-out infinite",
            }}
          />
          <text
            x={CX}
            y={20}
            textAnchor="middle"
            fill="#c4a574"
            fontSize="9"
            fontFamily="IBM Plex Mono, ui-monospace, monospace"
            letterSpacing="2.4"
          >
            CONTACT
          </text>
        </>
      ) : null}
      <line
        x1={CX}
        y1={CY - 174}
        x2={CX}
        y2={CY + 174}
        stroke="#7c9a72"
        strokeOpacity="0.14"
        strokeWidth="0.8"
      />
      <line
        x1={CX - 174}
        y1={CY}
        x2={CX + 174}
        y2={CY}
        stroke="#7c9a72"
        strokeOpacity="0.14"
        strokeWidth="0.8"
      />
      {rings.map((r, i) => (
        <circle
          key={r}
          cx={CX}
          cy={CY}
          r={r}
          fill="none"
          stroke={i === rings.length - 1 ? "#c4a574" : "#7c9a72"}
          strokeOpacity={i === rings.length - 1 ? 0.28 : 0.22}
          strokeWidth={i === rings.length - 1 ? 1 : 0.85}
          style={
            reduce || i !== 1
              ? undefined
              : { animation: "vsv-ring-breathe 3.4s ease-in-out infinite" }
          }
        />
      ))}
      {Array.from({ length: 36 }, (_, i) => {
        const a = (i * 10 * Math.PI) / 180;
        const inner = i % 3 === 0 ? 160 : 170;
        return (
          <line
            key={i}
            x1={r2(CX + Math.cos(a) * inner)}
            y1={r2(CY + Math.sin(a) * inner)}
            x2={r2(CX + Math.cos(a) * 174)}
            y2={r2(CY + Math.sin(a) * 174)}
            stroke="#c4a574"
            strokeOpacity={i % 3 === 0 ? 0.55 : 0.22}
            strokeWidth={i % 3 === 0 ? 1.2 : 0.8}
          />
        );
      })}

      {reduce ? null : (
        <g
          style={{
            transformOrigin: `${CX}px ${CY}px`,
            animation: `vsv-radar-sweep ${sweepSec}s linear infinite`,
          }}
        >
          <path
            d={`M ${CX} ${CY} L ${CX} ${CY - 170} A 170 170 0 0 1 ${CX + 128} ${CY - 112} Z`}
            fill={`url(#${uid}-beam)`}
          />
          <line
            x1={CX}
            y1={CY}
            x2={CX}
            y2={CY - 172}
            stroke="#e8d5b0"
            strokeOpacity="0.95"
            strokeWidth="1.8"
            filter={`url(#${uid}-glow)`}
          />
        </g>
      )}

      {contacts.map((blip) => (
        <ScopeMark
          key={blip.id}
          angle={blip.angle}
          radius={blip.radius}
          label={`${blip.shortName} ${blip.name} ${money(blip.amount)}`}
          amount={blip.amount}
          bills={1}
          dim
          ping={false}
          reduce={reduce}
          fillId={`${uid}-bill`}
          sweepSec={sweepSec}
        />
      ))}

      {captures.map((blip) => (
        <ScopeMark
          key={blip.id}
          angle={blip.angle}
          radius={blip.radius}
          label={`${blip.shortName} ${blip.name} ${money(blip.amount)}`}
          amount={blip.amount}
          bills={radarBillCount("capture", blip.stack)}
          dim={!alert}
          ping={alert && !reduce}
          reduce={reduce}
          fillId={`${uid}-bill`}
          sweepSec={sweepSec}
        />
      ))}

      <CashHub fillId={`${uid}-bill`} reduce={reduce} />
    </svg>
  );
}

function ScopeMark({
  angle,
  radius,
  label,
  amount,
  bills,
  dim,
  ping,
  reduce,
  fillId,
  sweepSec,
}: {
  angle: number;
  radius: number;
  label: string;
  amount: number;
  bills: 1 | 2 | 3;
  dim: boolean;
  ping: boolean;
  reduce: boolean;
  fillId: string;
  sweepSec: number;
}) {
  const rad = ((angle - 90) * Math.PI) / 180;
  const r = radius * 168;
  const x = r2(CX + Math.cos(rad) * r);
  const y = r2(CY + Math.sin(rad) * r);
  const paint =
    dim && !reduce
      ? {
          animation: `vsv-paint ${sweepSec}s linear infinite`,
          animationDelay: `-${((angle % 360) / 360) * sweepSec}s`,
        }
      : reduce || dim
        ? undefined
        : { animation: "vsv-blip-in 0.55s ease-out both" };
  return (
    <g
      transform={`translate(${x} ${y})`}
      opacity={dim && reduce ? 0.62 : dim && !reduce ? undefined : 1}
      data-radar-bills={bills}
      style={paint}
    >
      {ping ? (
        <circle
          r="16"
          fill="none"
          stroke="#c4a574"
          strokeWidth="1.1"
          style={{
            animation: "vsv-ping 1.1s ease-out both",
            transformOrigin: "0 0",
          }}
        />
      ) : null}
      <CashStack bills={bills} fillId={fillId} />
      {dim ? null : (
        <>
          <text
            y={bills >= 3 ? 20 : 17}
            textAnchor="middle"
            fill="#c4a574"
            fontSize="6.5"
            fontFamily="IBM Plex Mono, ui-monospace, monospace"
          >
            {money(amount)}
          </text>
          <text
            y={bills >= 3 ? 29 : 26}
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

function CashStack({ bills, fillId }: { bills: 1 | 2 | 3; fillId: string }) {
  if (bills === 3) {
    return (
      <>
        <DollarBill x={-18} y={-16} rotate={-14} fillId={fillId} />
        <DollarBill x={-12} y={-10} rotate={8} fillId={fillId} />
        <DollarBill x={-14} y={-3} rotate={-3} fillId={fillId} />
      </>
    );
  }
  if (bills === 2) {
    return (
      <>
        <DollarBill x={-16} y={-13} rotate={-10} fillId={fillId} />
        <DollarBill x={-12} y={-5} rotate={6} fillId={fillId} />
      </>
    );
  }
  return <DollarBill x={-14} y={-8} rotate={-4} fillId={fillId} />;
}

/** Center pile of original $V chrome bills — not lottery art, not a lock. */
function CashHub({ fillId, reduce }: { fillId: string; reduce: boolean }) {
  return (
    <g transform={`translate(${CX} ${CY})`} data-radar-hub="cash">
      <circle r="36" fill="#0b0f0c" />
      <circle
        r="36"
        fill="none"
        stroke="#c4a574"
        strokeWidth="1.6"
        style={
          reduce ? undefined : { animation: "vsv-hub-glow 2.8s ease-in-out infinite" }
        }
      />
      <circle r="30" fill="none" stroke="#7c9a72" strokeOpacity="0.45" strokeWidth="0.7" />
      <g transform="translate(-14 -20) rotate(-16)">
        <DollarBill x={0} y={0} fillId={fillId} />
      </g>
      <g transform="translate(-7 -12) rotate(11)">
        <DollarBill x={0} y={0} fillId={fillId} />
      </g>
      <g transform="translate(-12 -5) rotate(-5)">
        <DollarBill x={0} y={0} fillId={fillId} />
      </g>
    </g>
  );
}

/** Original $V chrome bills — not lottery ticket art. */
function DollarBill({
  x,
  y,
  rotate = 0,
  fillId,
}: {
  x: number;
  y: number;
  rotate?: number;
  fillId: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <rect
        width="28"
        height="16"
        rx="1.8"
        fill={`url(#${fillId})`}
        stroke="#c4a574"
        strokeWidth="1.15"
      />
      <rect
        x="1.5"
        y="1.4"
        width="25"
        height="13.2"
        rx="1"
        fill="none"
        stroke="#7c9a72"
        strokeOpacity="0.55"
        strokeWidth="0.55"
      />
      <rect x="0" y="5.4" width="28" height="3.4" fill="#c4a574" opacity="0.42" />
      <text
        x="10.5"
        y="11.4"
        textAnchor="middle"
        fill="#c4a574"
        fontSize="8"
        fontFamily="IBM Plex Mono, ui-monospace, monospace"
      >
        $
      </text>
      <text
        x="17.8"
        y="11.4"
        textAnchor="middle"
        fill="#9bb892"
        fontSize="8"
        fontFamily="IBM Plex Mono, ui-monospace, monospace"
      >
        V
      </text>
    </g>
  );
}
