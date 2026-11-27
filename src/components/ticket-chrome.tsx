import { useId } from "react";
import type { Game } from "@/data/games";
import { contrastRatio, isLightHex } from "@/lib/ticket-palette";
import { ticketChrome, type TicketChrome, type TicketPalette } from "@/lib/ticket-chrome";

const DISPLAY = "Anton, Impact, 'Arial Black', sans-serif";
const MONO = "IBM Plex Mono, ui-monospace, monospace";

type Box = { x: number; y: number; w: number; h: number };

function canvasFor(spec: TicketChrome): { width: number; height: number } {
  const aspect = spec.aspect > 0.2 && spec.aspect < 4 ? spec.aspect : 0.54;
  if (spec.orientation === "landscape" || aspect > 1.08) {
    const height = 360;
    return { width: Math.round(height * aspect), height };
  }
  const width = 360;
  return { width, height: Math.round(width / aspect) };
}

function titlePlan(name: string): { lines: string[]; accentSecond: boolean } {
  const clean = name.replace(/\s+/g, " ").trim().toUpperCase();
  const mult = clean.match(/^(\d+\s*X)\b\s+(.+)$/);
  if (mult?.[1] && mult[2]) {
    return { lines: [mult[1].replace(/\s+/g, ""), mult[2]], accentSecond: true };
  }
  if (clean.length <= 14) return { lines: [clean], accentSecond: false };
  const words = clean.split(" ");
  if (words.length < 2) {
    return { lines: [clean.length > 18 ? `${clean.slice(0, 17)}…` : clean], accentSecond: false };
  }
  let line1 = words[0] ?? clean;
  let i = 1;
  while (i < words.length - 1 && `${line1} ${words[i]}`.length <= 14) {
    line1 += ` ${words[i]}`;
    i += 1;
  }
  const rest = words.slice(i).join(" ");
  const line2 = rest.length > 18 ? `${rest.slice(0, 17)}…` : rest;
  return { lines: line2 ? [line1, line2] : [line1], accentSecond: false };
}

function fontSize(line: string): number {
  const n = line.length;
  if (n <= 5) return 52;
  if (n <= 9) return 42;
  if (n <= 13) return 34;
  return 28;
}

function badgeColors(palette: TicketPalette): { fill: string; text: string; ring: string } {
  const lightInk = isLightHex(palette.ink);
  const fill = lightInk ? palette.foil : palette.ink;
  const text = isLightHex(fill) ? (isLightHex(palette.bg) ? "#1A120C" : palette.bg) : palette.foil;
  return { fill, text, ring: palette.foil };
}

function bannerColors(palette: TicketPalette): { fill: string; text: string } {
  const fill = isLightHex(palette.ink) ? "#F7F4EE" : palette.ink;
  const text = isLightHex(fill) ? (isLightHex(palette.bg) ? "#1A120C" : palette.bg) : palette.foil;
  return { fill, text };
}

function titleColor(palette: TicketPalette): string {
  const foilContrast = contrastRatio(palette.foil, palette.bg);
  const inkContrast = contrastRatio(palette.ink, palette.bg);
  if (foilContrast >= 1.7) return palette.foil;
  return inkContrast > foilContrast ? palette.ink : palette.foil;
}

function GridCells({
  box,
  palette,
  cols,
  rows,
}: {
  box: Box;
  palette: TicketPalette;
  cols: number;
  rows: number;
}) {
  const gap = Math.max(6, Math.min(10, box.w / 40));
  const pad = 16;
  const cw = (box.w - pad * 2 - gap * (cols - 1)) / cols;
  const ch = (box.h - pad * 2 - gap * (rows - 1)) / rows;
  const cells = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={box.x + pad + c * (cw + gap)}
          y={box.y + pad + r * (ch + gap)}
          width={cw}
          height={ch}
          rx={Math.min(8, cw / 5)}
          fill={palette.bg2}
          stroke={palette.foil}
          strokeOpacity={0.85}
          strokeWidth={1.6}
        />,
      );
    }
  }
  return <g>{cells}</g>;
}

function DiamondField({ box, palette, cols }: { box: Box; palette: TicketPalette; cols: number }) {
  const pad = 18;
  const rows = Math.max(4, Math.min(8, Math.round((box.h - pad * 2) / 48)));
  const cw = (box.w - pad * 2) / cols;
  const ch = (box.h - pad * 2) / rows;
  const diamonds = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const cx = box.x + pad + c * cw + cw / 2;
      const cy = box.y + pad + r * ch + ch / 2;
      const rx = cw * 0.3;
      const ry = ch * 0.36;
      diamonds.push(
        <polygon
          key={`${r}-${c}`}
          points={`${cx},${cy - ry} ${cx + rx},${cy} ${cx},${cy + ry} ${cx - rx},${cy}`}
          fill={palette.bg2}
          stroke={palette.foil}
          strokeOpacity={0.9}
          strokeWidth={1.5}
        />,
      );
    }
  }
  return <g>{diamonds}</g>;
}

function CirclesAndCells({ box, palette }: { box: Box; palette: TicketPalette }) {
  const circles = 3;
  const colW = box.w * 0.28;
  const gap = 12;
  const nodes = [];
  for (let i = 0; i < circles; i += 1) {
    const cy = box.y + ((i + 0.5) * box.h) / circles;
    nodes.push(
      <circle
        key={`c-${i}`}
        cx={box.x + colW / 2 + 8}
        cy={cy}
        r={Math.min(colW * 0.34, box.h / 8)}
        fill={palette.bg2}
        stroke={palette.foil}
        strokeWidth={1.7}
      />,
    );
  }
  const grid: Box = {
    x: box.x + colW + gap,
    y: box.y,
    w: box.w - colW - gap,
    h: box.h,
  };
  return (
    <g>
      {nodes}
      <GridCells box={grid} palette={palette} cols={3} rows={3} />
    </g>
  );
}

function CrosswordGrid({ box, palette }: { box: Box; palette: TicketPalette }) {
  const cols = 8;
  const rows = Math.max(6, Math.min(12, Math.round(box.h / 36)));
  const pad = 14;
  const s = Math.min((box.w - pad * 2) / cols, (box.h - pad * 2) / rows);
  const x0 = box.x + (box.w - s * cols) / 2;
  const y0 = box.y + (box.h - s * rows) / 2;
  const cells = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const filled = (r + c) % 3 === 0 || (r * 2 + c) % 7 === 0;
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={x0 + c * s}
          y={y0 + r * s}
          width={s - 1.5}
          height={s - 1.5}
          fill={filled ? palette.foil : palette.bg}
          fillOpacity={filled ? 0.9 : 0.35}
          stroke={palette.foil}
          strokeOpacity={0.55}
          strokeWidth={1}
        />,
      );
    }
  }
  return <g>{cells}</g>;
}

function ScratchWindow({ spec, box }: { spec: TicketChrome; box: Box }) {
  const { palette, motif, extraCount } = spec;
  const cols = motif === "grid" ? 4 + (extraCount % 2) : 4;
  const rows = motif === "grid" ? Math.max(4, Math.min(6, 3 + (extraCount % 3))) : 4;
  return (
    <g>
      <rect
        x={box.x}
        y={box.y}
        width={box.w}
        height={box.h}
        rx={16}
        fill={palette.bg}
        stroke={palette.foil}
        strokeOpacity={0.8}
        strokeWidth={2}
      />
      <text
        x={box.x + 14}
        y={box.y + 18}
        fill={palette.foil}
        fillOpacity={0.8}
        fontFamily={MONO}
        fontSize={10}
        letterSpacing={1.6}
      >
        PLAY AREA
      </text>
      <g transform={`translate(0 10)`}>
        {motif === "diamonds" ? (
          <DiamondField
            box={{ ...box, y: box.y + 8, h: box.h - 8 }}
            palette={palette}
            cols={cols}
          />
        ) : motif === "circles" ? (
          <CirclesAndCells box={{ ...box, y: box.y + 12, h: box.h - 16 }} palette={palette} />
        ) : motif === "crossword" ? (
          <CrosswordGrid box={{ ...box, y: box.y + 10, h: box.h - 14 }} palette={palette} />
        ) : (
          <GridCells
            box={{ ...box, y: box.y + 8, h: box.h - 8 }}
            palette={palette}
            cols={cols}
            rows={rows}
          />
        )}
      </g>
    </g>
  );
}

function ChromeArt({ spec, uid }: { spec: TicketChrome; uid: string }) {
  const { palette, name, price, winUpTo, number, motif } = spec;
  const { width, height } = canvasFor(spec);
  const glow = `${uid}-glow`;
  const plan = titlePlan(name);
  const primary = titleColor(palette);
  const second =
    plan.accentSecond && contrastRatio(palette.accent, palette.bg) >= 1.6
      ? palette.accent
      : primary;
  const badge = badgeColors(palette);
  const banner = bannerColors(palette);
  const titleStart = 118;
  const lineGap = 46;
  const bannerY = titleStart + plan.lines.length * lineGap + 6;
  const footer = 46;
  const playTop = Math.min(bannerY + 28, height - footer - 88);
  const play: Box = {
    x: 20,
    y: playTop,
    w: width - 40,
    h: Math.max(72, height - playTop - footer),
  };
  const bannerText = `WIN UP TO ${winUpTo}`;
  const bannerW = Math.min(width - 48, Math.max(168, bannerText.length * 8.4 + 28));
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="pointer-events-none h-full w-full"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
      data-ticket-motif={motif}
    >
      <defs>
        <linearGradient id={glow} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.bg2} />
          <stop offset="42%" stopColor={palette.bg} />
          <stop offset="100%" stopColor={palette.bg} />
        </linearGradient>
      </defs>
      <rect width={width} height={height} rx={22} fill={`url(#${glow})`} />
      <rect
        x={10}
        y={10}
        width={width - 20}
        height={height - 20}
        rx={16}
        fill="none"
        stroke={palette.foil}
        strokeOpacity={0.55}
        strokeWidth={2}
      />
      <rect
        x={16}
        y={16}
        width={width - 32}
        height={height - 32}
        rx={12}
        fill="none"
        stroke={palette.foil}
        strokeOpacity={0.28}
        strokeWidth={1.2}
      />
      <circle cx={52} cy={54} r={30} fill={badge.fill} stroke={badge.ring} strokeWidth={2.4} />
      <text
        x={52}
        y={62}
        textAnchor="middle"
        fill={badge.text}
        fontFamily={MONO}
        fontSize={price >= 10 ? 18 : 22}
        fontWeight={700}
      >
        ${price}
      </text>
      <text
        x={width - 28}
        y={50}
        textAnchor="end"
        fill={palette.ink}
        fillOpacity={0.82}
        fontFamily={MONO}
        fontSize={13}
        letterSpacing={1.8}
      >
        {`GAME ${number}`}
      </text>
      {plan.lines.map((line, index) => (
        <text
          key={`${index}-${line}`}
          x={width / 2}
          y={titleStart + index * lineGap}
          textAnchor="middle"
          fill={index === 1 ? second : primary}
          stroke={isLightHex(index === 1 ? second : primary) ? "#1A120C" : palette.foil}
          strokeWidth={0.6}
          paintOrder="stroke"
          fontFamily={DISPLAY}
          fontSize={fontSize(line)}
          letterSpacing={0.5}
        >
          {line}
        </text>
      ))}
      <rect
        x={(width - bannerW) / 2}
        y={bannerY - 18}
        width={bannerW}
        height={26}
        rx={8}
        fill={banner.fill}
      />
      <text
        x={width / 2}
        y={bannerY}
        textAnchor="middle"
        fill={banner.text}
        fontFamily={MONO}
        fontSize={11}
        fontWeight={700}
        letterSpacing={0.6}
      >
        {bannerText}
      </text>
      <ScratchWindow spec={spec} box={play} />
      <text
        x={width / 2}
        y={height - 28}
        textAnchor="middle"
        fill={palette.ink}
        fillOpacity={0.78}
        fontFamily={MONO}
        fontSize={7.5}
      >
        Independent reconstruction — not official ticket art.
      </text>
      <text
        x={width / 2}
        y={height - 16}
        textAnchor="middle"
        fill={palette.ink}
        fillOpacity={0.62}
        fontFamily={MONO}
        fontSize={7}
        letterSpacing={0.4}
      >
        NOT AFFILIATED · SCRATCH VAULT LOOKALIKE
      </text>
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
      data-ticket-motif={spec.motif}
      data-ticket-aspect={spec.aspect}
      data-ticket-orientation={spec.orientation}
      data-ticket-source={spec.paletteSource}
      data-ticket-accent={spec.palette.accent}
      data-ticket-sash={spec.sashAngle}
      data-ticket-extra={spec.extraCount}
    >
      <ChromeArt spec={spec} uid={`svt-${spec.state}-${spec.number}-${reactId}`} />
    </div>
  );
}
