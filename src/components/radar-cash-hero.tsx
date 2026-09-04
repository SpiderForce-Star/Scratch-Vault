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
      <div className="mx-auto mt-3 w-full max-w-[320px] min-w-0">
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
          <stop offset="0%" stopColor="#141a16" />
          <stop offset="100%" stopColor="#0b0f0c" />
        </radialGradient>
        <linearGradient id={`${uid}-beam`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#c4a574" stopOpacity="0" />
          <stop offset="55%" stopColor="#7c9a72" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#c4a574" stopOpacity="0.18" />
        </linearGradient>
        <linearGradient id={`${uid}-bill`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2a2418" />
          <stop offset="55%" stopColor="#1a211c" />
          <stop offset="100%" stopColor="#141a16" />
        </linearGradient>
      </defs>

      <circle cx={CX} cy={CY} r={174} fill={`url(#${uid}-scope)`} stroke="#2a332c" />
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

      {reduce ? null : (
        <g
          style={{
            transformOrigin: `${CX}px ${CY}px`,
            animation: `vsv-radar-sweep ${alert ? "4s" : "5.5s"} linear infinite`,
          }}
        >
          <path
            d={`M ${CX} ${CY} L ${CX} ${CY - 170} A 170 170 0 0 1 ${CX + 92} ${CY - 143} Z`}
            fill={`url(#${uid}-beam)`}
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
        />
      ))}

      <CashHub fillId={`${uid}-bill`} />
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
}) {
  const rad = ((angle - 90) * Math.PI) / 180;
  const r = radius * 168;
  const x = r2(CX + Math.cos(rad) * r);
  const y = r2(CY + Math.sin(rad) * r);
  return (
    <g
      transform={`translate(${x} ${y})`}
      opacity={dim ? 0.55 : 1}
      data-radar-bills={bills}
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
      <CashStack bills={bills} fillId={fillId} />
      {dim ? null : (
        <>
          <text
            y={bills >= 3 ? 18 : 15}
            textAnchor="middle"
            fill="#c4a574"
            fontSize="6"
            fontFamily="IBM Plex Mono, ui-monospace, monospace"
          >
            {money(amount)}
          </text>
          <text
            y={bills >= 3 ? 27 : 24}
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
        <DollarBill x={-16} y={-15} rotate={-14} fillId={fillId} />
        <DollarBill x={-11} y={-9} rotate={8} fillId={fillId} />
        <DollarBill x={-12} y={-3} rotate={-3} fillId={fillId} />
      </>
    );
  }
  if (bills === 2) {
    return (
      <>
        <DollarBill x={-14} y={-12} rotate={-10} fillId={fillId} />
        <DollarBill x={-11} y={-5} rotate={6} fillId={fillId} />
      </>
    );
  }
  return <DollarBill x={-12} y={-7} rotate={-4} fillId={fillId} />;
}

/** Center pile of original $V chrome bills — not lottery art, not a lock. */
function CashHub({ fillId }: { fillId: string }) {
  return (
    <g transform={`translate(${CX} ${CY})`} data-radar-hub="cash">
      <circle r="30" fill="#0b0f0c" stroke="#c4a574" strokeWidth="1.15" />
      <g transform="translate(-12 -18) rotate(-16)">
        <DollarBill x={0} y={0} fillId={fillId} />
      </g>
      <g transform="translate(-6 -11) rotate(11)">
        <DollarBill x={0} y={0} fillId={fillId} />
      </g>
      <g transform="translate(-10 -5) rotate(-5)">
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
        width="24"
        height="14"
        rx="1.6"
        fill={`url(#${fillId})`}
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
