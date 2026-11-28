/**
 * POST /api/ingest/remaining
 *
 * Authenticated drop-box for official remaining-prize tables that Vercel cannot
 * pull itself (Tennessee: Cloudflare 403 from Vercel/AWS). An outside job sends
 * either the official HTML table (parsed here with the same parser the cron
 * uses) or already-parsed rows; both go through storeParsedRemaining, so the
 * same trust checks apply. Lottery HTML is parsed in memory and not stored.
 *
 * Auth: Authorization: Bearer $REMAINING_INGEST_SECRET (separate from CRON_SECRET).
 */
import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

const MAX_BODY_BYTES = 3_000_000;

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function ingestAuthorized(header: string | null, secret: string | undefined): boolean {
  const want = secret?.trim();
  if (!want || want.length < 24) return false;
  const got = (header || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

const Prize = z.object({
  amount: z.number().positive().max(100_000_000),
  remaining: z.number().int().min(0).max(100_000_000).nullable(),
});
const Parsed = z.object({
  number: z.number().int().positive().max(99_999),
  name: z.string().min(1).max(120),
  price: z.number().min(0).max(100),
  prizes: z.array(Prize).min(1).max(40),
  odds: z.number().positive().nullable().optional(),
});

export const IngestBody = z
  .object({
    stateId: z.string().regex(/^[a-z]{2}$/),
    sourceUrl: z.string().url().startsWith("https://"),
    /** Source's own as-of date (ISO). Optional; extracted from html when omitted. */
    asOf: z.string().datetime({ offset: true }).optional(),
    /** Official page HTML (or just its <table>) — parsed server-side. */
    html: z.string().min(1).max(MAX_BODY_BYTES).optional(),
    /** Already-parsed rows, same shape as ParsedGame. */
    games: z.array(Parsed).min(1).max(600).optional(),
  })
  .refine((b) => Boolean(b.html) !== Boolean(b.games), {
    message: "send exactly one of html or games",
  });

async function handle(request: Request) {
  if (!ingestAuthorized(request.headers.get("authorization"), process.env.REMAINING_INGEST_SECRET)) {
    return new Response("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const len = Number(request.headers.get("content-length") || 0);
  if (len > MAX_BODY_BYTES * 1.2) return json({ error: "too large" }, 413);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "bad json" }, 400);
  }
  const parsedBody = IngestBody.safeParse(raw);
  if (!parsedBody.success) {
    return json({ error: "invalid", issues: parsedBody.error.issues.slice(0, 5) }, 400);
  }
  const input = parsedBody.data;

  const { STATES, STATE_IDS } = await import("@/config/states");
  const { REFRESH_SCHEDULE } = await import("@/config/refresh-schedule");
  const stateId = input.stateId as (typeof STATE_IDS)[number];
  if (!STATE_IDS.includes(stateId)) return json({ error: "unknown state" }, 400);
  if (REFRESH_SCHEDULE[stateId].runner !== "external") {
    return json({ error: "state is pulled by the Vercel cron, not external ingest" }, 409);
  }
  // Only accept the state's own official host.
  const official = STATES[stateId].remainingPrizesUrl;
  if (official && new URL(official).hostname !== new URL(input.sourceUrl).hostname) {
    return json({ error: "sourceUrl is not the official host" }, 400);
  }

  const { extractAsOf, parseOfficialRemaining } = await import("@/data/states/parse.server");
  const { storeParsedRemaining } = await import("@/data/states/ingest.server");
  const games = input.games ?? parseOfficialRemaining(stateId, input.html!, "text/html");
  const asOf = input.asOf ?? (input.html ? extractAsOf(input.html) : null);

  const result = await storeParsedRemaining(stateId, games, {
    sourceUrl: input.sourceUrl,
    asOf,
    skipNewGames: true,
  });
  console.info("[remaining] ingest", stateId, result.ok, result.gameCount, result.reason);
  return json({ ...result, parsed: games.length, asOf }, result.ok ? 200 : 422);
}

const METHOD_NOT_ALLOWED = () =>
  new Response("Method Not Allowed", {
    status: 405,
    headers: { Allow: "POST", "Cache-Control": "no-store" },
  });

export const Route = createFileRoute("/api/ingest/remaining")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
      GET: METHOD_NOT_ALLOWED,
    },
  },
});
