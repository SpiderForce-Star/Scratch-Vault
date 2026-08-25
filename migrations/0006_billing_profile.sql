-- Customer profile required before a card-backed trial or annual charge.
-- Legal name, DOB, home state, and billing-consent timestamps live on "user".

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "profileLegalName" text,
  ADD COLUMN IF NOT EXISTS "profileDob" date,
  ADD COLUMN IF NOT EXISTS "profileHomeState" text,
  ADD COLUMN IF NOT EXISTS "profileAgeAttestedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "profileTermsAcceptedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "profileNoRefundsAcceptedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "profileBillingConsentAt" timestamptz;
