import { cn } from "@/lib/utils";

/** Compact header mark — same silhouette as the entrance spider. */
export function SpiderMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <ellipse cx="16" cy="14" rx="5.2" ry="4.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="16" cy="20.5" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="16" cy="13.2" r="1.1" fill="currentColor" />
      <path
        d="M11 12 L4 7 M21 12 L28 7 M10 15 L3 15 M22 15 L29 15 M11 18 L5 24 M21 18 L27 24 M12.5 20.5 L8 28 M19.5 20.5 L24 28"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

type Leg = {
  id: string;
  d: string;
  delay: string;
  origin: string;
};

const LEGS: Leg[] = [
  { id: "fl", d: "M58 62 L36 44 L18 28", delay: "0ms", origin: "58px 62px" },
  { id: "ml", d: "M54 80 L28 78 L10 76", delay: "80ms", origin: "54px 80px" },
  { id: "hl", d: "M58 96 L38 114 L22 132", delay: "160ms", origin: "58px 96px" },
  { id: "rl", d: "M66 104 L52 128 L46 148", delay: "240ms", origin: "66px 104px" },
  { id: "fr", d: "M102 62 L124 44 L142 28", delay: "40ms", origin: "102px 62px" },
  { id: "mr", d: "M106 80 L132 78 L150 76", delay: "120ms", origin: "106px 80px" },
  { id: "hr", d: "M102 96 L122 114 L138 132", delay: "200ms", origin: "102px 96px" },
  { id: "rr", d: "M94 104 L108 128 L114 148", delay: "280ms", origin: "94px 104px" },
];

export function MechanicalSpider({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 160"
      className={cn("overflow-visible", className)}
      role="img"
      aria-label="Webb Spinner Visions mechanical spider"
    >
      {LEGS.map((leg) => (
        <g
          key={leg.id}
          className="origin-center"
          style={{
            transformOrigin: leg.origin,
            animation: "wsv-leg-step 0.55s ease-in-out 2 both",
            animationDelay: leg.delay,
          }}
        >
          <path
            d={leg.d}
            fill="none"
            stroke="var(--color-gold)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={parseFloat(leg.origin)} cy={parseFloat(leg.origin.split(" ")[1])} r="2.1" fill="var(--color-gold)" />
        </g>
      ))}

      <g
        style={{
          transformOrigin: "80px 80px",
          animation: "wsv-unfurl 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both",
        }}
      >
        <ellipse
          cx="80"
          cy="72"
          rx="22"
          ry="18"
          fill="var(--color-raised)"
          stroke="var(--color-gold)"
          strokeWidth="2"
        />
        <circle
          cx="80"
          cy="98"
          r="16"
          fill="var(--color-surface)"
          stroke="var(--color-gold)"
          strokeWidth="2"
        />
        <g
          style={{
            transformOrigin: "80px 98px",
            animation: "wsv-gear 2.4s linear infinite",
          }}
        >
          <circle cx="80" cy="98" r="8" fill="none" stroke="var(--color-gold)" strokeWidth="1.4" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            return (
              <line
                key={i}
                x1={80 + Math.cos(a) * 6}
                y1={98 + Math.sin(a) * 6}
                x2={80 + Math.cos(a) * 11}
                y2={98 + Math.sin(a) * 11}
                stroke="var(--color-gold)"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            );
          })}
          <circle cx="80" cy="98" r="2.4" fill="var(--color-gold)" />
        </g>
        <circle
          cx="80"
          cy="68"
          r="4.2"
          fill="var(--color-gold)"
          style={{ animation: "wsv-optic 1.2s ease-in-out infinite" }}
        />
        <circle cx="80" cy="67" r="1.3" fill="var(--color-bg)" />
      </g>
    </svg>
  );
}
