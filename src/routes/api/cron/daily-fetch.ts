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
  const auth = request.headers.get("authorization") || "";
  if (secret && auth === `Bearer ${secret}`) return true;
  if (request.headers.get("x-vercel-cron") === "1") return true;
  return false;
}

async function run(request: Request) {
  const production =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  if (!cronAuthorized(request) && production) {
    return new Response("Unauthorized", {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const { fetchAllStates } = await import("@/data/states/fetch.server");
  const report = await fetchAllStates();
  console.info("[remaining] daily-fetch", {
    ranAt: report.ranAt,
    ok: report.results.filter((row) => row.ok).length,
    failed: report.results.filter((row) => !row.ok).length,
  });
  return json(report);
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
