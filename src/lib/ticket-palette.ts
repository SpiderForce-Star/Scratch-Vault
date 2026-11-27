/**
 * Color facts derived from a ticket image. No image bytes, no source URLs.
 * Near-white, near-black, and low-saturation gray are dropped before clustering.
 * A distinctive saturated color can win accent even when it is not the largest cluster.
 */

export type TicketPalette = {
  bg: string;
  bg2: string;
  foil: string;
  accent: string;
  ink: string;
};

type Rgb = { r: number; g: number; b: number };

type Cluster = Rgb & { n: number };

const PAPER = "#F4F0EA";
const INK_DARK = "#14100C";
const INK_LIGHT = "#FFF8E6";

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const h = (n: number) => clampByte(n).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

export function hexToRgb(hex: string): Rgb {
  const raw = hex.replace("#", "").trim();
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

export function hexDistance(a: string, b: string): number {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return Math.hypot(A.r - B.r, A.g - B.g, A.b - B.b);
}

export function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  if (d < 1e-6) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === R) h = (G - B) / d + (G < B ? 6 : 0);
  else if (max === G) h = (B - R) / d + 2;
  else h = (R - G) / d + 4;
  return { h: h * 60, s, l };
}

export function relativeLuminance({ r, g, b }: Rgb): number {
  const f = (c: number) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(a: string, b: string): number {
  const L1 = relativeLuminance(hexToRgb(a));
  const L2 = relativeLuminance(hexToRgb(b));
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}

export function isLightHex(hex: string): boolean {
  return relativeLuminance(hexToRgb(hex)) >= 0.45;
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

function rgbDistance(a: Rgb, b: Rgb): number {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

/** Drop paper, ink, and gray so the clusters are the ticket's actual colors. */
export function keepTicketPixel(rgb: Rgb): boolean {
  const { s, l } = rgbToHsl(rgb);
  if (l >= 0.93) return false;
  if (l <= 0.07) return false;
  if (s <= 0.12) return false;
  return true;
}

function mixHex(base: string, toward: string, t: number): string {
  const a = hexToRgb(base);
  const b = hexToRgb(toward);
  return rgbToHex({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  });
}

type Family = {
  hue: number;
  sat: number;
  n: number;
  clusters: Cluster[];
};

function clusterPixels(
  data: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
): Cluster[] {
  const bins = new Map<string, Cluster>();
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 8000)));
  const q = 12;
  let kept = 0;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const a = data[i + 3] ?? 255;
      if (a < 200) continue;
      const rgb = { r: data[i] ?? 0, g: data[i + 1] ?? 0, b: data[i + 2] ?? 0 };
      if (!keepTicketPixel(rgb)) continue;
      kept += 1;
      const rq = clampByte(Math.round(rgb.r / q) * q);
      const gq = clampByte(Math.round(rgb.g / q) * q);
      const bq = clampByte(Math.round(rgb.b / q) * q);
      const key = `${rq},${gq},${bq}`;
      const bin = bins.get(key);
      if (bin) {
        const n = bin.n + 1;
        bin.r = (bin.r * bin.n + rgb.r) / n;
        bin.g = (bin.g * bin.n + rgb.g) / n;
        bin.b = (bin.b * bin.n + rgb.b) / n;
        bin.n = n;
      } else {
        bins.set(key, { r: rgb.r, g: rgb.g, b: rgb.b, n: 1 });
      }
    }
  }
  const clusters: Cluster[] = [];
  for (const bin of [...bins.values()].sort((a, b) => b.n - a.n)) {
    let best = -1;
    let bestD = 36;
    for (let i = 0; i < clusters.length; i += 1) {
      const d = rgbDistance(clusters[i]!, bin);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best < 0) {
      clusters.push({ ...bin });
      continue;
    }
    const target = clusters[best]!;
    const n = target.n + bin.n;
    target.r = (target.r * target.n + bin.r * bin.n) / n;
    target.g = (target.g * target.n + bin.g * bin.n) / n;
    target.b = (target.b * target.n + bin.b * bin.n) / n;
    target.n = n;
  }
  clusters.sort((a, b) => b.n - a.n);
  const floor = Math.max(2, kept * 0.008);
  const significant = clusters.filter((c) => c.n >= floor);
  return (significant.length >= 2 ? significant : clusters).slice(0, 16);
}

function familiesOf(clusters: Cluster[]): Family[] {
  const families: Family[] = [];
  const ordered = [...clusters].sort((a, b) => b.n - a.n);
  for (const cluster of ordered) {
    const hsl = rgbToHsl(cluster);
    let placed = false;
    for (const family of families) {
      const away = hueDistance(family.hue, hsl.h);
      const vividOutlier = hsl.s >= 0.75 && away > 22;
      if (!vividOutlier && away <= 40) {
        family.clusters.push(cluster);
        family.n += cluster.n;
        placed = true;
        break;
      }
    }
    if (!placed) {
      families.push({ hue: hsl.h, sat: hsl.s, n: cluster.n, clusters: [cluster] });
    }
  }
  families.sort((a, b) => b.n - a.n);
  return families;
}

/**
 * Five-role palette from RGBA pixels (width * height * 4).
 * bg/bg2 come from the largest hue family. Accent is the most distinctive
 * saturated color outside that family, even when a bigger cluster exists.
 */
export function paletteFromRgba(
  data: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
): TicketPalette {
  const clusters = clusterPixels(data, width, height);
  if (!clusters.length) {
    return { bg: "#1C2430", bg2: "#314056", foil: PAPER, accent: "#D4A24C", ink: INK_LIGHT };
  }
  const families = familiesOf(clusters);
  const bgFamily = families[0] ?? { hue: 0, sat: 0, n: clusters[0]!.n, clusters };
  const bgCluster = [...bgFamily.clusters].sort((a, b) => b.n - a.n)[0] ?? clusters[0]!;
  const bg = rgbToHex(bgCluster);
  const bgHsl = rgbToHsl(bgCluster);

  const others = bgFamily.clusters.filter((c) => c !== bgCluster);
  const bg2Cluster =
    bgHsl.l > 0.58
      ? [...others].sort((a, b) => b.n - a.n).find((c) => Math.abs(rgbToHsl(c).l - bgHsl.l) >= 0.06)
      : ([...others].filter((c) => rgbToHsl(c).l >= bgHsl.l + 0.06).sort((a, b) => b.n - a.n)[0] ??
        [...others]
          .sort((a, b) => b.n - a.n)
          .find((c) => Math.abs(rgbToHsl(c).l - bgHsl.l) >= 0.06));
  const bg2 = bg2Cluster
    ? rgbToHex(bg2Cluster)
    : mixHex(bg, bgHsl.l > 0.55 ? "#1A140C" : "#F7F3EA", 0.28);

  const total = clusters.reduce((sum, c) => sum + c.n, 0) || 1;
  let accentCluster: Cluster | null = null;
  let accentScore = 0;
  for (const cluster of clusters) {
    if (cluster === bgCluster || cluster === bg2Cluster) continue;
    const hsl = rgbToHsl(cluster);
    const share = cluster.n / total;
    const hueAway = hueDistance(bgHsl.h, hsl.h);
    // Distinctive saturated color, not the biggest patch and not a shade of the background.
    if (hsl.s < 0.32 || share < 0.02 || hueAway < 38) continue;
    const score = hsl.s * (hueAway / 180) * share ** 0.2;
    if (score > accentScore) {
      accentScore = score;
      accentCluster = cluster;
    }
  }
  let accent = accentCluster
    ? rgbToHex(accentCluster)
    : mixHex(bg, bgHsl.l > 0.5 ? "#8C1D1D" : "#F0D060", 0.55);
  if (accentCluster) {
    const seed = rgbToHsl(accentCluster);
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (const cluster of clusters) {
      const hsl = rgbToHsl(cluster);
      if (hsl.s < 0.45) continue;
      if (hueDistance(hsl.h, seed.h) > 14) continue;
      if (Math.abs(hsl.l - seed.l) > 0.16) continue;
      r += cluster.r * cluster.n;
      g += cluster.g * cluster.n;
      b += cluster.b * cluster.n;
      n += cluster.n;
    }
    if (n > 0) accent = rgbToHex({ r: r / n, g: g / n, b: b / n });
  }

  const foilCluster = [...clusters]
    .filter((c) => c !== accentCluster && c !== bgCluster)
    .map((c) => ({ c, hsl: rgbToHsl(c) }))
    .filter(({ hsl }) => hsl.l >= 0.78 && hueDistance(hsl.h, bgHsl.h) <= 14)
    .sort((a, b) => b.hsl.l - a.hsl.l)[0];
  const accentHsl = rgbToHsl(hexToRgb(accent));
  const foil = foilCluster
    ? rgbToHex(foilCluster.c)
    : accentHsl.l >= 0.45
      ? mixHex(accent, "#FFFFFF", 0.4)
      : PAPER;

  const ink = relativeLuminance(hexToRgb(bg)) >= 0.42 ? INK_DARK : INK_LIGHT;
  return { bg, bg2, foil, accent, ink };
}
