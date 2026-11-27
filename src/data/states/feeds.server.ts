/**
 * Official remaining-prize pulls that are not a single HTML table.
 * Server-only. Does not store lottery HTML.
 */
import type { StateId } from "@/config/states";
import { listOkScratchers, parseOkGamePage, type ParsedGame } from "./parse.server";

const FETCH_MS = 20_000;
const GAME_MS = 12_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const TN_REMAINING = "https://tnlottery.com/remaining-prizes/";
const MI_REMAINING = "https://www.michiganlottery.com/prizes-remaining";
const CT_CATALOG = "https://ctlottery.com/games/scratch-games";
const MA_API = "https://www.masslottery.com/api/v1/instant-game-prizes/special";
const OH_APP = "https://www.ohiolottery.com/dist/js/app.js";
const OH_LOGIN = "https://authapi-solutions.ohiolottery.com/1.0/Authentication/Login";
const OH_PRIZES =
  "https://api-solutions.ohiolottery.com/1.0/Games/ScratchOffs/ScratchOffGame/GetFullPrizesRemainingList";
const OK_INDEX = "https://oklottery.com/games/scratchers";

export type OfficialPull = {
  url: string;
  status: number;
  type: string;
  body: string;
};

export async function fetchText(url: string, timeoutMs = FETCH_MS): Promise<OfficialPull> {
  const res = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/json,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
    },
  });
  const type = res.headers.get("content-type") || "";
  const body = await res.text();
  return { url: res.url || url, status: res.status, type, body };
}

function cloudflareChallenge(pull: OfficialPull): boolean {
  return pull.status === 403 || /<title>\s*Just a moment/i.test(pull.body.slice(0, 600));
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await fn(items[i]);
    }
  }
  const workers = Math.min(limit, items.length) || 1;
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return out;
}

async function pullOhio(): Promise<OfficialPull> {
  const bundle = await fetchText(OH_APP);
  const user = bundle.body.match(/VUE_APP_APIUSER:"([^"]+)"/)?.[1];
  const pass = bundle.body.match(/VUE_APP_APIPASS:"([^"]+)"/)?.[1];
  if (bundle.status >= 400 || !user || !pass) {
    return { url: OH_PRIZES, status: bundle.status || 502, type: "application/json", body: "" };
  }
  const login = await fetch(OH_LOGIN, {
    method: "POST",
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_MS),
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ userName: user, password: pass }),
  });
  const loginJson = (await login.json().catch(() => null)) as { data?: { token?: string } } | null;
  const token = loginJson?.data?.token;
  if (!login.ok || !token) {
    return { url: OH_PRIZES, status: login.status || 401, type: "application/json", body: "" };
  }
  const res = await fetch(OH_PRIZES, {
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_MS),
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  return {
    url: OH_PRIZES,
    status: res.status,
    type: res.headers.get("content-type") || "application/json",
    body: await res.text(),
  };
}

function okPayload(games: ParsedGame[]): string {
  return JSON.stringify({
    games: games.map((game) => ({
      Price: game.price,
      GameId: game.number,
      Name: game.name,
      OverallOdds: game.odds ?? null,
      Prizes: game.prizes.map((prize) => ({
        PrizeAmount: prize.amount,
        RemainingPrizes: prize.remaining,
      })),
    })),
  });
}

async function pullOklahoma(): Promise<OfficialPull> {
  const index = await fetchText(OK_INDEX);
  if (index.status >= 400) return index;
  const listed = listOkScratchers(index.body);
  if (!listed.length) {
    return { ...index, status: 200, body: "" };
  }
  const pages = await mapPool(listed, 6, async (game) => {
    try {
      const page = await fetchText(`${OK_INDEX}/${game.slug}`, GAME_MS);
      if (page.status >= 400) return null;
      return parseOkGamePage(page.body);
    } catch {
      return null;
    }
  });
  const games = pages.filter((game): game is ParsedGame => Boolean(game));
  if (!games.length) {
    return { url: OK_INDEX, status: 200, type: "application/json", body: "" };
  }
  return { url: OK_INDEX, status: 200, type: "application/json", body: okPayload(games) };
}

/**
 * One official body for a state. Page URL is the configured remaining-prizes
 * link; a few states publish the counts on a different official feed.
 */
export async function pullOfficial(stateId: StateId, pageUrl: string): Promise<OfficialPull> {
  if (stateId === "oh") return pullOhio();
  if (stateId === "ok") return pullOklahoma();
  if (stateId === "ma") return fetchText(MA_API);
  if (stateId === "mi") return fetchText(MI_REMAINING);
  if (stateId === "ct") return fetchText(CT_CATALOG);
  if (stateId === "tn") {
    const next = await fetchText(TN_REMAINING);
    if (!cloudflareChallenge(next) && next.status < 400 && next.body.trim()) return next;
    if (pageUrl && pageUrl !== TN_REMAINING && pageUrl !== next.url) {
      const older = await fetchText(pageUrl);
      if (!cloudflareChallenge(older) && older.status < 400 && older.body.trim()) return older;
    }
    return next.status === 403 || cloudflareChallenge(next)
      ? { ...next, status: 403 }
      : next;
  }
  if (!pageUrl) {
    return { url: "", status: 404, type: "", body: "" };
  }
  return fetchText(pageUrl);
}
