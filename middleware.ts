/**
 * Vercel Edge Middleware. Never reads or buffers the request body.
 * Security headers (CSP, HSTS, X-Frame-Options, etc.) stay in vercel.json only.
 */

const ALLOWED_HOSTS = new Set([
  "scratch-vault.com",
  "www.scratch-vault.com",
  "volunteer-scratch-vault.vercel.app",
  "scratch-vault.vercel.app",
]);

function hostname(request: Request): string {
  const raw = request.headers.get("host") ?? new URL(request.url).host;
  return raw.split(",")[0].trim().split(":")[0].toLowerCase();
}

export function isAllowedHost(host: string): boolean {
  if (!host) return false;
  if (ALLOWED_HOSTS.has(host)) return true;
  return host.endsWith(".vercel.app");
}

function excludedPath(pathname: string): boolean {
  return (
    pathname === "/api/stripe/webhook" ||
    pathname.startsWith("/api/stripe/webhook/") ||
    pathname === "/api/cron/daily-fetch" ||
    pathname.startsWith("/api/cron/daily-fetch/") ||
    pathname === "/api/auth" ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/__grok" ||
    pathname.startsWith("/__grok/")
  );
}

export function edgeResponse(
  method: string,
  url: string,
  host: string,
): Response | undefined {
  const pathname = new URL(url).pathname;
  if (excludedPath(pathname)) return;

  const verb = method.toUpperCase();
  if (verb === "TRACE" || verb === "TRACK") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: {
        Allow: "GET, POST, HEAD, PUT, PATCH, DELETE, OPTIONS",
        "Cache-Control": "no-store",
      },
    });
  }

  if (!isAllowedHost(host)) {
    return new Response("Misdirected Request", {
      status: 421,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

export default function middleware(request: Request): Response | undefined {
  return edgeResponse(request.method, request.url, hostname(request));
}

export const config = {
  matcher: [
    "/((?!api/stripe/webhook(?:/|$)|api/cron/daily-fetch(?:/|$)|api/auth(?:/|$)|__grok(?:/|$)).*)",
  ],
};
