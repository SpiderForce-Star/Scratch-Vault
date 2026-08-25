import { useEffect, useState } from "react";

const SHOWN_KEY = "vsv.boot.shown";

/** 1.4s branded overlay on first paint of /. Force-hide at 2s. */
export function BootSplash() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SHOWN_KEY)) return;
    } catch {
      /* private mode — still show once this mount */
    }
    setVisible(true);
    const fade = window.setTimeout(() => hide(), 1400);
    const force = window.setTimeout(() => hide(), 2000);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(force);
    };
  }, []);

  function hide() {
    setVisible(false);
    try {
      sessionStorage.setItem(SHOWN_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0F0C] transition-opacity duration-300"
      aria-hidden="true"
    >
      <div className="relative flex size-28 items-center justify-center rounded-full border border-gold/40">
        <div className="absolute inset-2 rounded-full border border-sage/25" />
        <div className="absolute inset-5 rounded-full border border-gold/20" />
        <span className="font-display text-2xl tracking-tight text-paper">SV</span>
      </div>
      <p className="mt-5 font-mono text-[10px] tracking-[0.22em] text-gold uppercase">
        Scratch Vault
      </p>
    </div>
  );
}
