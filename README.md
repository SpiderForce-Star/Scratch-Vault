# Scratch Vault

Independent remaining-prize desk for scratch-off games.

**Not affiliated with, endorsed by, or connected to any state lottery.**

Advancement repo: [SpiderForce-Star/Scratch-Vault](https://github.com/SpiderForce-Star/Scratch-Vault).
State lottery notices: [`LEGAL.md`](LEGAL.md) and `/legal`.

Production is the existing Vercel project at [https://volunteer-scratch-vault.vercel.app](https://volunteer-scratch-vault.vercel.app), built from [SpiderForce-Star/Scratch-Vault](https://github.com/SpiderForce-Star/Scratch-Vault). Do not create a new Vercel project.

## What it does

Scratch Vault ranks $5, $10, $20, $25, $30, and $50 instant games from public remaining-prize counts:

- **Grand heat** — jackpots still in retail after known holdbacks (Tennessee’s Play It Again rule treats a posted “1 left” as no retail jackpot)
- **Medium heat** — mid-tier remaining prizes, so you skip games that look fine on top and are drained in the middle
- **Bust / avoid** — no effective retail top, or a collapsed mid-tier
- **Cash-out games** — Frenzy-style tickets whose “top prize” is a medium cash prize

Printed overall odds are not used to rank tickets. The desk does **not** improve the odds of any individual ticket and does **not** “beat the lottery.”

### Multi-state desks

Selector order: **TN KY SC OK MI AZ NC PA TX MO OH IL MA IA ID CT**.

| State | Desk | Holdback | Age |
|---|---|---|---|
| Tennessee (default) | Live overlay | Play It Again (subtract 1 top prize) | 18+ |
| Kentucky, South Carolina, Oklahoma, Michigan, North Carolina, Pennsylvania, Texas, Missouri, Ohio, Illinois, Massachusetts, Idaho, Connecticut | Compiled official remaining-prize tables | None | 18+ |
| Arizona, Iowa | Compiled official remaining-prize tables (AZ is top-prize heavy) | None | 21+ |

State configs live in [`src/config/states.ts`](src/config/states.ts). Catalogs load through [`src/data/states/`](src/data/states/). Daily remaining-prize fetch: `GET /api/cron/daily-fetch` at `15 11 * * *` (06:15 CT).

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

Tennessee source: [Tennessee Lottery scratch-offs](https://www.tnlottery.com/games/scratch-offs). Other desks use that state’s official remaining-prize page. Counts are compiled snapshots, not live store inventory. Iowa’s official table lists remaining prizes of $50 and greater.

Ticket faces are independent reconstructions for store identification. They are not official Lottery scans.

## Stripe

Checkout uses the existing live Price IDs. In the Stripe Dashboard:

- Monthly Price: 7-day introductory trial, then **$4.99 / month**. Card required. No refunds.
- Annual Price: **no trial**. Charge **$49.99** immediately. Auto-renews yearly. No refunds. Customers keep the paid year if they opt out of renewal.
- Product names: **Scratch Vault Full Access**
- Hosted TOS URL must be set so Checkout `consent_collection.terms_of_service = required` works
- Customer Portal: allow cancel-at-period-end (the in-app Account opt-out uses the API directly)
- Upcoming invoice emails should stay on for Illinois 30–60 day annual renewal notice

Webhook URL (until the new site is cut over): `https://volunteer-scratch-vault.vercel.app/api/stripe/webhook`.

Public billing rules: [`src/lib/billing-policy.ts`](src/lib/billing-policy.ts). State lottery notices: [`src/lib/state-legal.ts`](src/lib/state-legal.ts), [`LEGAL.md`](LEGAL.md), `/legal`.

## Disclaimer

Informational only. Remaining counts change as tickets sell. This tool does not improve the odds of winning any prize. Play only if you are 18 or older. Arizona and Iowa lottery tickets are 21+. If gambling is a problem, call or text [1-800-GAMBLER](tel:18005224700).

Webb Spinner Visions
