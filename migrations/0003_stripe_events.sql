-- Idempotent Stripe webhook deliveries.
-- Event IDs are unique per Stripe event; retries must not re-apply side effects.

CREATE TABLE IF NOT EXISTS stripe_event (
  id text PRIMARY KEY,
  type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS stripe_event_processed_at_idx ON stripe_event (processed_at);
