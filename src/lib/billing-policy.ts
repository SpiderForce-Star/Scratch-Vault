/**
 * Published billing rules. Single source of truth for copy and checkout.
 *
 * Monthly: card + completed profile required. 7-day free trial. If the
 * customer does not opt out in their profile before the trial ends, the
 * first month is billed at $4.99 and renews monthly until they opt out.
 *
 * Annual: $49.99 charged up front for 12 months. No trial. The customer
 * keeps that year even if they later opt out of renewal. No refunds.
 * Unless they opt out in their profile, Stripe auto-renews another year.
 *
 * ROSCA: material terms are disclosed before billing info is collected,
 * consent is captured on the profile, and cancellation is one click on
 * /account (same medium as signup).
 */
export const MONTHLY_PRICE_USD = 4.99;
export const ANNUAL_PRICE_USD = 49.99;
export const TRIAL_PERIOD_DAYS = 7;

export const TRIAL_LABEL = "7-day free trial";
export const TRIAL_CTA = "Start 7-day free trial";
export const TRIAL_LENGTH_COPY = "7-day free trial";
export const ANNUAL_CTA = "Pay $49.99 for 12 months";

export const MONTHLY_PRICE_LABEL = "$4.99/month";
export const ANNUAL_PRICE_LABEL = "$49.99/year";

export const NO_REFUNDS_LINE =
  "All fees are non-refundable. Opting out stops future charges only.";

export const NO_REFUNDS_ACCOUNT = `${NO_REFUNDS_LINE} Annual: you keep the year already paid. No refunds.`;

export const BILLING_RULES = {
  monthly: {
    plan: "monthly" as const,
    amountUsd: MONTHLY_PRICE_USD,
    interval: "month" as const,
    trialDays: TRIAL_PERIOD_DAYS,
    cardRequired: true,
    profileRequired: true,
    refunds: false,
    autoRenew: true,
    keepAccessUntilPeriodEnd: true,
  },
  annual: {
    plan: "annual" as const,
    amountUsd: ANNUAL_PRICE_USD,
    interval: "year" as const,
    trialDays: 0,
    cardRequired: true,
    profileRequired: true,
    refunds: false,
    autoRenew: true,
    keepAccessUntilPeriodEnd: true,
  },
} as const;

export const CHECKOUT_CONSENT_MESSAGE =
  "No refunds. Monthly: $4.99 is billed when the 7-day trial ends unless you opt out in your profile. Annual: $49.99 is billed now for 12 months, then auto-renews unless you opt out. Opting out stops the next charge only — you keep the period already paid.";

export const PROFILE_REQUIRED_MESSAGE =
  "Complete your profile (legal name, date of birth, home state, and billing consent) and add a credit or debit card to start.";
