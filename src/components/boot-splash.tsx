import { useEffect, useRef, useState, type CSSProperties } from "react";

export const BOOT_SHOWN_KEY = "vsv.boot.shown";
export const BOOT_FORCE_MS = 4000;

const APPEAR_MS = 520;
const SPIN_MS = 1180;
const OPEN_MS = 1080;
const HOLD_MS = 420;
const FADE_MS = 480;
const REDUCED_HOLD_MS = 720;

const SPOKES = [0, 60, 120, 180, 240, 300];
const BOLTS = Array.from({ length: 16 }, (_, i) => i * 22.5);

const FLYERS = [
  { dx: "-42%", dy: "-38%", rot: "-18deg", delay: "40ms", dur: "0.85s" },
  { dx: "46%", dy: "-34%", rot: "22deg", delay: "80ms", dur: "0.95s" },
  { dx: "-50%", dy: "8%", rot: "-28deg", delay: "120ms", dur: "1.05s" },
  { dx: "52%", dy: "12%", rot: "16deg", delay: "60ms", dur: "0.9s" },
  { dx: "-18%", dy: "-48%", rot: "8deg", delay: "160ms", dur: "1.1s" },
  { dx: "22%", dy: "44%", rot: "-12deg", delay: "100ms", dur: "1s" },
  { dx: "-36%", dy: "36%", rot: "24deg", delay: "200ms", dur: "1.15s" },
  { dx: "40%", dy: "-8%", rot: "-20deg", delay: "140ms", dur: "1.2s" },
];

type Phase = "in" | "spin" | "open" | "fade";

/**
 * First-visit vault: door appears, wheel turns, door opens to cash + $V, then the desk.
 * Once per sessionStorage. Tap/click skips. Hard-hide at 4s even if CSS fails.
 */
export function BootSplash({ onFinished }: { onFinished?: () => void }) {
  const [phase, setPhase] = useState<Phase | null>(null);
  const [reduced, setReduced] = useState(false);
  const finished = useRef(false);
  const onFinishedRef = useRef(onFinished);
  const skipRef = useRef<() => void>(() => {});
  onFinishedRef.current = onFinished;

  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];
    const later = (ms: number, fn: () => void) => {
      timers.push(window.setTimeout(fn, ms));
    };

    const donePaint = () => {
      document.documentElement.setAttribute("data-sv-boot", "done");
      document.getElementById("sv-boot-paint")?.remove();
    };

    const markShown = () => {
      try {
        sessionStorage.setItem(BOOT_SHOWN_KEY, "1");
      } catch {
        /* private mode */
      }
    };

    const finish = (immediate: boolean) => {
      if (finished.current || cancelled) return;
      finished.current = true;
      markShown();
      donePaint();
      if (immediate) {
        setPhase(null);
        onFinishedRef.current?.();
        return;
      }
      setPhase("fade");
      later(FADE_MS, () => {
        if (cancelled) return;
        setPhase(null);
        onFinishedRef.current?.();
      });
    };

    skipRef.current = () => finish(true);

    try {
      if (sessionStorage.getItem(BOOT_SHOWN_KEY)) {
        finish(true);
        return () => {
          cancelled = true;
          timers.forEach((id) => window.clearTimeout(id));
        };
      }
    } catch {
      /* still show once this mount */
    }
    if (document.documentElement.getAttribute("data-sv-boot") === "done") {
      finish(true);
      return () => {
        cancelled = true;
        timers.forEach((id) => window.clearTimeout(id));
      };
    }

    const preferReduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    document.documentElement.setAttribute("data-sv-boot", "playing");
    document.getElementById("sv-boot-paint")?.remove();
    setReduced(preferReduce);
    setPhase(preferReduce ? "open" : "in");

    if (preferReduce) {
      later(REDUCED_HOLD_MS, () => finish(false));
    } else {
      later(APPEAR_MS, () => {
        if (!cancelled && !finished.current) setPhase("spin");
      });
      later(APPEAR_MS + SPIN_MS, () => {
        if (!cancelled && !finished.current) setPhase("open");
      });
      later(APPEAR_MS + SPIN_MS + OPEN_MS + HOLD_MS, () => finish(false));
    }

    later(BOOT_FORCE_MS, () => finish(true));

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        finish(true);
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  if (!phase) return null;

  return (
    <div
      className={[
        "sv-boot",
        phase === "fade" ? "is-fade" : "",
        reduced ? "is-reduced" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="dialog"
      aria-modal="true"
      aria-label="Opening Scratch Vault. Tap to skip."
      data-testid="boot-splash"
      data-phase={phase}
      onClick={() => skipRef.current()}
    >
      <VaultGlyph phase={phase} reduced={reduced} />
    </div>
  );
}

function stageClass(phase: Phase) {
  if (phase === "in") return "sv-boot-stage is-in";
  if (phase === "spin") return "sv-boot-stage is-in is-spin";
  return "sv-boot-stage is-in is-spin is-open";
}

function DollarBill({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 28"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="48" height="28" rx="3" fill="#1a3d28" stroke="#c4a574" strokeWidth="1.6" />
      <rect
        x="2.6"
        y="2.4"
        width="42.8"
        height="23.2"
        rx="2"
        fill="none"
        stroke="#7c9a72"
        strokeOpacity="0.55"
        strokeWidth="0.9"
      />
      <text
        x="18"
        y="19"
        textAnchor="middle"
        fill="#c4a574"
        fontSize="13"
        fontFamily="IBM Plex Mono, ui-monospace, monospace"
      >
        $
      </text>
      <text
        x="30"
        y="19"
        textAnchor="middle"
        fill="#7c9a72"
        fontSize="13"
        fontFamily="IBM Plex Mono, ui-monospace, monospace"
      >
        V
      </text>
    </svg>
  );
}

function VaultGlyph({ phase, reduced }: { phase: Phase; reduced: boolean }) {
  const fly = !reduced && (phase === "open" || phase === "fade");
  return (
    <div className={stageClass(phase)}>
      <div className="sv-boot-frame">
        <svg
          className="sv-boot-frame-svg"
          viewBox="0 0 200 200"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="sv-boot-steel" cx="38%" cy="32%" r="72%">
              <stop offset="0%" stopColor="#6a7468" />
              <stop offset="42%" stopColor="#3a433c" />
              <stop offset="100%" stopColor="#161c18" />
            </radialGradient>
            <mask id="sv-boot-frame-hole">
              <rect width="200" height="200" fill="white" />
              <circle cx="100" cy="100" r="78" fill="black" />
            </mask>
          </defs>
          <circle
            cx="100"
            cy="100"
            r="96"
            fill="#121814"
            stroke="#c4a574"
            strokeWidth="2.2"
            mask="url(#sv-boot-frame-hole)"
          />
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="url(#sv-boot-steel)"
            stroke="#2a332c"
            strokeWidth="1.4"
            mask="url(#sv-boot-frame-hole)"
          />
          {BOLTS.map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const x = 100 + Math.cos(rad) * 84;
            const y = 100 + Math.sin(rad) * 84;
            return (
              <circle
                key={deg}
                cx={x}
                cy={y}
                r="3.2"
                fill="#1c221e"
                stroke="#c4a574"
                strokeWidth="0.7"
                opacity="0.9"
              />
            );
          })}
        </svg>

        <div className="sv-boot-chamber" aria-hidden="true">
          <div className="sv-boot-stacks">
            <span className="sv-boot-stack sv-boot-stack-a">
              <DollarBill />
              <DollarBill />
              <DollarBill />
            </span>
            <span className="sv-boot-stack sv-boot-stack-b">
              <DollarBill />
              <DollarBill />
            </span>
            <span className="sv-boot-stack sv-boot-stack-c">
              <DollarBill />
              <DollarBill />
              <DollarBill />
            </span>
          </div>
          <span className="sv-boot-mark">
            <span style={{ color: "#c4a574" }}>$</span>
            <span style={{ color: "#7c9a72" }}>V</span>
          </span>
        </div>

        {fly
          ? FLYERS.map((bill, i) => (
              <span
                key={i}
                className="sv-boot-fly"
                style={
                  {
                    "--dx": bill.dx,
                    "--dy": bill.dy,
                    "--rot": bill.rot,
                    animationDelay: bill.delay,
                    animationDuration: bill.dur,
                  } as CSSProperties
                }
              >
                <DollarBill />
              </span>
            ))
          : null}

        <div className="sv-boot-door">
          <svg viewBox="0 0 200 200" aria-hidden="true">
            <defs>
              <radialGradient id="sv-boot-face" cx="34%" cy="28%" r="78%">
                <stop offset="0%" stopColor="#7b8578" />
                <stop offset="35%" stopColor="#4a544c" />
                <stop offset="78%" stopColor="#232a25" />
                <stop offset="100%" stopColor="#101510" />
              </radialGradient>
            </defs>
            <circle
              cx="100"
              cy="100"
              r="99"
              fill="url(#sv-boot-face)"
              stroke="#c4a574"
              strokeWidth="2.6"
            />
            <circle
              cx="100"
              cy="100"
              r="86"
              fill="none"
              stroke="#2a332c"
              strokeWidth="3.4"
            />
            <circle
              cx="100"
              cy="100"
              r="64"
              fill="#161c18"
              stroke="#3a433c"
              strokeWidth="1.6"
            />
            {BOLTS.filter((_, i) => i % 2 === 0).map((deg) => {
              const rad = (deg * Math.PI) / 180;
              const x = 100 + Math.cos(rad) * 78;
              const y = 100 + Math.sin(rad) * 78;
              return (
                <circle
                  key={`lug-${deg}`}
                  cx={x}
                  cy={y}
                  r="2.4"
                  fill="#c4a574"
                  opacity="0.55"
                />
              );
            })}
          </svg>
          <div className="sv-boot-wheel">
            <svg viewBox="0 0 200 200" aria-hidden="true">
              {SPOKES.map((deg) => (
                <rect
                  key={deg}
                  x="96"
                  y="58"
                  width="8"
                  height="42"
                  rx="2.4"
                  fill="#c4a574"
                  transform={`rotate(${deg} 100 100)`}
                />
              ))}
              <circle
                cx="100"
                cy="100"
                r="44"
                fill="none"
                stroke="#c4a574"
                strokeWidth="5"
              />
              <circle cx="100" cy="100" r="18" fill="#7c9a72" />
              <circle
                cx="100"
                cy="100"
                r="18"
                fill="none"
                stroke="#c4a574"
                strokeWidth="1.6"
              />
              <circle cx="100" cy="100" r="6" fill="#c4a574" />
              <circle cx="100" cy="56" r="5.2" fill="#c4a574" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
