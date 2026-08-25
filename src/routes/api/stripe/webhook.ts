import { createFileRoute } from "@tanstack/react-router";
import { handleStripeEvent } from "@/lib/billing";
import { getStripe } from "@/lib/stripe.server";
import { logStripe } from "@/lib/stripe-errors";

const METHOD_NOT_ALLOWED = () =>
  new Response("Method Not Allowed", {
    status: 405,
    headers: { Allow: "POST", "Cache-Control": "no-store" },
  });

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      GET: METHOD_NOT_ALLOWED,
      HEAD: METHOD_NOT_ALLOWED,
      POST: async ({ request }) => {
        try {
          const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
          if (!secret) {
            console.error("[stripe] STRIPE_WEBHOOK_SECRET is not set");
            return new Response("Webhook secret is not configured", { status: 500 });
          }

          const signature = request.headers.get("stripe-signature");
          if (!signature) {
            return new Response("Missing stripe-signature", { status: 400 });
          }

          const rawBody = await request.text();
          let event;
          try {
            event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
          } catch (err) {
            logStripe("webhook.signature", err);
            return new Response("Invalid signature", { status: 400 });
          }

          const obj = event.data?.object;
          if (!event.type || !obj || typeof obj !== "object") {
            return new Response("Malformed event", { status: 400 });
          }

          const { claimStripeEvent, releaseStripeEvent } = await import(
            "@/lib/subscription.server"
          );

          let claimed = false;
          try {
            claimed = await claimStripeEvent(event.id, event.type);
            if (!claimed) {
              console.info("[stripe] duplicate webhook skipped", event.id, event.type);
              return json({ received: true, duplicate: true });
            }
            const result = await handleStripeEvent({
              id: event.id,
              type: event.type,
              data: { object: obj as unknown as Record<string, unknown> },
            });
            console.info("[stripe] webhook processed", event.id, event.type, result);
            return json({ received: true, result });
          } catch (err) {
            if (claimed) {
              await releaseStripeEvent(event.id).catch((releaseErr) => {
                console.error("[stripe] failed to release event claim", releaseErr);
              });
            }
            logStripe("webhook.handler", err, { id: event.id, type: event.type });
            return new Response("Webhook handler failed", { status: 500 });
          }
        } catch (err) {
          logStripe("webhook.crash", err);
          return new Response("Webhook handler failed", { status: 500 });
        }
      },
    },
  },
});
