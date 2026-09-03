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

function titleLines(name: string): [string, string?] {
  const clean = name.replace(/\s+/g, " ").trim();
  if (clean.length <= 22) return [clean];
  const words = clean.split(" ");
  if (words.length === 1) return [`${clean.slice(0, 21)}…`];
  let line1 = words[0] ?? clean;
  let i = 1;
  while (i < words.length && `${line1} ${words[i]}`.length <= 22) {
    line1 += ` ${words[i]}`;
    i += 1;
  }
  const rest = words.slice(i).join(" ");
  const line2 = rest.length > 24 ? `${rest.slice(0, 23)}…` : rest;
  return line2 ? [line1, line2] : [line1];
}

function ChromeArt({ spec, uid }: { spec: TicketChrome; uid: string }) {
  const { palette, sash, pattern, rotate, phase, state, number, theme, mark, name, price } =
    spec;
  const pat = `${uid}-pat`;
  const glow = `${uid}-glow`;
  const [line1, line2] = titleLines(name);
  const sashX = 430 + (phase % 36);
  return (
    <svg
      viewBox="0 0 640 420"
      className="pointer-events-none h-full w-full"
      aria-hidden="true"
      preserveAspectRatio="xMidYMin slice"
      data-ticket-family={spec.family}
    >
      <defs>
        <linearGradient id={glow} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette.bg} />
          <stop offset="48%" stopColor={palette.bg2} />
          <stop offset="100%" stopColor={palette.bg} />
        </linearGradient>
        <PatternFill id={pat} pattern={pattern} foil={palette.foil} phase={phase} />
      </defs>
      <rect width="640" height="420" rx="18" fill={`url(#${glow})`} />
      <rect
        width="640"
        height="420"
        fill={`url(#${pat})`}
        opacity="0.28"
        transform={`rotate(${rotate} 320 210)`}
      />
      <polygon
        points={`${sashX},0 ${sashX + 78},0 ${sashX - 18},420 ${sashX - 96},420`}
        fill={sash.accent}
        opacity="0.82"
      />
      <rect x="0" y="0" width="640" height="48" fill={palette.bg} />
      <rect x="0" y="48" width="640" height="4" fill={palette.foil} />
      <text
        x="22"
        y="32"
        fill={palette.foil}
        fontFamily="IBM Plex Mono, ui-monospace, monospace"
        fontSize="13"
        letterSpacing="2.2"
      >
        {state.toUpperCase()} · GAME {number}
      </text>
      <circle cx="572" cy="88" r="42" fill={sash.bg2} stroke={palette.foil} strokeWidth="2.2" />
      <text
        x="572"
        y="82"
        textAnchor="middle"
        fill={palette.ink}
        fontFamily="Fraunces, Times New Roman, serif"
        fontSize="22"
        fontWeight="700"
      >
        ${price}
      </text>
      <text
        x="572"
        y="100"
        textAnchor="middle"
        fill={palette.foil}
        fontFamily="IBM Plex Mono, ui-monospace, monospace"
        fontSize="9"
        letterSpacing="1.4"
      >
        TICKET
      </text>
      <text
        x="22"
        y={line2 ? 92 : 102}
        fill={palette.ink}
        fontFamily="Fraunces, Times New Roman, serif"
        fontSize={name.length > 28 ? 28 : 34}
        fontWeight="600"
      >
        {line1}
      </text>
      {line2 ? (
        <text
          x="22"
          y="128"
          fill={palette.ink}
          fontFamily="Fraunces, Times New Roman, serif"
          fontSize="28"
          fontWeight="600"
        >
          {line2}
        </text>
      ) : null}
      <text
        x="28"
        y="188"
        fill={palette.foil}
        fillOpacity="0.28"
        fontFamily="Fraunces, Times New Roman, serif"
        fontSize="72"
        fontWeight="600"
      >
        {mark}
      </text>
      <ThemeMark theme={theme} accent={sash.foil} foil={palette.foil} x={430} y={168} />
      <rect
        x="22"
        y="232"
        width="596"
        height="148"
        rx="10"
        fill="#1a1f1c"
        fillOpacity="0.45"
        stroke={palette.foil}
        strokeOpacity="0.55"
        strokeWidth="1.6"
      />
      <text
        x="36"
        y="258"
        fill={palette.foil}
        fillOpacity="0.7"
        fontFamily="IBM Plex Mono, ui-monospace, monospace"
        fontSize="11"
        letterSpacing="1.8"
      >
        PLAY AREA
      </text>
      <text
        x="320"
        y="404"
        textAnchor="middle"
        fill={palette.ink}
        fillOpacity="0.62"
        fontFamily="IBM Plex Mono, ui-monospace, monospace"
        fontSize="9"
        letterSpacing="0.4"
      >
        Independent reconstruction — not official ticket art.
      </text>
      <rect
        x="8"
        y="8"
        width="624"
        height="404"
        rx="12"
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
