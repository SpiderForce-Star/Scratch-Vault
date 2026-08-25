import assert from "node:assert/strict";
import test from "node:test";
import {
  ANNUAL_PRICE_USD,
  BILLING_RULES,
  MONTHLY_PRICE_USD,
  TRIAL_PERIOD_DAYS,
} from "../src/lib/billing-policy.ts";

test("monthly is a card-backed 7-day trial then $4.99 with no refunds", () => {
  assert.equal(TRIAL_PERIOD_DAYS, 7);
  assert.equal(MONTHLY_PRICE_USD, 4.99);
  assert.equal(BILLING_RULES.monthly.trialDays, 7);
  assert.equal(BILLING_RULES.monthly.refunds, false);
  assert.equal(BILLING_RULES.monthly.cardRequired, true);
  assert.equal(BILLING_RULES.monthly.profileRequired, true);
});

test("annual is $49.99 billed now, keeps the year, auto-renews, no refunds", () => {
  assert.equal(ANNUAL_PRICE_USD, 49.99);
  assert.equal(BILLING_RULES.annual.trialDays, 0);
  assert.equal(BILLING_RULES.annual.refunds, false);
  assert.equal(BILLING_RULES.annual.autoRenew, true);
  assert.equal(BILLING_RULES.annual.keepAccessUntilPeriodEnd, true);
});
