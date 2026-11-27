/**
 * Fetch failures on a public desk (including the default Tennessee desk)
 * are logged at error level. Optional alert delivery:
 * - REMAINING_ALERT_WEBHOOK: POST JSON { ranAt, email, failures }
 * - REMAINING_ALERT_EMAIL: included on that payload. With no webhook, the
 *   address is logged so a log drain can mail it. This process does not
 *   open an SMTP session.
 */
import type { StateId } from "@/config/states";
import { isAlertDesk } from "@/lib/desk-freshness";

export { isAlertDesk };

export type RemainingAlertRow = {
  stateId: StateId;
  ok: boolean;
  gameCount: number;
  reason: string;
};

export type RemainingAlertReport = {
  ranAt: string;
  results: RemainingAlertRow[];
};

export function alertFailures(report: RemainingAlertReport): RemainingAlertRow[] {
  return report.results.filter((row) => !row.ok && isAlertDesk(row.stateId));
}

export async function notifyRemainingFailures(report: RemainingAlertReport): Promise<void> {
  const failures = alertFailures(report);
  if (!failures.length) return;
  console.error("[remaining] public desk failures", {
    ranAt: report.ranAt,
    failures: failures.map((row) => ({
      stateId: row.stateId,
      reason: row.reason,
      gameCount: row.gameCount,
    })),
  });

  const webhook = process.env.REMAINING_ALERT_WEBHOOK?.trim();
  const email = process.env.REMAINING_ALERT_EMAIL?.trim() || null;
  if (!webhook && !email) return;

  const payload = { ranAt: report.ranAt, email, failures };
  if (!webhook) {
    console.error("[remaining] alert email has no webhook", email, failures.map((row) => row.stateId).join(","));
    return;
  }

  try {
    const res = await fetch(webhook, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.error("[remaining] alert webhook", res.status);
  } catch (err) {
    console.error(
      "[remaining] alert webhook failed",
      err instanceof Error ? err.message : "error",
    );
  }
}
