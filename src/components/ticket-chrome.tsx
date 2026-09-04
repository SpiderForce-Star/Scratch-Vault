import { useId } from "react";
import type { Game } from "@/data/games";
import {
  ticketChrome,
  type SportsKind,
  type TicketChrome,
  type TicketPalette,
} from "@/lib/ticket-chrome";

const SERIF = "Fraunces, Times New Roman, serif";
const MONO = "IBM Plex Mono, ui-monospace, monospace";

function titleLines(name: string): [string, string?] {
  const clean = name.replace(/\s+/g, " ").trim();
  if (clean.length <= 18) return [clean];
  const words = clean.split(" ");
  if (words.length === 1) return [`${clean.slice(0, 17)}…`];
  let line1 = words[0] ?? clean;
  let i = 1;
  while (i < words.length && `${line1} ${words[i]}`.length <= 18) {
    line1 += ` ${words[i]}`;
    i += 1;
  }
  const rest = words.slice(i).join(" ");
  const line2 = rest.length > 20 ? `${rest.slice(0, 19)}…` : rest;
  return line2 ? [line1, line2] : [line1];
}

function HolidayMotif({
  palette,
  extra,
  nudge,
}: {
  palette: TicketPalette;
  extra: number;
  nudge: number;
}) {
  const cx = 180;
  const cy = 186;
  const ornaments = extra;
  return (
    <g>
      <circle cx={cx} cy={cy} r="46" fill="none" stroke={palette.foil} strokeWidth="11" />
      <circle cx={cx} cy={cy} r="34" fill="none" stroke={palette.accent} strokeWidth="3" />
      {Array.from({ length: ornaments }, (_, i) => {
        const a = (i / ornaments) * Math.PI * 2 - Math.PI / 2;
        return (
          <circle
            key={i}
            cx={cx + Math.cos(a) * 46}
            cy={cy + Math.sin(a) * 46}
            r={i % 2 ? 5.5 : 7.5}
            fill={i % 2 ? palette.foil : palette.accent}
          />
        );
      })}
      <polygon
        points={`${cx - 78 + nudge * 0.4},${cy + 18} ${cx - 98 + nudge * 0.4},${cy - 38} ${cx - 118 + nudge * 0.4},${cy + 18}`}
        fill={palette.accent}
      />
      <rect x={cx - 102 + nudge * 0.4} y={cy + 18} width="16" height="8" fill={palette.bg} />
      <polygon
        points={`${cx + 78 - nudge * 0.3},${cy + 22} ${cx + 100 - nudge * 0.3},${cy - 30} ${cx + 122 - nudge * 0.3},${cy + 22}`}
        fill={palette.foil}
      />
      <rect x={cx + 92 - nudge * 0.3} y={cy + 22} width="16" height="8" fill={palette.bg} />
    </g>
  );
}

function SevensMotif({ palette, nudge }: { palette: TicketPalette; nudge: number }) {
  const shift = nudge - 8;
  return (
    <g fill={palette.foil} fontFamily={SERIF} fontSize="72" fontWeight="700">
      <text x={70 + shift} y="210" transform={`rotate(-12 ${70 + shift} 180)`}>
        7
      </text>
      <text x="150" y="200">
        7
      </text>
      <text x={230 - shift} y="214" transform={`rotate(10 ${230 - shift} 180)`}>
        7
      </text>
    </g>
  );
}

function GoldMotif({ palette, extra }: { palette: TicketPalette; extra: number }) {
  const bars = 2 + (extra % 3);
  return (
    <g>
      {Array.from({ length: bars }, (_, i) => (
        <rect
          key={i}
          x={118 - i * 6}
          y={158 + i * 16}
          width={124 + i * 12}
          height="22"
          rx="4"
          fill={palette.foil}
          stroke={palette.accent}
          strokeWidth="1.6"
        />
      ))}
      <polygon
        points="180,148 188,166 208,168 192,180 196,200 180,188 164,200 168,180 152,168 172,166"
        fill={palette.accent}
      />
    </g>
  );
}

function CrosswordMotif({ palette }: { palette: TicketPalette }) {
  const s = 18;
  const x0 = 180 - s * 2.5;
  const y0 = 152;
  return (
    <g stroke={palette.foil} strokeWidth="1.6" fill="none">
      {Array.from({ length: 5 }, (_, r) =>
        Array.from({ length: 5 }, (_, c) => {
          const filled = (r + c) % 3 === 0;
          return (
            <rect
              key={`${r}-${c}`}
              x={x0 + c * s}
              y={y0 + r * s}
              width={s}
              height={s}
              fill={filled ? palette.foil : "transparent"}
              fillOpacity={filled ? 0.85 : 0}
            />
          );
        }),
      )}
    </g>
  );
}

function LoteriaMotif({ palette }: { palette: TicketPalette }) {
  const tiles = [
    { x: 78, y: 150, fill: palette.foil },
    { x: 156, y: 150, fill: palette.accent },
    { x: 234, y: 150, fill: palette.ink },
    { x: 78, y: 196, fill: palette.accent },
    { x: 156, y: 196, fill: palette.foil },
    { x: 234, y: 196, fill: palette.bg2 },
  ];
  return (
    <g>
      {tiles.map((tile, i) => (
        <g key={i}>
          <rect
            x={tile.x}
            y={tile.y}
            width="48"
            height="42"
            rx="4"
            fill={tile.fill}
            stroke={palette.bg}
            strokeWidth="2"
          />
          {i % 3 === 0 ? (
            <circle cx={tile.x + 24} cy={tile.y + 21} r="8" fill={palette.bg} />
          ) : i % 3 === 1 ? (
            <polygon
              points={`${tile.x + 24},${tile.y + 10} ${tile.x + 36},${tile.y + 32} ${tile.x + 12},${tile.y + 32}`}
              fill={palette.bg}
            />
          ) : (
            <rect x={tile.x + 16} y={tile.y + 13} width="16" height="16" fill={palette.bg} />
          )}
        </g>
      ))}
    </g>
  );
}

function WildMotif({ palette, nudge }: { palette: TicketPalette; nudge: number }) {
  const cx = 180 + (nudge - 8);
  return (
    <g fill="none" stroke={palette.foil} strokeWidth="4" strokeLinecap="round">
      <ellipse cx={cx} cy="186" rx="28" ry="36" />
      <path d={`M${cx - 22} 168 Q${cx - 48} 150 ${cx - 40} 186`} />
      <path d={`M${cx + 22} 168 Q${cx + 48} 150 ${cx + 40} 186`} />
      <path d={`M${cx - 18} 204 Q${cx - 36} 222 ${cx - 10} 226`} />
      <path d={`M${cx + 18} 204 Q${cx + 36} 222 ${cx + 10} 226`} />
      <circle cx={cx} cy="178" r="4" fill={palette.accent} stroke="none" />
    </g>
  );
}

function SlotsMotif({ palette }: { palette: TicketPalette }) {
  return (
    <g>
      {[-1, 0, 1].map((i) => (
        <g key={i}>
          <rect
            x={180 + i * 70 - 28}
            y="152"
            width="56"
            height="70"
            rx="8"
            fill={palette.bg}
            stroke={palette.foil}
            strokeWidth="3"
          />
          <text
            x={180 + i * 70}
            y="200"
            textAnchor="middle"
            fill={palette.foil}
            fontFamily={SERIF}
            fontSize="32"
            fontWeight="700"
          >
            {i === 0 ? "7" : i < 0 ? "★" : "—"}
          </text>
        </g>
      ))}
    </g>
  );
}

function SportsMotif({
  palette,
  kind,
}: {
  palette: TicketPalette;
  kind: SportsKind | null;
}) {
  return (
    <g>
      <rect x="48" y="150" width="264" height="72" fill={palette.bg2} opacity="0.9" />
      {Array.from({ length: 6 }, (_, i) => (
        <line
          key={i}
          x1={70 + i * 44}
          y1="150"
          x2={70 + i * 44}
          y2="222"
          stroke={palette.foil}
          strokeWidth="1.4"
          opacity="0.7"
        />
      ))}
      {kind === "nascar" ? (
        Array.from({ length: 8 }, (_, i) => (
          <rect
            key={i}
            x={56 + i * 32}
            y="166"
            width="16"
            height="16"
            fill={i % 2 ? palette.foil : palette.bg}
          />
        ))
      ) : (
        <ellipse
          cx="180"
          cy="186"
          rx="34"
          ry="20"
          fill="none"
          stroke={palette.foil}
          strokeWidth="3"
        />
      )}
    </g>
  );
}

function CashMotif({ palette, extra }: { palette: TicketPalette; extra: number }) {
  const n = 2 + (extra % 3);
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <rect
          key={i}
          x={128 + i * 8}
          y={158 + i * 14}
          width="104"
          height="36"
          rx="4"
          fill={i % 2 ? palette.foil : palette.accent}
          stroke={palette.bg}
          strokeWidth="1.4"
        />
      ))}
    </g>
  );
}

function MultiplierMotif({ palette, nudge }: { palette: TicketPalette; nudge: number }) {
  const x = 180;
  const y = 186;
  const s = 28 + (nudge % 6);
  return (
    <g stroke={palette.foil} strokeWidth="10" strokeLinecap="round">
      <line x1={x - s} y1={y - s} x2={x + s} y2={y + s} />
      <line x1={x + s} y1={y - s} x2={x - s} y2={y + s} />
    </g>
  );
}

function FrenzyMotif({ palette }: { palette: TicketPalette }) {
  const x = 180;
  const y = 186;
  return (
    <g stroke={palette.foil} strokeWidth="3" fill="none">
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6;
        return (
          <line
            key={i}
            x1={x}
            y1={y}
            x2={x + Math.cos(a) * 48}
            y2={y + Math.sin(a) * 48}
          />
        );
      })}
      <circle cx={x} cy={y} r="10" fill={palette.accent} stroke="none" />
    </g>
  );
}

function HighMotif({ palette }: { palette: TicketPalette }) {
  return (
    <g fill="none" stroke={palette.foil} strokeWidth="3">
      <polygon points="180,148 214,186 180,224 146,186" />
      <polygon points="180,160 202,186 180,212 158,186" />
      <polygon points="180,172 190,186 180,200 170,186" fill={palette.accent} stroke="none" />
    </g>
  );
}

function HeartsMotif({ palette }: { palette: TicketPalette }) {
  return (
    <g fill={palette.foil}>
      <path d="M180 214 C180 214 132 178 132 160 C132 146 144 138 156 138 C168 138 176 146 180 156 C184 146 192 138 204 138 C216 138 228 146 228 160 C228 178 180 214 180 214 Z" />
    </g>
  );
}

function CurrencyMotif({ palette }: { palette: TicketPalette }) {
  return (
    <g>
      <rect x="118" y="158" width="124" height="64" rx="6" fill={palette.foil} />
      <rect x="128" y="166" width="104" height="48" rx="4" fill={palette.bg2} />
      <circle cx="180" cy="190" r="14" fill={palette.foil} />
    </g>
  );
}

function FamilyMotif({ spec }: { spec: TicketChrome }) {
  const { family, palette, extraCount, nudge, sportsKind: kind } = spec;
  if (family === "holiday") return <HolidayMotif palette={palette} extra={extraCount} nudge={nudge} />;
  if (family === "sevens") return <SevensMotif palette={palette} nudge={nudge} />;
  if (family === "gold") return <GoldMotif palette={palette} extra={extraCount} />;
  if (family === "crossword") return <CrosswordMotif palette={palette} />;
  if (family === "loteria") return <LoteriaMotif palette={palette} />;
  if (family === "wild") return <WildMotif palette={palette} nudge={nudge} />;
  if (family === "slots") return <SlotsMotif palette={palette} />;
  if (family === "sports") return <SportsMotif palette={palette} kind={kind} />;
  if (family === "multiplier") return <MultiplierMotif palette={palette} nudge={nudge} />;
  if (family === "frenzy") return <FrenzyMotif palette={palette} />;
  if (family === "high") return <HighMotif palette={palette} />;
  if (family === "hearts") return <HeartsMotif palette={palette} />;
  if (family === "currency") return <CurrencyMotif palette={palette} />;
  return <CashMotif palette={palette} extra={extraCount} />;
}

function PlayPanel({ spec }: { spec: TicketChrome }) {
  const { family, palette, extraCount } = spec;
  const y = 308;
  if (family === "holiday") {
    const n = extraCount;
    const gap = 260 / n;
    return (
      <g>
        {Array.from({ length: n }, (_, i) => (
          <circle
            key={i}
            cx={50 + gap * i + gap / 2}
            cy={y + 56}
            r="22"
            fill={palette.bg}
            stroke={palette.foil}
            strokeWidth="2"
            strokeDasharray="4 3"
          />
        ))}
      </g>
    );
  }
  if (family === "crossword" || family === "loteria") {
    const cols = family === "loteria" ? 4 : 5;
    const s = family === "loteria" ? 52 : 42;
    const x0 = 180 - (cols * s) / 2;
    return (
      <g>
        {Array.from({ length: cols * 2 }, (_, i) => (
          <rect
            key={i}
            x={x0 + (i % cols) * s}
            y={y + 12 + Math.floor(i / cols) * s}
            width={s - 6}
            height={s - 6}
            rx="3"
            fill={palette.bg}
            stroke={palette.foil}
            strokeWidth="1.5"
          />
        ))}
      </g>
    );
  }
  if (family === "sevens" || family === "slots") {
    return (
      <g>
        {[0, 1, 2].map((i) => (
          <rect
            key={i}
            x={46 + i * 100}
            y={y + 18}
            width="88"
            height="88"
            rx="10"
            fill={palette.bg}
            stroke={palette.foil}
            strokeWidth="2.2"
          />
        ))}
      </g>
    );
  }
  if (family === "multiplier") {
    return (
      <g>
        {Array.from({ length: 8 }, (_, i) => (
          <rect
            key={i}
            x={40 + (i % 4) * 76}
            y={y + 16 + Math.floor(i / 4) * 52}
            width="66"
            height="42"
            rx="4"
            fill={palette.bg}
            stroke={palette.foil}
            strokeWidth="1.6"
          />
        ))}
      </g>
    );
  }
  const boxes = 3 + (extraCount % 3);
  const w = 280 / boxes - 8;
  return (
    <g>
      {Array.from({ length: boxes }, (_, i) => (
        <rect
          key={i}
          x={40 + i * (w + 8)}
          y={y + 24}
          width={w}
          height="80"
          rx="8"
          fill={palette.bg}
          stroke={palette.foil}
          strokeWidth="2"
        />
      ))}
    </g>
  );
}

function ChromeArt({ spec, uid }: { spec: TicketChrome; uid: string }) {
  const { palette, sashAngle, name, price, winUpTo, family } = spec;
  const glow = `${uid}-glow`;
  const [line1, line2] = titleLines(name);
  const nameSize = name.length > 22 ? 22 : name.length > 14 ? 26 : 30;
  return (
    <svg
      viewBox="0 0 360 480"
      className="pointer-events-none h-full w-full"
      aria-hidden="true"
      preserveAspectRatio="xMidYMin meet"
      data-ticket-family={family}
    >
      <defs>
        <linearGradient id={glow} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.bg2} />
          <stop offset="55%" stopColor={palette.bg} />
          <stop offset="100%" stopColor={palette.bg} />
        </linearGradient>
      </defs>
      <rect width="360" height="480" rx="16" fill={`url(#${glow})`} />
      <rect
        x="210"
        y="-30"
        width="26"
        height="260"
        fill={palette.accent}
        opacity="0.55"
        transform={`rotate(${sashAngle} 223 100)`}
      />
      <rect x="14" y="14" width="78" height="46" rx="8" fill={palette.foil} />
      <text
        x="53"
        y="45"
        textAnchor="middle"
        fill={palette.bg}
        fontFamily={MONO}
        fontSize={price >= 10 ? 20 : 22}
        fontWeight="700"
      >
        ${price}
      </text>
      <text
        x="180"
        y={line2 ? 92 : 102}
        textAnchor="middle"
        fill={palette.ink}
        fontFamily={SERIF}
        fontSize={nameSize}
        fontWeight="700"
      >
        {line1}
      </text>
      {line2 ? (
        <text
          x="180"
          y="122"
          textAnchor="middle"
          fill={palette.ink}
          fontFamily={SERIF}
          fontSize={nameSize - 2}
          fontWeight="700"
        >
          {line2}
        </text>
      ) : null}
      <text
        x="180"
        y={line2 ? 144 : 132}
        textAnchor="middle"
        fill={palette.foil}
        fontFamily={MONO}
        fontSize="11"
        letterSpacing="1.8"
      >
        {`WIN UP TO ${winUpTo}`}
      </text>
      <FamilyMotif spec={spec} />
      <rect
        x="22"
        y="292"
        width="316"
        height="148"
        rx="12"
        fill="#121410"
        fillOpacity="0.38"
        stroke={palette.foil}
        strokeOpacity="0.55"
        strokeWidth="1.6"
      />
      <text
        x="36"
        y="314"
        fill={palette.foil}
        fillOpacity="0.75"
        fontFamily={MONO}
        fontSize="10"
        letterSpacing="1.8"
      >
        PLAY
      </text>
      <PlayPanel spec={spec} />
      <text
        x="180"
        y="464"
        textAnchor="middle"
        fill={palette.ink}
        fillOpacity="0.7"
        fontFamily={MONO}
        fontSize="8"
        letterSpacing="0.3"
      >
        Independent reconstruction — not official ticket art.
      </text>
      <rect
        x="8"
        y="8"
        width="344"
        height="464"
        rx="12"
        fill="none"
        stroke={palette.foil}
        strokeOpacity="0.4"
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
      data-ticket-family={spec.family}
      data-ticket-sash={spec.sashAngle}
      data-ticket-extra={spec.extraCount}
    >
      <ChromeArt spec={spec} uid={`svt-${spec.state}-${spec.number}-${reactId}`} />
    </div>
  );
}
