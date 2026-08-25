# Scratch Vault — lottery desk legal review

Reviewed **August 25, 2026**. This is a product compliance memo for Webb
Spinner Visions, **not legal advice**. Have counsel confirm before a dispute,
a store listing, or a new state.

## What the product is

Scratch Vault ranks publicly posted remaining-prize counts for instant
(scratch-off) games. It does **not** sell tickets, take wagers, pay prizes,
or run a lottery. Similar remaining-prize sites exist in the United States;
the legal footing is “public facts + nominative identification,” not lottery
operation.

## Rules that apply in every listed state

1. **No ticket sales.** Each listed lottery is a state monopoly. The site and
   native apps must never buy, courier, print, or redeem tickets. Texas in
   particular banned lottery couriers in 2025 (TLC policy Feb 24, 2025;
   SB 3070 signed June 20, 2025 — Class A misdemeanor to sell or buy tickets
   online or by mobile app, including facilitation).
2. **No affiliation.** Do not use official logos, wordmarks, or ticket scans.
   Game names identify publicly offered games only.
3. **Public remaining counts are facts.** Rankings compile numbers the lottery
   already publishes. They are not live store inventory.
4. **No “system to win.”** Printed odds do not change. Remaining counts do not
   improve the odds of any individual ticket. Copy must keep saying so.
5. **Age.** App use is 18+. Ticket purchase / redeem: **21+ Arizona**,
   **21+ Iowa (Iowa Code § 99G.30)**, **18+** in TN KY SC OK MI NC PA TX MO
   OH IL MA ID CT.
6. **Responsible play.** 1-800-GAMBLER plus the state helpline when it differs.
7. **Subscriptions.** ROSCA still requires (a) clear material terms before
   collecting a card, (b) express consent, (c) a simple same-medium cancel.
   Illinois 815 ILCS 601 also requires a 30–60 day notice before a 12-month
   plan auto-renews for more than one month, and online-only cancel when the
   customer signed up online (601(b-5)). The FTC’s 2024 “Click to Cancel”
   Negative Option Rule was vacated by the Eighth Circuit in July 2025;
   ROSCA and the FTC Act still govern. A subscriber may live in a state that
   is not one of the 16 lottery desks (California ARL, New York GBL § 527,
   etc.); cancel remains one click on /account from every state. “No refunds”
   is disclosed; opt-out still stops the *next* charge. Apple / Google IAP
   refund rules still apply in the native apps.

## Billing rules shipped with this review

| Plan | Charge | Trial | Card + profile | Refunds | If they opt out |
|---|---|---|---|---|---|
| Monthly | $4.99 / month | 7 days | Required | None | Future months stop; unused trial is not billed |
| Annual | $49.99 / year, billed now | None | Required | None | They keep the paid year; next year is not billed |

Opt-out is a one-click control on `/account`.

## State desk notes

See `src/lib/state-legal.ts` and the public page `/legal`. Highlights:

| State | Age | Holdback / data quirk | Extra watch-item |
|---|---|---|---|
| TN | 18 | Play It Again: posted “1 left” treated as no retail jackpot | Not TELC |
| KY | 18 | Cash option vs annuity | — |
| SC | 18 | Estimated unclaimed | — |
| OK | 18 | M–F 8:00 a.m. updates | — |
| MI | 18 | Unclaimed may include unsold | School Aid Fund |
| AZ | **21** | Top prizes remaining; mids only when published | No internet ticket sales |
| NC | 18 | Remaining column | — |
| PA | 18 | Top six prizes only | — |
| TX | 18 | Printed − claimed | SB 3070: no online ticket sales / no courier |
| MO | 18 | Unclaimed → remaining | — |
| OH | 18 | Daily ~6:00 a.m. unclaimed | — |
| IL | 18 | Fail closed if unpaid table missing | Auto-renewal notice |
| MA | 18 | Fail closed if table missing | Lottery site ToS: facts only, no artwork |
| IA | **21** | Official table is $50+ remaining | Iowa Code § 99G.30 |
| ID | 18 | Remaining column | — |
| CT | 18 | Unclaimed prizes | Conn. Gen. Stat. ch. 229a |

## Still for counsel

- Confirm Massachusetts remaining-prize facts vs. the Lottery website’s
  “personal, non-commercial use” clause if a takedown ever arrives.
- Confirm Stripe Customer Portal + upcoming-invoice email satisfies Illinois
  30–60 day annual renewal notice, or add a first-party reminder.
- Confirm California ARL (Bus. & Prof. Code § 17600) and New York GBL § 527
  if you sell Full Access to residents of those states (desks are 16 states;
  customers can live anywhere).
- Native IAP “no refunds” cannot override Apple / Google policy.
- FTC Click-to-Cancel rule remains vacated (8th Cir. July 2025); ROSCA
  enforcement continues. Watch the 2026 Negative Option ANPRM.
