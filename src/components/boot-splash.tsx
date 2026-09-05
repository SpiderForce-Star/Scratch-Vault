import { useEffect, useRef, useState } from "react";

export const BOOT_SHOWN_KEY = "vsv.boot.shown";
/** 6s vault clip + fade + slow-net slack. Hard-hide even if the video stalls. */
export const BOOT_FORCE_MS = 8000;
export const BOOT_VIDEO_SRC = "/boot-vault.mp4";
export const BOOT_POSTER_SRC = "/boot-vault.jpg";

const FADE_MS = 480;
const REDUCED_HOLD_MS = 1100;

type Phase = "play" | "fade";

/**
 * First-visit vault: photoreal steel door, cash stacks, bills out, $V hold.
 * Once per sessionStorage. Tap/click skips. Hard-hide at 8s even if the clip fails.
 */
export function BootSplash({ onFinished }: { onFinished?: () => void }) {
  const [phase, setPhase] = useState<Phase | null>(null);
  const [reduced, setReduced] = useState(false);
  const finished = useRef(false);
  const onFinishedRef = useRef(onFinished);
  const skipRef = useRef<() => void>(() => {});
  const fadeOutRef = useRef<() => void>(() => {});
  const videoRef = useRef<HTMLVideoElement | null>(null);
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
      const clip = videoRef.current;
      if (clip) {
        clip.pause();
      }
      if (immediate) {
        donePaint();
        setPhase(null);
        onFinishedRef.current?.();
        return;
      }
      setPhase("fade");
      later(FADE_MS, () => {
        if (cancelled) return;
        donePaint();
        setPhase(null);
        onFinishedRef.current?.();
      });
    };

    skipRef.current = () => finish(true);
    fadeOutRef.current = () => finish(false);

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
    setPhase("play");

    if (preferReduce) {
      later(REDUCED_HOLD_MS, () => finish(false));
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

  useEffect(() => {
    if (phase !== "play" || reduced) return;
    const clip = videoRef.current;
    if (!clip) return;
    const play = () => {
      void clip.play().catch(() => {
        skipRef.current();
      });
    };
    if (clip.readyState >= 2) play();
    else clip.addEventListener("canplay", play, { once: true });
    return () => clip.removeEventListener("canplay", play);
  }, [phase, reduced]);

  if (!phase) return null;

  return (
    <div
      className={["sv-boot", phase === "fade" ? "is-fade" : "", reduced ? "is-reduced" : ""]
        .filter(Boolean)
        .join(" ")}
      role="dialog"
      aria-modal="true"
      aria-label="Opening Scratch Vault. Tap to skip."
      data-testid="boot-splash"
      data-phase={phase}
      onClick={() => skipRef.current()}
    >
      {reduced ? (
        <img
          className="sv-boot-media"
          src={BOOT_POSTER_SRC}
          alt=""
          width={720}
          height={1280}
        />
      ) : (
        <video
          ref={videoRef}
          className="sv-boot-media"
          src={BOOT_VIDEO_SRC}
          poster={BOOT_POSTER_SRC}
          muted
          playsInline
          autoPlay
          preload="auto"
          disablePictureInPicture
          onEnded={() => fadeOutRef.current()}
          onError={() => skipRef.current()}
        />
      )}
    </div>
  );
}
