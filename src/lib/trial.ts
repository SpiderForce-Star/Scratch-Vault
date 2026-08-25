/**
 * Web Checkout trial — monthly only.
 * Stripe Price intro offers in the Dashboard should match this length for
 * the monthly Price; `subscription_data.trial_period_days` is the source of
 * truth on each monthly Checkout session. Annual has no trial.
 *
 * Card + completed profile + billing details are required up front
 * (`payment_method_collection: always`). No card, no trial.
 */
export {
  TRIAL_PERIOD_DAYS,
  TRIAL_LABEL,
  TRIAL_CTA,
  TRIAL_LENGTH_COPY,
  ANNUAL_CTA,
  MONTHLY_PRICE_USD,
  ANNUAL_PRICE_USD,
  NO_REFUNDS_LINE,
} from "./billing-policy";
