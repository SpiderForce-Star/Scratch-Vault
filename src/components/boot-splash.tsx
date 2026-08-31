import { useEffect, useState } from "react";

const SHOWN_KEY = "vsv.boot.shown.vault";

/** First session paint: vault appears, wheel turns, door opens to $V, then the desk. */
export function BootSplash() {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<"enter" | "open" | "out">("enter");

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SHOWN_KEY)) return;
    } catch {
      /* private mode */
    }
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      markShown();
      return;
    }
    setVisible(true);
    const open = window.setTimeout(() => setPhase("open"), 1500);
    const fade = window.setTimeout(() => setPhase("out"), 3200);
    const gone = window.setTimeout(() => hide(), 3900);
    const force = window.setTimeout(() => hide(), 4500);
    return () => {
      window.clearTimeout(open);
      window.clearTimeout(fade);
      window.clearTimeout(gone);
      window.clearTimeout(force);
    };
  }, []);

  function markShown() {
    try {
      sessionStorage.setItem(SHOWN_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  function hide() {
    setVisible(false);
    markShown();
  }

  if (!visible) return null;

  return (
    <div
      className={`sv-vault-overlay${phase === "out" ? " sv-vault-overlay-out" : ""}`}
      role="presentation"
      aria-hidden="true"
      onClick={hide}
    >
      <div className="sv-vault-stage">
        <div className="sv-vault-mark" data-open={phase !== "enter" ? "1" : "0"}>
          <span className="text-gold">$</span>
          <span className="text-sage">V</span>
        </div>
        <div className={`sv-vault-door${phase !== "enter" ? " sv-vault-door-open" : ""}`}>
          <VaultFace spinning={phase === "enter"} />
        </div>
      </div>
      <p className="sv-vault-caption">Scratch Vault</p>
    </div>
  );
}

function VaultFace({ spinning }: { spinning: boolean }) {
  return (
    <svg viewBox="0 0 200 200" className="sv-vault-svg" aria-hidden="true">
      <defs>
        <radialGradient id="svSteel" cx="42%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#2a332c" />
          <stop offset="55%" stopColor="#141a16" />
          <stop offset="100%" stopColor="#070a08" />
        </radialGradient>
        <radialGradient id="svGold" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#e3c792" />
          <stop offset="50%" stopColor="#c4a574" />
          <stop offset="100%" stopColor="#8a7048" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="96" fill="#0b0f0c" />
      <circle cx="100" cy="100" r="92" fill="url(#svSteel)" stroke="url(#svGold)" strokeWidth="5" />
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i * Math.PI) / 8;
        return (
          <circle
            key={i}
            cx={100 + Math.cos(a) * 82}
            cy={100 + Math.sin(a) * 82}
            r="3.2"
            fill="url(#svGold)"
          />
        );
      })}
      <circle cx="100" cy="100" r="70" fill="none" stroke="#2a332c" strokeWidth="2" />
      <g className={spinning ? "sv-vault-wheel" : undefined} style={{ transformOrigin: "100px 100px" }}>
        <circle cx="100" cy="100" r="48" fill="none" stroke="url(#svGold)" strokeWidth="7" />
        <circle cx="100" cy="100" r="36" fill="none" stroke="#7c9a72" strokeWidth="2.2" opacity="0.85" />
        {[0, 120, 240].map((deg) => (
          <rect
            key={deg}
            x="94"
            y="52"
            width="12"
            height="38"
            rx="3"
            fill="url(#svGold)"
            transform={`rotate(${deg} 100 100)`}
          />
        ))}
        <circle cx="100" cy="100" r="16" fill="#0b0f0c" stroke="url(#svGold)" strokeWidth="3" />
        <circle cx="100" cy="100" r="7" fill="#7c9a72" />
      </g>
    </svg>
  );
}
