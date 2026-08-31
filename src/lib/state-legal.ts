/**
 * Compliance notes for every lottery desk Scratch Vault publishes.
 *
 * These are product-legal guardrails compiled from public lottery pages and
 * statutes as of August 2026. They are NOT legal advice. Webb Spinner Visions
 * should have counsel review before relying on them in a dispute.
 *
 * Common rules that apply in every listed state:
 * - Scratch Vault does not sell tickets, take wagers, or pay prizes.
 * - Remaining-prize counts are facts the lottery already publishes.
 * - Game names are used only to identify publicly offered games (nominative use).
 * - Official logos, wordmarks, and ticket artwork are not used.
 * - Rankings do not change printed odds and are not a “system to win.”
 * - Ticket faces in the app are independent reconstructions.
 */
import { STATE_IDS, type StateId } from "@/config/states";

export type StateLegalNote = {
  id: StateId;
  purchaseAge: 18 | 21;
  claimWindow: string;
  statuteHint: string;
  remainingSource: string;
  issues: readonly string[];
  helpline: { label: string; tel: string };
};

export const NATIONAL_HELPLINE = {
  label: "1-800-GAMBLER",
  tel: "18005224700",
} as const;

export const STATE_LEGAL: Record<StateId, StateLegalNote> = {
  tn: {
    id: "tn",
    purchaseAge: 18,
    claimWindow: "Typically 90 days after the announced game end date.",
    statuteHint: "Tennessee Education Lottery Corporation; Tenn. Code Ann. Title 4, Chapter 51.",
    remainingSource: "https://www.tnlottery.com/games/scratch-offs",
    issues: [
      "TELC is the exclusive lottery operator. This product is not TELC and must not look official.",
      "Play It Again typically holds one top prize per instant game. A posted “1 left” is treated as no retail jackpot — that is our reading of the public table, not a TELC ruling.",
      "Do not sell, courier, or redeem tickets. Prize payment is solely TELC’s.",
      "18+ to buy or redeem Tennessee Lottery tickets.",
    ],
    helpline: { label: "Tennessee REDLINE", tel: "18008899789" },
  },
  ky: {
    id: "ky",
    purchaseAge: 18,
    claimWindow: "Typically 180 days after the game end date.",
    statuteHint: "Kentucky Lottery Corporation.",
    remainingSource: "https://www.kylottery.com/apps/scratch_offs/prizes_remaining.html",
    issues: [
      "Not affiliated with the Kentucky Lottery Corporation.",
      "Some top prizes may be annuity or a smaller cash option. Rankings use the published cash amount when that is what the table shows.",
      "18+ to buy or redeem. No ticket sales on this site.",
    ],
    helpline: NATIONAL_HELPLINE,
  },
  sc: {
    id: "sc",
    purchaseAge: 18,
    claimWindow: "Typically 90 days after the official end of the game.",
    statuteHint: "South Carolina Education Lottery.",
    remainingSource: "https://www.sceducationlottery.com/Games/PrizesRemaining",
    issues: [
      "Not affiliated with the South Carolina Education Lottery.",
      "Published remaining counts are estimated unclaimed prizes, not store inventory.",
      "18+ to buy or redeem. No ticket sales on this site.",
    ],
    helpline: { label: "SC DAODAS gambling help", tel: "18774525155" },
  },
  ok: {
    id: "ok",
    purchaseAge: 18,
    claimWindow: "Ended-game prizes are typically claimable for 90 days after the announced end date.",
    statuteHint: "Oklahoma Lottery.",
    remainingSource: "https://www.lottery.ok.gov/scratchers/remaining-prizes",
    issues: [
      "Not affiliated with the Oklahoma Lottery.",
      "Official remaining prizes are typically updated Monday–Friday at 8:00 a.m. This desk is a snapshot, not a live feed.",
      "18+ to buy or redeem. No ticket sales on this site.",
    ],
    helpline: NATIONAL_HELPLINE,
  },
  mi: {
    id: "mi",
    purchaseAge: 18,
    claimWindow: "Typically by the expiration date printed on the ticket (often about one year).",
    statuteHint: "Michigan Lottery; unclaimed prizes generally go to the School Aid Fund.",
    remainingSource: "https://www.michiganlottery.com/resources/instant-games-prizes-remaining",
    issues: [
      "Not affiliated with the Michigan Lottery.",
      "Michigan remaining tables count unclaimed prizes and may include unsold tickets. “Left” is not the same as “in a store.”",
      "18+ to buy or redeem. No ticket sales on this site.",
    ],
    helpline: { label: "Michigan Problem Gambling Help", tel: "18002707117" },
  },
  az: {
    id: "az",
    purchaseAge: 21,
    claimWindow: "Typically 180 days after the announced game-end date (5:00 p.m. Phoenix time on the 180th day unless the game profile says otherwise).",
    statuteHint: "Arizona Lottery; A.R.S. Title 5. Purchase and redeem age is 21.",
    remainingSource: "https://www.arizonalottery.com/scratchers/top-prizes-remaining",
    issues: [
      "Arizona Lottery tickets may only be purchased or redeemed by players 21 or older.",
      "Not affiliated with the Arizona Lottery. Tickets cannot be sold by phone, mail, or internet — including this site.",
      "The public page is top-prize heavy. Mid-tier remaining is shown only when the Lottery publishes it. We do not invent missing tiers.",
    ],
    helpline: { label: "Arizona 1-800-NEXT-STEP", tel: "18006398783" },
  },
  nc: {
    id: "nc",
    purchaseAge: 18,
    claimWindow: "Typically 90 days after the announced game end date.",
    statuteHint: "North Carolina Education Lottery.",
    remainingSource: "https://nclottery.com/scratch-off-prizes-remaining",
    issues: [
      "Not affiliated with the North Carolina Education Lottery.",
      "Remaining is the published Remaining column, not store inventory.",
      "18+ to buy or redeem. No ticket sales on this site.",
    ],
    helpline: { label: "NC Problem Gambling Helpline", tel: "18777185543" },
  },
  pa: {
    id: "pa",
    purchaseAge: 18,
    claimWindow: "Typically one year after the announced game end date.",
    statuteHint: "Pennsylvania Lottery.",
    remainingSource: "https://www.palottery.pa.gov/scratch-offs/prizes-remaining.aspx",
    issues: [
      "Not affiliated with the Pennsylvania Lottery.",
      "Pennsylvania publishes the top six prize amounts and wins remaining. Lower unpublished tiers are not invented.",
      "18+ to buy or redeem. No ticket sales on this site.",
    ],
    helpline: NATIONAL_HELPLINE,
  },
  tx: {
    id: "tx",
    purchaseAge: 18,
    claimWindow: "Typically 180 days after the announced game close date.",
    statuteHint: "Texas Lottery Commission; Tex. Gov’t Code Chapter 466.",
    remainingSource:
      "https://www.texaslottery.com/export/sites/lottery/Games/Scratch_Offs/all.html",
    issues: [
      "Not affiliated with the Texas Lottery Commission. Official marks and logos are not used.",
      "This product is not a ticket courier or retailer. Texas SB 3070 (2025) prohibits selling or buying lottery tickets online or through a mobile app, including facilitation (Class A misdemeanor). We do not buy, print, deliver, or take orders for tickets.",
      "Remaining is printed minus claimed on published prize rows. Cash-option amounts are used when that is the published prize.",
      "18+ to buy or redeem. No ticket sales on this site.",
    ],
    helpline: NATIONAL_HELPLINE,
  },
  mo: {
    id: "mo",
    purchaseAge: 18,
    claimWindow: "Typically 180 days after the announced game end date.",
    statuteHint: "Missouri Lottery.",
    remainingSource: "https://www.molottery.com/scratchers-list.do",
    issues: [
      "Not affiliated with the Missouri Lottery.",
      "Unclaimed prizes on published prize levels map to remaining. Unpublished lower tiers are not invented.",
      "18+ to buy or redeem. No ticket sales on this site.",
    ],
    helpline: { label: "Missouri Problem Gambling Helpline", tel: "18882387633" },
  },
  oh: {
    id: "oh",
    purchaseAge: 18,
    claimWindow: "Typically 180 days after the announced game end date.",
    statuteHint: "Ohio Lottery.",
    remainingSource: "https://www.ohiolottery.com/games/scratch-offs/prizes-remaining",
    issues: [
      "Not affiliated with the Ohio Lottery.",
      "Daily remaining reports are unclaimed counts as of about 6:00 a.m. A listed prize may already have been sold.",
      "18+ to buy or redeem. No ticket sales on this site.",
    ],
    helpline: { label: "Ohio Problem Gambling Helpline", tel: "18005899966" },
  },
  il: {
    id: "il",
    purchaseAge: 18,
    claimWindow: "Typically one year after the announced game end date.",
    statuteHint:
      "Illinois Lottery Act. Subscriptions sold to Illinois consumers also follow the Automatic Contract Renewal Act, 815 ILCS 601.",
    remainingSource:
      "https://www.illinoislottery.com/about-the-games/unpaid-instant-games-prizes",
    issues: [
      "Not affiliated with the Illinois Lottery.",
      "If the official unpaid-prizes table cannot be compiled, this desk fails closed — no placeholder counts.",
      "Illinois Automatic Contract Renewal Act, 815 ILCS 601: clear auto-renewal disclosure; online-only cancel for online signup (601(b-5)); and written notice 30–60 days before the cancel deadline on 12-month plans that auto-renew for more than one month. Annual subscribers opt out on /account; Stripe emails the upcoming invoice.",
      "18+ to buy or redeem. No ticket sales on this site.",
    ],
    helpline: NATIONAL_HELPLINE,
  },
  ma: {
    id: "ma",
    purchaseAge: 18,
    claimWindow: "Typically one year after the announced game end date.",
    statuteHint: "Massachusetts State Lottery Commission; 960 CMR.",
    remainingSource: "https://www.masslottery.com/tools/prizes-remaining",
    issues: [
      "Not affiliated with the Massachusetts State Lottery.",
      "The Lottery’s own website restricts copying of its site materials. This desk uses remaining-prize facts the Lottery publishes, not its layout, code, or official artwork.",
      "Cash-option amounts are used when an annuity is listed. If the official table cannot be compiled, the desk fails closed.",
      "18+ to buy or redeem. No ticket sales on this site.",
    ],
    helpline: { label: "Massachusetts Gambling Helpline", tel: "18003275050" },
  },
  ia: {
    id: "ia",
    purchaseAge: 21,
    claimWindow: "Typically 90 days after the announced game end date.",
    statuteHint: "Iowa Code chapter 99G. Purchase age is 21 (Iowa Code § 99G.30).",
    remainingSource: "https://www.ialottery.com/Pages/Games/RemainingPrizes.aspx",
    issues: [
      "A player must be 21 or older to purchase Iowa Lottery tickets. Knowingly selling to a person under 21 is a simple misdemeanor under Iowa Code § 99G.30.",
      "Not affiliated with the Iowa Lottery. This site does not sell tickets.",
      "The official remaining table lists prizes of $50 and greater. Sub-$50 remaining is not invented.",
    ],
    helpline: { label: "Iowa 1-800-BETS OFF", tel: "18002387633" },
  },
  id: {
    id: "id",
    purchaseAge: 18,
    claimWindow: "Typically 180 days after the official end of the game.",
    statuteHint: "Idaho Lottery.",
    remainingSource: "https://www.idaholottery.com/games/scratch?view=remaining_prizes",
    issues: [
      "Not affiliated with the Idaho Lottery.",
      "Remaining is the published Remaining column, not store inventory.",
      "18+ to buy or redeem. No ticket sales on this site.",
    ],
    helpline: NATIONAL_HELPLINE,
  },
  ct: {
    id: "ct",
    purchaseAge: 18,
    claimWindow: "Typically 90 days after the announced game end date.",
    statuteHint: "Connecticut Lottery Corporation; Conn. Gen. Stat. Chapter 229a.",
    remainingSource: "https://ctlottery.org/ScratchGamesTable",
    issues: [
      "Not affiliated with the Connecticut Lottery Corporation.",
      "Unclaimed Prizes maps to remaining. Cash-option amounts are used when that is the published prize.",
      "18+ to buy or redeem. No ticket sales on this site.",
    ],
    helpline: { label: "Connecticut Council on Problem Gambling", tel: "18887897777" },
  },
};

export const STATE_LEGAL_LIST: StateLegalNote[] = STATE_IDS.map((id) => STATE_LEGAL[id]);

/** Last product-legal pass. Not a TN Lottery scrape date. */
export const LEGAL_REVIEW_DATE = "August 30, 2026";

export const COMMON_LEGAL_LIMITS = [
  "Scratch Vault is an independent remaining-prize information product of Webb Spinner Visions. It is not a lottery, casino, sportsbook, sweepstakes, ticket seller, courier, or prize payer.",
  "We are not affiliated with, endorsed by, sponsored by, or connected to any state lottery or lottery retailer.",
  "Lottery names, game titles, and trademarks belong to their owners and are used only to identify publicly offered games.",
  "Remaining-prize counts are compiled from each lottery’s public table. They are not live store inventory and do not improve, change, or guarantee the odds of any individual ticket.",
  "You cannot buy, scan, check, or redeem tickets here. Prize payment, claim deadlines, and eligibility are solely the issuing lottery’s under its rules.",
  "You must be 18 or older to use this product. Lottery ticket purchase ages are 21+ in Arizona and Iowa, and 18+ in the other listed states.",
  "This is not legal, tax, financial, or gambling advice. Rankings are information, not a prediction that any ticket, pack, store, or county will win.",
] as const;
