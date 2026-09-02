import { createFileRoute } from "@tanstack/react-router";
import { publicAuthStatus, resolveAuthBackend } from "@/lib/auth/backend";
import { auth } from "@/lib/auth/server";

const AUTH_UNAVAILABLE = {
  error: {
    message: "Sign-in is temporarily unavailable.",
    code: "AUTH_UNAVAILABLE",
  },
};

function isStatusPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  return path.endsWith("/api/auth/status") || path.endsWith("/auth/status");
}

function handleAuth(request: Request): Response | Promise<Response> {
  const url = new URL(request.url);
  if (isStatusPath(url.pathname)) {
    return Response.json(publicAuthStatus(), {
      headers: { "Cache-Control": "no-store" },
    });
  }
  const backend = resolveAuthBackend();
  if (!backend.persistable && request.method !== "GET" && request.method !== "HEAD") {
    return Response.json(AUTH_UNAVAILABLE, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
  return auth.handler(request);
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => handleAuth(request),
      POST: ({ request }) => handleAuth(request),
    },
  },
});
