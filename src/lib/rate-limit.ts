/**
 * In-memory sliding window. Fine for one serverless instance;
 * stops casual checkout/webhook hammering without a provisioned store.
 */

const hits = new Map<string, number[]>();

export function rateLimitAllowed(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((stamp) => now - stamp < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export function requestIp(request: Request | null | undefined): string {
  if (!request) return "unknown";
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function tooManyRequests(message = "Too many requests"): Response {
  return new Response(message, {
    status: 429,
    headers: {
      "Cache-Control": "no-store",
      "Retry-After": "60",
    },
  });
}
