import { useId } from "react";
import type { Game, TicketTheme } from "@/data/games";
import {
  ticketChrome,
  type TicketChrome,
  type TicketPattern,
} from "@/lib/ticket-chrome";

function PatternFill({
  id,
  pattern,
  foil,
  phase,
}: {
  id: string;
  pattern: TicketPattern;
  foil: string;
  phase: number;
}) {
  const s = 18 + (phase % 10);
  if (pattern === "stripes") {
    return (
      <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse" patternTransform={`rotate(${phase % 50})`}>
        <rect width={s} height={s} fill="transparent" />
        <rect x="0" y="0" width={s * 0.38} height={s} fill={foil} />
      </pattern>
    );
  }
  if (pattern === "diamonds") {
    return (
      <pattern id={id} width={s * 1.6} height={s * 1.6} patternUnits="userSpaceOnUse">
        <path
          d={`M${s * 0.8} 2 L${s * 1.5} ${s * 0.8} L${s * 0.8} ${s * 1.5} L${s * 0.1} ${s * 0.8} Z`}
          fill="none"
          stroke={foil}
          strokeWidth="1.4"
        />
      </pattern>
    );
  }
  if (pattern === "burst") {
    return (
      <pattern id={id} width="120" height="120" patternUnits="userSpaceOnUse">
        <g stroke={foil} strokeWidth="1.2" fill="none">
          {Array.from({ length: 12 }, (_, i) => {
            const a = ((i * 30 + phase) * Math.PI) / 180;
            return (
              <line
                key={i}
                x1="60"
                y1="60"
                x2={60 + Math.cos(a) * 56}
                y2={60 + Math.sin(a) * 56}
              />
            );
          })}
        </g>
      </pattern>
    );
  }
  if (pattern === "dots") {
    return (
      <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse">
        <circle cx={s * 0.35} cy={s * 0.4} r="2.2" fill={foil} />
        <circle cx={s * 0.75} cy={s * 0.8} r="1.4" fill={foil} />
      </pattern>
    );
  }
  if (pattern === "chevrons") {
    return (
      <pattern id={id} width={s * 1.4} height={s} patternUnits="userSpaceOnUse">
        <path
          d={`M0 ${s * 0.7} L${s * 0.7} ${s * 0.2} L${s * 1.4} ${s * 0.7}`}
          fill="none"
          stroke={foil}
          strokeWidth="2"
        />
      </pattern>
    );
  }
  if (pattern === "bands") {
    return (
      <pattern id={id} width="40" height={12 + (phase % 8)} patternUnits="userSpaceOnUse">
        <rect width="40" height="5" fill={foil} />
      </pattern>
    );
  }
  if (pattern === "hex") {
    return (
      <pattern id={id} width="28" height="24" patternUnits="userSpaceOnUse">
        <path
          d="M14 2 L24 8 L24 16 L14 22 L4 16 L4 8 Z"
          fill="none"
          stroke={foil}
          strokeWidth="1.2"
        />
      </pattern>
    );
  }
  return (
    <pattern id={id} width="80" height="40" patternUnits="userSpaceOnUse">
      <path
        d={`M0 ${20 + (phase % 6)} Q20 4 40 ${20 + (phase % 6)} T80 ${20 + (phase % 6)}`}
        fill="none"
        stroke={foil}
        strokeWidth="1.6"
      />
    </pattern>
  );
}

function ThemeMark({
  theme,
  accent,
  foil,
  x,
  y,
}: {
  theme: TicketTheme;
  accent: string;
  foil: string;
  x: number;
  y: number;
}) {
  if (theme === "jumbo") {
    return (
      <polygon
        points={`${x},${y - 36} ${x + 10},${y - 10} ${x + 36},${y - 8} ${x + 16},${y + 8} ${x + 22},${y + 34} ${x},${y + 18} ${x - 22},${y + 34} ${x - 16},${y + 8} ${x - 36},${y - 8} ${x - 10},${y - 10}`}
        fill="none"
        stroke={foil}
        strokeWidth="2.4"
      />
    );
  }
  if (theme === "crossword") {
    return (
      <g stroke={foil} strokeWidth="1.6" fill="none">
        <rect x={x - 28} y={y - 28} width="56" height="56" />
        <path d={`M${x - 28} ${y} H${x + 28} M${x} ${y - 28} V${y + 28}`} />
      </g>
    );
  }
  if (theme === "frenzy") {
    return (
      <g stroke={accent} strokeWidth="2" fill="none">
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          return (
            <line
              key={i}
              x1={x}
              y1={y}
              x2={x + Math.cos(a) * 34}
              y2={y + Math.sin(a) * 34}
            />
          );
        })}
      </g>
    );
  }
  if (theme === "multiplier") {
    return (
      <g stroke={foil} strokeWidth="5" strokeLinecap="round">
        <line x1={x - 22} y1={y - 22} x2={x + 22} y2={y + 22} />
        <line x1={x + 22} y1={y - 22} x2={x - 22} y2={y + 22} />
      </g>
    );
  }
  if (theme === "high") {
    return (
      <polygon
        points={`${x},${y - 32} ${x + 26},${y} ${x},${y + 32} ${x - 26},${y}`}
        fill="none"
        stroke={foil}
        strokeWidth="2.4"
      />
    );
  }
  return (
    <g fill="none" stroke={foil} strokeWidth="2.2">
      <rect x={x - 26} y={y - 8} width="52" height="12" rx="2" />
      <rect x={x - 20} y={y - 22} width="40" height="12" rx="2" />
      <rect x={x - 14} y={y + 6} width="28" height="12" rx="2" />
    </g>
  );
}

function ChromeArt({ spec, uid }: { spec: TicketChrome; uid: string }) {
  const { palette, sash, pattern, rotate, phase, state, number, theme, mark, name } =
    spec;
  const pat = `${uid}-pat`;
  const glow = `${uid}-glow`;
  const title = name.length > 22 ? `${name.slice(0, 21)}…` : name;
  const sashX = 420 + (phase % 40);
  return (
    <svg
      viewBox="0 0 640 420"
      className="pointer-events-none h-full w-full"
      aria-hidden="true"
      preserveAspectRatio="xMidYMin slice"
    >
      <defs>
        <linearGradient id={glow} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette.bg} />
          <stop offset="48%" stopColor={palette.bg2} />
          <stop offset="100%" stopColor={palette.bg} />
        </linearGradient>
        <PatternFill id={pat} pattern={pattern} foil={palette.foil} phase={phase} />
      </defs>
      <rect width="640" height="420" fill={`url(#${glow})`} />
      <rect
        width="640"
        height="420"
        fill={`url(#${pat})`}
        opacity="0.34"
        transform={`rotate(${rotate} 320 210)`}
      />
      <polygon
        points={`${sashX},0 ${sashX + 86},0 ${sashX - 10},420 ${sashX - 96},420`}
        fill={sash.accent}
        opacity="0.88"
      />
      <rect x="0" y="0" width="640" height="52" fill={palette.bg} />
      <rect x="0" y="52" width="640" height="5" fill={palette.foil} />
      <rect x="0" y="0" width="10" height="420" fill={sash.bg2} />
      <text
        x="168"
        y="33"
        fill={palette.foil}
        fontFamily="IBM Plex Mono, ui-monospace, monospace"
        fontSize="14"
        letterSpacing="2.4"
      >
        {state.toUpperCase()} · GAME {number}
      </text>
      <text
        x="24"
        y="108"
        fill={palette.ink}
        fontFamily="Fraunces, Times New Roman, serif"
        fontSize="34"
        fontWeight="600"
      >
        {title}
      </text>
      <text
        x="24"
        y="210"
        fill={palette.foil}
        fillOpacity="0.4"
        fontFamily="Fraunces, Times New Roman, serif"
        fontSize="96"
        fontWeight="600"
      >
        {number}
      </text>
      <text
        x="612"
        y="108"
        textAnchor="end"
        fill={palette.ink}
        fillOpacity="0.55"
        fontFamily="Fraunces, Times New Roman, serif"
        fontSize="48"
        fontWeight="600"
      >
        {mark}
      </text>
      <ThemeMark theme={theme} accent={sash.foil} foil={palette.foil} x={560} y={168} />
      <rect
        x="8"
        y="8"
        width="624"
        height="404"
        fill="none"
        stroke={palette.foil}
        strokeOpacity="0.45"
        strokeWidth="1.4"
      />
    </svg>
  );
}

/** Original Scratch Vault ticket chrome. Never official lottery art. */
export function TicketChromeFace({ game }: { game: Game }) {
  const reactId = useId().replace(/:/g, "");
  const spec = ticketChrome(game);
  return (
    <div
      className="absolute inset-0"
      data-ticket-chrome={`${spec.state}-${spec.number}`}
      data-ticket-pattern={spec.pattern}
      data-ticket-palette={spec.paletteIndex}
    >
      <ChromeArt spec={spec} uid={`svt-${spec.state}-${spec.number}-${reactId}`} />
    </div>
  );
}
