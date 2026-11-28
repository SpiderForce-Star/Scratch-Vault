# Scratch Vault

Independent remaining-prize desk for scratch-off games.

**Not affiliated with, endorsed by, or connected to any state lottery.**

Advancement repo: [SpiderForce-Star/Scratch-Vault](https://github.com/SpiderForce-Star/Scratch-Vault).
State lottery notices: [`LEGAL.md`](LEGAL.md) and `/legal`.

Production is the existing Vercel project (`scratch-vault`) at [https://scratch-vault.com](https://scratch-vault.com), also aliased at [https://volunteer-scratch-vault.vercel.app](https://volunteer-scratch-vault.vercel.app). Do not create a new Vercel project.

## What it does

Scratch Vault ranks $5, $10, $20, $25, $30, and $50 instant games from public remaining-prize counts:

- **Grand heat** — jackpots still in retail after known holdbacks (Tennessee’s Play It Again rule treats a posted “1 left” as no retail jackpot)
- **Medium heat** — mid-tier remaining prizes, so you skip games that look fine on top and are drained in the middle
- **Bust / avoid** — no effective retail top, or a collapsed mid-tier
- **Cash-out games** — Frenzy-style tickets whose “top prize” is a medium cash prize

Printed overall odds are not used to rank tickets. The desk does **not** improve the odds of any individual ticket and does **not** “beat the lottery.”

### Multi-state desks

Public selector: **TN KY SC OK MI NC PA TX MO OH IA ID**.

Hidden until a trusted public catalog is promoted: **AZ, IL, MA, CT**. Those desks still have configs and the daily fetch still tries them. They are not in the selector.

| State | Desk | Holdback | Age |
|---|---|---|---|
| Tennessee (default) | Official remaining-prizes table, with the last good snapshot when the live pull fails | Play It Again (subtract 1 top prize) | 18+ |
| Kentucky, South Carolina, Oklahoma, Michigan, North Carolina, Pennsylvania, Texas, Missouri, Ohio, Idaho | Compiled official remaining-prize tables | None | 18+ |
| Iowa | Compiled official remaining-prize table | None | 21+ |
| Arizona, Illinois, Massachusetts, Connecticut | Hidden | None | AZ 21+; IL, MA, CT 18+ |

State configs live in [`src/config/states.ts`](src/config/states.ts). Catalogs load through [`src/data/states/`](src/data/states/). Daily remaining-prize fetch: `GET /api/cron/daily-fetch` at `15 11 * * *` (11:15 UTC, 5:15 AM CST / 6:15 AM CDT).

A daily list older than about 36 hours, or a weekly list older than 7 days plus that 36-hour buffer, shows an **as of** time and a stale banner. The header does not call that data current. The fetch itself runs once a day (`15 11 * * *`), not hourly. Failures on a public desk (including Tennessee) are logged at error level. Set `REMAINING_ALERT_WEBHOOK` to POST a JSON failure report, and optionally `REMAINING_ALERT_EMAIL` as the recipient named on that payload.

## Stack

React 19 · TypeScript · Vite · TanStack Start · Tailwind v4 · TanStack Query

## Native / stores

Capacitor 6 shells and the App Store / Play checklist live in
[`README-STORE.md`](README-STORE.md). Stripe checkout stays on the website.
Native IAP is the next slice.

```bash
npm install
npm run dev
```

```bash
npm run typecheck
npm run test
npm run build
```

## Data

Tennessee catalog: [`src/data/games.ts`](src/data/games.ts)  
State configs: [`src/config/states.ts`](src/config/states.ts)  
Heat / desk: [`src/lib/heat.ts`](src/lib/heat.ts), [`src/lib/heat.server.ts`](src/lib/heat.server.ts)

Tennessee source: [Tennessee Lottery remaining prizes](https://tnlottery.com/remaining-prizes/). Other desks use that state’s official remaining-prize page. Counts are compiled snapshots, not live store inventory. Iowa’s official table lists remaining prizes of $50 and greater.

Ticket faces are independent reconstructions for store identification. They are not official Lottery scans.

## Stripe

Checkout uses the existing live Price IDs. In the Stripe Dashboard:

- Monthly Price: 7-day introductory trial, then **$4.99 / month**. Card required. No refunds.
- Annual Price: **no trial**. Charge **$49.99** immediately. Auto-renews yearly. No refunds. Customers keep the paid year if they opt out of renewal.
- Product names: **Scratch Vault Full Access**
- Hosted TOS URL must be set so Checkout `consent_collection.terms_of_service = required` works
- Customer Portal: allow cancel-at-period-end (the in-app Account opt-out uses the API directly)
- Upcoming invoice emails should stay on for Illinois 30–60 day annual renewal notice

Webhook URL: `https://scratch-vault.com/api/stripe/webhook`.

Public billing rules: [`src/lib/billing-policy.ts`](src/lib/billing-policy.ts). State lottery notices: [`src/lib/state-legal.ts`](src/lib/state-legal.ts), [`LEGAL.md`](LEGAL.md), `/legal`.

## Disclaimer

Informational only. Remaining counts change as tickets sell. This tool does not improve the odds of winning any prize. Play only if you are 18 or older. Arizona and Iowa lottery tickets are 21+. If gambling is a problem, call or text [1-800-GAMBLER](tel:18005224700).

Webb Spinner Visions
