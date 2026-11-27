/**
 * Build step: measure ticket color and shape.
 *
 * Resolves each public $5–$50 game's official image server-side, downloads it
 * into a private temp file, extracts a 5-role palette plus aspect, deletes the
 * image, and writes only those facts to src/data/ticket-faces.json.
 * Official URLs and image bytes are never written into the client tree.
 *
 *   npm run faces:extract
 *
 * Optional cron: run this script on a trusted machine. It is not part of the
 * client build and it does not hotlink images.
 */
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { paletteFromRgba } from "../src/lib/ticket-palette.ts";
import type { TicketFaceRecord } from "../src/lib/ticket-faces.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FACE_PATH = join(root, "src/data/ticket-faces.json");
const COVERAGE_PATH = join(root, "src/data/ticket-faces.coverage.json");
const HTTP = join(root, "scripts/http-get.py");
const PUBLIC_STATES = [
  "tn",
  "ky",
  "sc",
  "ok",
  "nc",
  "pa",
  "tx",
  "mo",
  "ia",
  "id",
  "mi",
  "oh",
] as const;
const DESK_PRICES = new Set([5, 10, 20, 25, 30, 50]);

type GameRef = { state: string; number: number };
type Fail = { number: number; reason: string };

const UA_NOTE = "scratch-vault face extract";
void UA_NOTE;

function isImage(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8) return true;
  if (buf[0] === 0x89 && buf.subarray(1, 4).toString("ascii") === "PNG") return true;
  if (buf.subarray(0, 4).toString("ascii") === "GIF8") return true;
  if (
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return true;
  }
  return false;
}

function http(
  url: string,
  postBody?: string,
): Promise<{ status: number; type: string; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const args = [HTTP, url, ""];
    const destPromise = mkdtemp(join(tmpdir(), "sv-face-")).then((dir) => join(dir, "body"));
    destPromise
      .then((dest) => {
        args[2] = dest;
        if (postBody != null) args.push(postBody);
        const child = spawn("python3", args, { stdio: ["ignore", "pipe", "pipe"] });
        let out = "";
        child.stdout.on("data", (chunk) => {
          out += chunk.toString();
        });
        child.on("error", reject);
        child.on("close", async () => {
          const [statusLine, typeLine] = out.trim().split("\n");
          const status = Number(statusLine || 0);
          const type = typeLine || "";
          let body = Buffer.alloc(0);
          try {
            body = await readFile(dest);
          } catch {
            body = Buffer.alloc(0);
          }
          await rm(dirname(dest), { recursive: true, force: true });
          resolve({ status, type, body });
        });
      })
      .catch(reject);
  });
}

async function httpText(url: string): Promise<{ status: number; text: string }> {
  const res = await http(url);
  return { status: res.status, text: res.body.toString("utf8") };
}

function abs(base: string, href: string): string {
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}

function imageUrls(html: string, base: string): string[] {
  const found = new Set<string>();
  const re =
    /https?:\/\/[^"'\\\s>]+\.(?:jpg|jpeg|png|gif|webp)|\/[^"'\\\s>]+\.(?:jpg|jpeg|png|gif|webp)/gi;
  for (const match of html.matchAll(re)) {
    const raw = match[0].replace(/&amp;/g, "&").replace(/\\u0026/g, "&");
    const clean = raw.split("?")[0] ?? raw;
    if (/logo|icon|favicon|sprite|avatar|footer/i.test(clean)) continue;
    found.add(abs(base, clean));
  }
  return [...found];
}

function scoreUrl(url: string, number: number): number {
  const padded = String(number).padStart(3, "0");
  const padded4 = String(number).padStart(4, "0");
  const has =
    new RegExp(`(?:^|\\D)${number}(?:\\D|$)`).test(url) ||
    url.includes(padded4) ||
    url.toLowerCase().includes(`nc${number}`) ||
    url.toLowerCase().includes(`ok${number}`) ||
    url.toLowerCase().includes(`ky${number}`);
  if (!has && !url.includes(padded)) return -1;
  if (/logo|icon|favicon|wordmark/i.test(url)) return -1;
  let score = 1;
  if (/covered|comp_covered|_cv|cv_|cv\.|cvv/i.test(url)) score += 6;
  if (/uncov|scratched|\buc\b|_uc/i.test(url)) score -= 4;
  if (/thumb|tile|featured/i.test(url)) score -= 1;
  if (/featured/i.test(url)) score += 2;
  return score;
}

function bestUrl(urls: string[], number: number): string | null {
  const ranked = urls
    .map((url) => ({ url, score: scoreUrl(url, number) }))
    .filter((row) => row.score >= 0)
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.url ?? null;
}

async function firstImage(urls: string[]): Promise<{ url: string; body: Buffer } | null> {
  for (const url of urls) {
    const res = await http(url);
    if (res.status >= 200 && res.status < 300 && isImage(res.body) && res.body.length > 800) {
      return { url, body: res.body };
    }
  }
  return null;
}

function directCandidates(state: string, number: number): string[] {
  if (state === "sc")
    return [`https://www.sceducationlottery.com/images/games/instantgames/${number}.jpg`];
  if (state === "nc") {
    return [
      `https://www.nclottery.com/Content/Images/Instant/nc${number}.jpg`,
      `https://www.nclottery.com/Content/Images/Instant/nc${String(number).padStart(3, "0")}.jpg`,
    ];
  }
  if (state === "pa") {
    return [
      `https://www.palottery.pa.gov/uploadedimages/PA-${number}_CV_400x750.jpg`,
      `https://www.palottery.pa.gov/uploadedimages/PA-${number}_CV.jpg`,
    ];
  }
  if (state === "tx") {
    return [
      `https://www.texaslottery.com/export/sites/lottery/Images/scratchoffs/${number}_img1.gif`,
      `https://www.texaslottery.com/export/sites/lottery/Images/scratchoffs/${number}_img1.jpg`,
      `https://www.texaslottery.com/export/sites/lottery/Images/scratchoffs/${number}_img1.png`,
    ];
  }
  if (state === "mo") {
    return [
      `https://www.molottery.com/media/scratchers/full/${number}.png`,
      `https://www.molottery.com/media/scratchers/full/${number}.jpg`,
    ];
  }
  return [];
}

async function mapKy(): Promise<Map<number, string>> {
  const page = await httpText("https://www.kylottery.com/apps/scratch_offs/index.html");
  const map = new Map<number, string>();
  if (page.status !== 200) return map;
  for (const match of page.text.matchAll(
    /availableGamesDtl\.push\("(\/apps\/scratch_offs\/games\/[^"]+_(\d+))"\)/g,
  )) {
    const path = match[1];
    const number = Number(match[2]);
    if (path && number) map.set(number, `https://www.kylottery.com${path}`);
  }
  return map;
}

async function mapId(): Promise<Map<number, string>> {
  const page = await httpText("https://www.idaholottery.com/games/scratch");
  const map = new Map<number, string>();
  if (page.status !== 200) return map;
  for (const match of page.text.matchAll(
    /https?:\/\/[^"'\\\s]+\/(\d+)_(featured|thumbnail)\.[a-z]+/gi,
  )) {
    const number = Number(match[1]);
    const url = match[0].split("?")[0];
    if (!number || !url) continue;
    const featured = url.replace("_thumbnail", "_featured");
    const prev = map.get(number);
    if (!prev || url.includes("_featured")) map.set(number, featured);
  }
  return map;
}

async function mapMi(): Promise<Map<number, string>> {
  const page = await httpText("https://www.michiganlottery.com/instant-games");
  const map = new Map<number, string>();
  if (page.status !== 200) return map;
  for (const match of page.text.matchAll(/href="(\/games\/0*(\d+)-[^"]+)"/g)) {
    const path = match[1];
    const number = Number(match[2]);
    if (path && number) map.set(number, `https://www.michiganlottery.com${path}`);
  }
  return map;
}

function okSlug(file: string): string {
  return file
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/_web_?tile.*/i, "")
    .replace(/^\d{3,4}[_-]/, "")
    .replace(/__\d+.*$/i, "")
    .replace(/_/g, "-")
    .replace(/[^a-z0-9-]/gi, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

async function mapOk(): Promise<{ pages: Map<number, string>; tiles: Map<number, string> }> {
  const page = await httpText("https://oklottery.com/games/scratchers");
  const pages = new Map<number, string>();
  const tiles = new Map<number, string>();
  if (page.status !== 200) return { pages, tiles };
  for (const match of page.text.matchAll(/\/games\/scratchers\/(\d+)-[a-z0-9-]+/g)) {
    const number = Number(match[1]);
    const path = match[0];
    if (number && path) pages.set(number, `https://oklottery.com${path}`);
  }
  for (const match of page.text.matchAll(/https?:\/\/images\.ctfassets\.net\/[^"'\\\s?]+/g)) {
    const url = match[0].replace(/\\+$/, "");
    const file = decodeURIComponent(url.split("/").pop() ?? "");
    const num = file.match(/^(\d{3,4})[_-]/);
    if (!num) continue;
    const number = Number(num[1]);
    if (!tiles.has(number)) tiles.set(number, url);
    if (pages.has(number)) continue;
    const slug = okSlug(file);
    if (slug.length > 1)
      pages.set(number, `https://oklottery.com/games/scratchers/${number}-${slug}`);
  }
  return { pages, tiles };
}

async function mapOh(): Promise<Map<number, string> | "no-public-token" | "api-denied"> {
  const js = await httpText("https://www.ohiolottery.com/dist/js/app.js");
  const creds = js.text.match(/getNewAPItoken\(\)\{let e="([^"]+)",t="([^"]+)"/);
  if (!creds?.[1] || !creds[2]) return "no-public-token";
  const login = await http(
    "https://authapi-solutions.ohiolottery.com/1.0/Authentication/Login",
    JSON.stringify({ userName: creds[1], password: creds[2] }),
  );
  if (login.status !== 200) return "api-denied";
  let token = "";
  try {
    const parsed = JSON.parse(login.body.toString("utf8")) as { data?: { token?: string } };
    token = parsed.data?.token ?? "";
  } catch {
    return "api-denied";
  }
  if (!token) return "api-denied";
  const authed = await fetch(
    "https://api-solutions.ohiolottery.com/1.0/Games/ScratchOffs/ScratchOffGame/GetAllGames",
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } },
  );
  if (!authed.ok) return "api-denied";
  const payload = (await authed.json()) as {
    data?: Record<string, Array<{ gameNumber?: string; gameGraphicURL?: string }>>;
  };
  const map = new Map<number, string>();
  for (const rows of Object.values(payload.data ?? {})) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      const number = Number(row.gameNumber);
      const graphic = row.gameGraphicURL;
      if (!number || !graphic) continue;
      map.set(number, abs("https://www.ohiolottery.com", graphic));
    }
  }
  return map;
}

async function resolveUrl(
  state: string,
  number: number,
  lists: {
    ky: Map<number, string>;
    id: Map<number, string>;
    mi: Map<number, string>;
    ok: Map<number, string>;
    okTiles: Map<number, string>;
    oh: Map<number, string> | "no-public-token" | "api-denied";
    tnStatus: number;
  },
): Promise<{ body: Buffer } | { reason: string }> {
  const direct = directCandidates(state, number);
  if (direct.length) {
    const hit = await firstImage(direct);
    return hit ? { body: hit.body } : { reason: "image-not-found" };
  }
  if (state === "tn") {
    return { reason: lists.tnStatus === 403 ? "game-page-403" : "no-image-on-page" };
  }
  if (state === "ia") return { reason: "no-image-on-page" };
  if (state === "ky") {
    const pageUrl = lists.ky.get(number);
    if (!pageUrl) return { reason: "no-game-page" };
    const page = await httpText(pageUrl);
    if (page.status !== 200) return { reason: `game-page-${page.status}` };
    const chosen = bestUrl(imageUrls(page.text, pageUrl), number);
    if (!chosen) return { reason: "no-image-on-page" };
    const hit = await firstImage([chosen]);
    return hit ? { body: hit.body } : { reason: "not-image" };
  }
  if (state === "id") {
    const featured = lists.id.get(number);
    if (!featured) return { reason: "no-game-page" };
    const thumb = featured.replace("_featured", "_thumbnail");
    const hit = await firstImage([featured, thumb]);
    return hit ? { body: hit.body } : { reason: "image-not-found" };
  }
  if (state === "mi" || state === "ok") {
    const pageUrl = (state === "mi" ? lists.mi : lists.ok).get(number);
    if (pageUrl) {
      const page = await httpText(pageUrl);
      if (page.status === 200) {
        const chosen = bestUrl(imageUrls(page.text, pageUrl), number);
        if (chosen) {
          const hit = await firstImage([chosen]);
          if (hit) return { body: hit.body };
        }
      }
    }
    if (state === "ok") {
      const tile = lists.okTiles.get(number);
      if (tile) {
        const hit = await firstImage([tile]);
        if (hit) return { body: hit.body };
      }
    }
    return { reason: pageUrl ? "no-image-on-page" : "no-game-page" };
  }
  if (state === "oh") {
    if (lists.oh === "no-public-token" || lists.oh === "api-denied") return { reason: lists.oh };
    const graphic = lists.oh.get(number);
    if (!graphic) return { reason: "no-game-page" };
    const hit = await firstImage([graphic]);
    return hit ? { body: hit.body } : { reason: "not-image" };
  }
  return { reason: "no-pattern" };
}

async function measure(body: Buffer): Promise<TicketFaceRecord | null> {
  try {
    const meta = await sharp(body).rotate().metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (width < 40 || height < 40) return null;
    const aspect = Math.round((width / height) * 1000) / 1000;
    const orientation = aspect < 0.92 ? "portrait" : aspect > 1.08 ? "landscape" : "square";
    const sampled = await sharp(body)
      .rotate()
      .resize({ width: 128, kernel: "nearest", withoutEnlargement: true })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const palette = paletteFromRgba(sampled.data, sampled.info.width, sampled.info.height);
    return { ...palette, aspect, orientation };
  } catch {
    return null;
  }
}

async function loadGames(): Promise<GameRef[]> {
  const seen = new Set<string>();
  const games: GameRef[] = [];
  const add = (state: string, number: number, price: number) => {
    if (!DESK_PRICES.has(price) || !Number.isFinite(number)) return;
    const key = `${state}:${number}`;
    if (seen.has(key)) return;
    seen.add(key);
    games.push({ state, number });
  };
  for (const state of PUBLIC_STATES) {
    const raw = JSON.parse(
      await readFile(join(root, `src/data/states/last-good/${state}.json`), "utf8"),
    ) as {
      catalog?: Array<{ number: number; price: number }>;
    };
    for (const row of raw.catalog ?? []) add(state, row.number, row.price);
  }
  const missing = await import("../src/data/tn-missing.ts");
  for (const row of missing.TN_MISSING_GAMES) add("tn", row.number, row.price);
  return games;
}

async function pool<T>(items: T[], size: number, fn: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await fn(items[index]!);
    }
  }
  await Promise.all(Array.from({ length: size }, () => worker()));
}

async function main() {
  const games = await loadGames();
  console.error(`[faces] ${games.length} desk games`);
  const tn = await httpText("https://tnlottery.com/games/instant-games/");
  const ia = await httpText("https://www.ialottery.com/Pages/Games/Games_main.aspx");
  const [ky, id, mi, okPair, oh] = await Promise.all([mapKy(), mapId(), mapMi(), mapOk(), mapOh()]);
  console.error(
    `[faces] indexes ky=${ky.size} id=${id.size} mi=${mi.size} okPages=${okPair.pages.size} okTiles=${okPair.tiles.size} oh=${typeof oh === "string" ? oh : oh.size} tn=${tn.status} ia=${ia.status}`,
  );
  const lists = { ky, id, mi, ok: okPair.pages, okTiles: okPair.tiles, oh, tnStatus: tn.status };
  const faces: Record<string, TicketFaceRecord> = {};
  const failed = new Map<string, Fail[]>();
  for (const state of PUBLIC_STATES) failed.set(state, []);

  const byState = new Map<string, GameRef[]>();
  for (const game of games) {
    const rows = byState.get(game.state) ?? [];
    rows.push(game);
    byState.set(game.state, rows);
  }

  for (const state of PUBLIC_STATES) {
    const rows = byState.get(state) ?? [];
    let done = 0;
    await pool(
      rows,
      state === "sc" || state === "nc" || state === "pa" || state === "tx" || state === "mo"
        ? 6
        : 4,
      async (game) => {
        try {
          const resolved = await resolveUrl(state, game.number, lists);
          if ("reason" in resolved) {
            failed.get(state)?.push({ number: game.number, reason: resolved.reason });
          } else {
            const record = await measure(resolved.body);
            if (!record) failed.get(state)?.push({ number: game.number, reason: "decode-failed" });
            else faces[`${state}:${game.number}`] = record;
          }
        } catch {
          failed.get(state)?.push({ number: game.number, reason: "fetch-error" });
        }
        done += 1;
        if (done % 20 === 0 || done === rows.length)
          console.error(`[faces] ${state} ${done}/${rows.length}`);
      },
    );
  }

  const ordered = Object.fromEntries(Object.entries(faces).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(FACE_PATH, `${JSON.stringify(ordered, null, 2)}\n`);

  const coverage: Record<
    string,
    { desk: number; resolved: number; failed: number; reasons: Record<string, number> }
  > = {};
  for (const state of PUBLIC_STATES) {
    const desk = (byState.get(state) ?? []).length;
    const misses = failed.get(state) ?? [];
    const reasons: Record<string, number> = {};
    for (const miss of misses) reasons[miss.reason] = (reasons[miss.reason] ?? 0) + 1;
    coverage[state] = { desk, resolved: desk - misses.length, failed: misses.length, reasons };
  }
  await writeFile(
    COVERAGE_PATH,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), states: coverage }, null, 2)}\n`,
  );
  console.log(JSON.stringify(coverage, null, 2));
}

await main();
