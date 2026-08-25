-- Subscription status for Stripe Billing
-- Linked to Better Auth user table.

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "stripeCustomerId" text,
  ADD COLUMN IF NOT EXISTS "subscriptionStatus" text,
  ADD COLUMN IF NOT EXISTS "subscriptionPriceId" text,
  ADD COLUMN IF NOT EXISTS "subscriptionId" text,
  ADD COLUMN IF NOT EXISTS "currentPeriodEnd" timestamptz;

CREATE INDEX IF NOT EXISTS "user_stripeCustomerId_idx" ON "user" ("stripeCustomerId");
