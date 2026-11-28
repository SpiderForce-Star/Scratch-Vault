import { createFileRoute } from "@tanstack/react-router";

const METHOD_NOT_ALLOWED = () =>
  new Response("Method Not Allowed", {
    status: 405,
    headers: { Allow: "GET, POST", "Cache-Control": "no-store" },
  });

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

async function run(request: Request) {
  const production =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  if (!cronAuthorized(request)) {
    if (production || process.env.CRON_SECRET?.trim()) {
      return new Response("Unauthorized", {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      });
    }
  }
  const url = new URL(request.url);
  const rawSlot = url.searchParams.get("slot");
  const slot = rawSlot && /^\d{4}$/.test(rawSlot) ? rawSlot : null;
  if (rawSlot && !slot) return json({ error: "bad slot" }, 400);

  const { STATE_IDS } = await import("@/config/states");
  const { dueVercelStates } = await import("@/config/refresh-schedule");
  const { fetchAllStates } = await import("@/data/states/fetch.server");
  const { overdueExternalDesks } = await import("@/data/states/overdue.server");
  const due = dueVercelStates(STATE_IDS, slot);
  const report = await fetchAllStates(due);
  // External (non-Vercel) desks: page when their last good pull is past its cadence.
  const overdue = await overdueExternalDesks();
  if (overdue.length) {
    console.error("[remaining] external desks overdue", overdue);
  }
  console.info("[remaining] daily-fetch", {
    ranAt: report.ranAt,
    slot,
    states: due,
    ok: report.results.filter((row) => row.ok).length,
    failed: report.results.filter((row) => !row.ok).length,
    overdue: overdue.map((row) => row.stateId),
  });
  return json({ ...report, slot, overdue });
}

export const Route = createFileRoute("/api/cron/daily-fetch")({
  server: {
    handlers: {
      GET: ({ request }) => run(request),
      POST: ({ request }) => run(request),
      HEAD: METHOD_NOT_ALLOWED,
    },
  },
});
