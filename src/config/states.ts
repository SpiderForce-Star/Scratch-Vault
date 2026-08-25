/**
 * Modular state configuration for Scratch Vault.
 *
 * Tennessee is the default, fully working desk. Other states ship with the
 * same remaining-prize field shape so a live loader can replace the sample
 * catalog without changing the heat engine.
 */
import { DESK_META } from "@/data/desk-meta";
import type { HeatContext } from "@/lib/heat";

export const STATE_IDS = [
  "tn",
  "ky",
  "sc",
  "ok",
  "mi",
  "az",
  "nc",
  "pa",
  "tx",
  "mo",
  "oh",
  "il",
  "ma",
  "ia",
  "id",
  "ct",
] as const;
export type StateId = (typeof STATE_IDS)[number];

export const DEFAULT_STATE_ID: StateId = "tn";

export type DataMode = "live" | "compiled" | "sample";

export type HoldbackRule = {
  id: string;
  label: string;
  /** Subtract this many posted top prizes for jackpot games. */
  subtractTop: number;
  description: string;
};

export type StateHelpline = {
  label: string;
  tel: string;
  href?: string;
};

export type StateConfig = {
  id: StateId;
  name: string;
  shortName: string;
  lotteryName: string;
  lotteryShort: string;
  timezone: string;
  remainingPrizesUrl: string | null;
  playResponsiblyUrl: string | null;
  dataSourceNotes: string;
  fieldMapping: string;
  hasFullMultiTier: boolean;
  dataMode: DataMode;
  holdback: HoldbackRule | null;
  pricePoints: readonly number[];
  helplineExtra: StateHelpline | null;
  weekLabel: string;
  publishedAt: string;
  /** Minimum age to buy or redeem that lottery’s tickets. App use stays 18+. */
  minAge: 18 | 21;
  /** Typical claim window. The ticket and lottery rules control. */
  claimWindow: string;
  /** How the lottery defines remaining prizes. */
  remainingDefinition: string;
  /** Short, state-specific game-rule notes shown on the desk. */
  rulesNotes: readonly string[];
};

export const TENNESSEE_HOLDBACK: HoldbackRule = {
  id: "play-it-again",
  label: "Play It Again",
  subtractTop: 1,
  description:
    "Tennessee typically reserves one top prize per instant game for Play It Again. A posted “1 left” is treated as no effective retail jackpot.",
};

export const STATES: Record<StateId, StateConfig> = {
  tn: {
    id: "tn",
    name: "Tennessee",
    shortName: "TN",
    lotteryName: "Tennessee Education Lottery Corporation",
    lotteryShort: "Tennessee Lottery",
    timezone: "America/Chicago",
    remainingPrizesUrl: "https://www.tnlottery.com/games/scratch-offs",
    playResponsiblyUrl: "https://tnlottery.com/play-responsibly/",
    dataSourceNotes:
      "Compiled from the public Tennessee remaining-prizes table and other published counts.",
    fieldMapping:
      "game number, name, price, prize amount, remaining count (top / mid / low when published)",
    hasFullMultiTier: true,
    dataMode: "live",
    holdback: TENNESSEE_HOLDBACK,
    pricePoints: [5, 10, 20, 25, 30, 50],
    helplineExtra: {
      label: "Tennessee REDLINE",
      tel: "18008899789",
    },
    weekLabel: DESK_META.weekLabel,
    publishedAt: DESK_META.publishedAt,
    minAge: 18,
    claimWindow:
      "Tennessee instant prizes must typically be claimed within 90 days of the announced game end date (mail-in claims must be postmarked within that window). The ticket and TELC rules control.",
    remainingDefinition:
      "Posted remaining prizes from the Lottery’s public table. Not live store inventory. A remaining prize may already have been sold.",
    rulesNotes: [
      "Tennessee typically reserves one top prize per instant game for Play It Again second-chance. This desk treats a posted “1 left” jackpot as no effective retail top.",
      "Prize payment, claim deadlines, and eligibility are solely TELC’s under its rules.",
      "Game names are used only to identify publicly offered games. Not affiliated with TELC.",
    ],
  },
  ky: {
    id: "ky",
    name: "Kentucky",
    shortName: "KY",
    lotteryName: "Kentucky Lottery Corporation",
    lotteryShort: "Kentucky Lottery",
    timezone: "America/New_York",
    remainingPrizesUrl: "https://www.kylottery.com/apps/scratch_offs/prizes_remaining.html",
    playResponsiblyUrl: "https://www.kylottery.com/",
    dataSourceNotes:
      "Compiled from the official Kentucky remaining-prizes page as of August 19, 2026. Not a live feed and not store inventory. $5–$50 games. No Tennessee Play It Again holdback.",
    fieldMapping:
      "game number + name, prize amount, prizes remaining (top / mid / cash from the published table)",
    hasFullMultiTier: true,
    dataMode: "compiled",
    holdback: null,
    pricePoints: [5, 10, 20, 25, 30, 50],
    helplineExtra: null,
    weekLabel: "Compiled · August 19, 2026",
    publishedAt: "2026-08-19T12:00:00-04:00",
    minAge: 18,
    claimWindow:
      "Kentucky scratch-off prizes must typically be claimed within 180 days of the game’s end date. Confirm on the ticket and kylottery.com.",
    remainingDefinition:
      "Compiled from the official remaining-prizes page as of August 19, 2026. Not live retailer inventory. Remaining counts change as tickets sell. High-tier remaining rows are often the cash-option amount, not the advertised annuity.",
    rulesNotes: [
      "This desk does not subtract a Play It Again holdback. That rule is Tennessee-only.",
      "Some Kentucky top prizes may be paid as an annuity or a smaller lump-sum cash option. Remaining-prize tables often list the cash amount.",
      "Scratch-offs generally must be claimed within 180 days of the game end date. The ticket and Kentucky Lottery Corporation rules control.",
      "Not affiliated with the Kentucky Lottery Corporation. Prize payment is solely the Lottery’s under its rules.",
    ],
  },
  sc: {
    id: "sc",
    name: "South Carolina",
    shortName: "SC",
    lotteryName: "South Carolina Education Lottery",
    lotteryShort: "SC Education Lottery",
    timezone: "America/New_York",
    remainingPrizesUrl: "https://www.sceducationlottery.com/Games/PrizesRemaining",
    playResponsiblyUrl: "https://www.sceducationlottery.com/FAQ/PlayerProtection",
    dataSourceNotes:
      "Compiled from official SC Education Lottery per-game unclaimed-prize tables as of August 20, 2026. Not a live feed and not store inventory. $5–$20 games currently listed.",
    fieldMapping:
      "game number + name, prize amount, estimated number of unclaimed prizes (top / mid / cash)",
    hasFullMultiTier: true,
    dataMode: "compiled",
    holdback: null,
    pricePoints: [5, 10, 20, 25, 30, 50],
    helplineExtra: {
      label: "SC DAODAS gambling help",
      tel: "18774525155",
    },
    weekLabel: "Compiled · August 20, 2026",
    publishedAt: "2026-08-20T10:00:00-04:00",
    minAge: 18,
    claimWindow:
      "South Carolina scratch-off prizes must typically be claimed within 90 days of the official end of the game. Confirm on the ticket and sceducationlottery.com.",
    remainingDefinition:
      "Compiled from the official remaining-prizes pages as of August 20, 2026. Unclaimed counts are estimates. Not live retailer inventory. Remaining counts change as tickets sell.",
    rulesNotes: [
      "This desk does not subtract a Play It Again holdback. That rule is Tennessee-only.",
      "South Carolina remaining counts are estimated unclaimed prizes. A listed prize may already have been sold.",
      "Scratch-off prizes must typically be claimed within 90 days of the official end of the game. The ticket and SC Education Lottery rules control.",
      "Not affiliated with the South Carolina Education Lottery. Prize payment is solely the Lottery’s under its rules.",
    ],
  },
  ok: {
    id: "ok",
    name: "Oklahoma",
    shortName: "OK",
    lotteryName: "Oklahoma Lottery",
    lotteryShort: "Oklahoma Lottery",
    timezone: "America/Chicago",
    remainingPrizesUrl: "https://www.lottery.ok.gov/scratchers/remaining-prizes",
    playResponsiblyUrl: "https://www.lottery.ok.gov/",
    dataSourceNotes:
      "Compiled from the official Oklahoma remaining-prizes listing as of August 20, 2026. Official page updates Monday–Friday at 8:00 a.m. Not a live feed. $5–$50 games.",
    fieldMapping:
      "game number + name, prize amount, remaining prizes, total prizes (top / mid / cash)",
    hasFullMultiTier: true,
    dataMode: "compiled",
    holdback: null,
    pricePoints: [5, 10, 20, 25, 30, 50],
    helplineExtra: null,
    weekLabel: "Compiled · August 20, 2026",
    publishedAt: "2026-08-20T08:00:00-05:00",
    minAge: 18,
    claimWindow:
      "Oklahoma scratcher prizes on ended games must typically be claimed within 90 days of the announced game end date. Confirm on the ticket and lottery.ok.gov.",
    remainingDefinition:
      "Compiled from the official remaining-prizes page as of August 20, 2026. Not live retailer inventory. Remaining counts change as tickets sell and as prizes are claimed.",
    rulesNotes: [
      "No Tennessee Play It Again holdback is applied.",
      "Official remaining prizes are typically updated Monday–Friday at 8:00 a.m. This desk is a compiled snapshot, not a live feed.",
      "Ended-game prizes are generally claimable for 90 days after the announced end date. The ticket and Oklahoma Lottery rules control.",
      "Not affiliated with the Oklahoma Lottery. Prize payment is solely the Lottery’s under its rules.",
    ],
  },
  mi: {
    id: "mi",
    name: "Michigan",
    shortName: "MI",
    lotteryName: "Michigan Lottery",
    lotteryShort: "Michigan Lottery",
    timezone: "America/Detroit",
    remainingPrizesUrl: "https://www.michiganlottery.com/resources/instant-games-prizes-remaining",
    playResponsiblyUrl: "https://www.michiganlottery.com/resources",
    dataSourceNotes:
      "Compiled from official Michigan instant remaining-prize listings as of August 15, 2026. Michigan states remaining prizes are unclaimed and may include unsold tickets. Not a live feed.",
    fieldMapping:
      "game number + name, ticket price, prize amount, remaining vs starting (top / mid / cash)",
    hasFullMultiTier: true,
    dataMode: "compiled",
    holdback: null,
    pricePoints: [5, 10, 20, 25, 30, 50],
    helplineExtra: {
      label: "Michigan Problem Gambling Help",
      tel: "18002707117",
    },
    weekLabel: "Compiled · August 15, 2026",
    publishedAt: "2026-08-15T03:52:00-04:00",
    minAge: 18,
    claimWindow:
      "Michigan instant prizes must typically be claimed by the expiration date printed on the ticket (often about one year). Unclaimed prizes generally go to the School Aid Fund. Confirm on the ticket and michiganlottery.com.",
    remainingDefinition:
      "Compiled from the official remaining-prizes page as of August 15, 2026. Remaining prizes represent unclaimed prizes and include tickets that may or may not have already been sold. Not live retailer inventory.",
    rulesNotes: [
      "No Tennessee Play It Again holdback is applied.",
      "The Michigan Lottery’s remaining-prize tables count unclaimed prizes, including tickets that may not yet have been sold. “Left” is not the same as “in a store.”",
      "Claim by the date on the ticket. Unclaimed prizes generally go to the School Aid Fund after the statutory period.",
      "Not affiliated with the Michigan Lottery. Prize payment is solely the Lottery’s under its rules.",
    ],
  },
  az: {
    id: "az",
    name: "Arizona",
    shortName: "AZ",
    lotteryName: "Arizona Lottery",
    lotteryShort: "Arizona Lottery",
    timezone: "America/Phoenix",
    remainingPrizesUrl: "https://www.arizonalottery.com/scratchers/top-prizes-remaining",
    playResponsiblyUrl: "https://www.arizonalottery.com/winners/player-security/",
    dataSourceNotes:
      "Compiled from official Arizona top-prizes-remaining listings as of August 21, 2026. The public page is top-prize heavy; mid-tier remaining is included only when published. Not a live feed.",
    fieldMapping:
      "game number + name, top prize amount, top prizes remaining (additional tiers when published)",
    hasFullMultiTier: false,
    dataMode: "compiled",
    holdback: null,
    pricePoints: [5, 10, 20, 25, 30, 50],
    helplineExtra: {
      label: "Arizona 1-800-NEXT-STEP",
      tel: "18006398783",
    },
    weekLabel: "Compiled · August 21, 2026",
    publishedAt: "2026-08-21T12:00:00-07:00",
    minAge: 21,
    claimWindow:
      "Arizona Scratchers prizes must typically be claimed within 180 days of the announced game-end date (by 5:00 p.m. Phoenix time on the 180th day, unless the game profile says otherwise). Confirm on the ticket and arizonalottery.com.",
    remainingDefinition:
      "Compiled from the official top-prizes-remaining page as of August 21, 2026. Not live retailer inventory. Mid-tier remaining is not invented when the Lottery only publishes the top prize.",
    rulesNotes: [
      "Arizona Lottery tickets may only be purchased or redeemed by players 21 or older.",
      "This desk does not subtract a Play It Again holdback. That rule is Tennessee-only.",
      "Arizona Scratchers prizes must typically be claimed within 180 days of the announced game-end date. The ticket and Arizona Lottery rules control.",
      "Not affiliated with the Arizona Lottery. Prize payment is solely the Lottery’s under its rules.",
    ],
  },
  nc: {
    id: "nc",
    name: "North Carolina",
    shortName: "NC",
    lotteryName: "North Carolina Education Lottery",
    lotteryShort: "NC Education Lottery",
    timezone: "America/New_York",
    remainingPrizesUrl: "https://nclottery.com/scratch-off-prizes-remaining",
    playResponsiblyUrl: "https://nclottery.com/responsible-gaming",
    dataSourceNotes:
      "Compiled from the official NC Education Lottery remaining-prizes page as of August 20, 2026. Value / Total / Remaining. Map Remaining → remaining. Not a live feed and not store inventory. $5–$50 games.",
    fieldMapping:
      "game number + name, prize Value, Total, Remaining (top / mid / cash from published tiers)",
    hasFullMultiTier: true,
    dataMode: "compiled",
    holdback: null,
    pricePoints: [5, 10, 20, 25, 30, 50],
    helplineExtra: {
      label: "NC Problem Gambling Helpline",
      tel: "18777185543",
    },
    weekLabel: "Compiled · August 20, 2026",
    publishedAt: "2026-08-20T12:00:00-04:00",
    minAge: 18,
    claimWindow:
      "North Carolina scratch-off prizes must typically be claimed within 90 days of the announced game end date. Confirm on the ticket and nclottery.com.",
    remainingDefinition:
      "Compiled from the official remaining-prizes page as of August 20, 2026. Remaining is the published Remaining column. Not live retailer inventory. Remaining counts change as tickets sell.",
    rulesNotes: [
      "This desk does not subtract a Play It Again holdback. That rule is Tennessee-only.",
      "North Carolina remaining counts are prizes not yet claimed as of the published date. A listed prize may already have been sold.",
      "Scratch-off prizes must typically be claimed within 90 days of the announced game end date. The ticket and NC Education Lottery rules control.",
      "Not affiliated with the North Carolina Education Lottery. Prize payment is solely the Lottery’s under its rules.",
    ],
  },
  pa: {
    id: "pa",
    name: "Pennsylvania",
    shortName: "PA",
    lotteryName: "Pennsylvania Lottery",
    lotteryShort: "Pennsylvania Lottery",
    timezone: "America/New_York",
    remainingPrizesUrl: "https://www.palottery.pa.gov/scratch-offs/prizes-remaining.aspx",
    playResponsiblyUrl: "https://www.palottery.pa.gov/About-PA-Lottery/Responsible-Gaming.aspx",
    dataSourceNotes:
      "Compiled from the official Pennsylvania Top Six Prizes / Wins Remaining table as of August 18, 2026. Not a live feed and not store inventory. $5–$50 games.",
    fieldMapping:
      "game number + name, Top Six Prizes, Wins Remaining (top / mid / cash from the six published amounts)",
    hasFullMultiTier: true,
    dataMode: "compiled",
    holdback: null,
    pricePoints: [5, 10, 20, 25, 30, 50],
    helplineExtra: null,
    weekLabel: "Compiled · August 18, 2026",
    publishedAt: "2026-08-18T12:00:00-04:00",
    minAge: 18,
    claimWindow:
      "Pennsylvania scratch-off prizes must typically be claimed within one year of the announced game end date. Confirm on the ticket and palottery.pa.gov.",
    remainingDefinition:
      "Compiled from the official prizes-remaining page as of August 18, 2026. Wins Remaining are updated when the Lottery processes claims. Not live retailer inventory.",
    rulesNotes: [
      "This desk does not subtract a Play It Again holdback. That rule is Tennessee-only.",
      "Pennsylvania publishes the top six prize amounts and wins remaining. Lower unpublished tiers are not invented.",
      "Scratch-off prizes must typically be claimed within one year of the announced game end date. The ticket and Pennsylvania Lottery rules control.",
      "Not affiliated with the Pennsylvania Lottery. Prize payment is solely the Lottery’s under its rules.",
    ],
  },
  tx: {
    id: "tx",
    name: "Texas",
    shortName: "TX",
    lotteryName: "Texas Lottery Commission",
    lotteryShort: "Texas Lottery",
    timezone: "America/Chicago",
    remainingPrizesUrl:
      "https://www.texaslottery.com/export/sites/lottery/Games/Scratch_Offs/all.html",
    playResponsiblyUrl:
      "https://www.texaslottery.com/export/sites/lottery/Misc/responsible_gaming.html",
    dataSourceNotes:
      "Compiled from the official Texas Scratch Ticket Prizes Claimed table as of August 20, 2026. Remaining = prizes printed minus prizes claimed on published rows. Not a live feed and not store inventory. $5–$50 games.",
    fieldMapping:
      "game number + name, prize amount, prizes printed, prizes claimed (remaining = printed − claimed)",
    hasFullMultiTier: true,
    dataMode: "compiled",
    holdback: null,
    pricePoints: [5, 10, 20, 25, 30, 50],
    helplineExtra: null,
    weekLabel: "Compiled · August 20, 2026",
    publishedAt: "2026-08-20T12:00:00-05:00",
    minAge: 18,
    claimWindow:
      "Texas scratch-off prizes must typically be claimed within 180 days of the announced game close date. Confirm on the ticket and texaslottery.com.",
    remainingDefinition:
      "Compiled from the official prizes-claimed table as of August 20, 2026. Remaining is printed minus claimed on published prize rows. Not live retailer inventory. Cash-option amounts are used when that is the published prize amount.",
    rulesNotes: [
      "This desk does not subtract a Play It Again holdback. That rule is Tennessee-only.",
      "Some Texas top prizes may be paid as an annuity or a smaller lump-sum cash option. This desk uses the prize amount the Lottery published.",
      "Scratch-off prizes must typically be claimed within 180 days of the announced close date. The ticket and Texas Lottery Commission rules control.",
      "Not affiliated with the Texas Lottery Commission. Prize payment is solely the Lottery’s under its rules.",
    ],
  },
  mo: {
    id: "mo",
    name: "Missouri",
    shortName: "MO",
    lotteryName: "Missouri Lottery",
    lotteryShort: "Missouri Lottery",
    timezone: "America/Chicago",
    remainingPrizesUrl: "https://www.molottery.com/scratchers-list.do",
    playResponsiblyUrl: "https://www.molottery.com/play-responsibly",
    dataSourceNotes:
      "Compiled from official Missouri Scratchers prize tables (Prize Level / Total Prizes / Unclaimed Prizes) as of August 21, 2026. Map Unclaimed → remaining. Not a live feed and not store inventory. $5–$50 games.",
    fieldMapping:
      "game number + name, prize level, total prizes, unclaimed prizes (top / mid / cash from published rows)",
    hasFullMultiTier: true,
    dataMode: "compiled",
    holdback: null,
    pricePoints: [5, 10, 20, 25, 30, 50],
    helplineExtra: {
      label: "Missouri Problem Gambling Helpline",
      tel: "18882387633",
    },
    weekLabel: "Compiled · August 21, 2026",
    publishedAt: "2026-08-21T12:00:00-05:00",
    minAge: 18,
    claimWindow:
      "Missouri scratch-off prizes must typically be claimed within 180 days of the announced game end date. Confirm on the ticket and molottery.com.",
    remainingDefinition:
      "Compiled from official Scratchers unclaimed-prize tables as of August 21, 2026. Unclaimed maps to remaining. Not live retailer inventory. Unpublished lower tiers are not invented.",
    rulesNotes: [
      "This desk does not subtract a Play It Again holdback. That rule is Tennessee-only.",
      "Missouri remaining counts are unclaimed prizes on published prize levels. A listed prize may already have been sold.",
      "Scratch-off prizes must typically be claimed within 180 days of the announced game end date. The ticket and Missouri Lottery rules control.",
      "Not affiliated with the Missouri Lottery. Prize payment is solely the Lottery’s under its rules.",
    ],
  },
  oh: {
    id: "oh",
    name: "Ohio",
    shortName: "OH",
    lotteryName: "Ohio Lottery",
    lotteryShort: "Ohio Lottery",
    timezone: "America/New_York",
    remainingPrizesUrl: "https://www.ohiolottery.com/games/scratch-offs/prizes-remaining",
    playResponsiblyUrl: "https://www.ohiolottery.com/about/responsible-gaming",
    dataSourceNotes:
      "Compiled from the official Ohio daily remaining report as of August 21, 2026 (unclaimed as of approximately 6:00 a.m.). Not a live feed and not store inventory. $5–$50 games.",
    fieldMapping:
      "game number + name, published prize amount, unclaimed count (top / mid / cash from published tiers)",
    hasFullMultiTier: true,
    dataMode: "compiled",
    holdback: null,
    pricePoints: [5, 10, 20, 25, 30, 50],
    helplineExtra: {
      label: "Ohio Problem Gambling Helpline",
      tel: "18005899966",
    },
    weekLabel: "Compiled · August 21, 2026",
    publishedAt: "2026-08-21T06:00:00-04:00",
    minAge: 18,
    claimWindow:
      "Ohio scratch-off prizes must typically be claimed within 180 days of the announced game end date. Confirm on the ticket and ohiolottery.com.",
    remainingDefinition:
      "Compiled from the official daily remaining report as of August 21, 2026. Remaining is the published unclaimed count. Not live retailer inventory. Claims may not yet be filed for prizes still listed.",
    rulesNotes: [
      "This desk does not subtract a Play It Again holdback. That rule is Tennessee-only.",
      "Ohio remaining counts are unclaimed prizes as of about 6:00 a.m. on the snapshot date. A listed prize may already have been sold.",
      "Scratch-off prizes must typically be claimed within 180 days of the announced game end date. The ticket and Ohio Lottery rules control.",
      "Not affiliated with the Ohio Lottery. Prize payment is solely the Lottery’s under its rules.",
    ],
  },
  il: {
    id: "il",
    name: "Illinois",
    shortName: "IL",
    lotteryName: "Illinois Lottery",
    lotteryShort: "Illinois Lottery",
    timezone: "America/Chicago",
    remainingPrizesUrl:
      "https://www.illinoislottery.com/about-the-games/unpaid-instant-games-prizes",
    playResponsiblyUrl: "https://www.illinoislottery.com/about-the-games/play-responsibly",
    dataSourceNotes:
      "Official unpaid instant-game prizes table (Name | Price | Game Number | Prize Values | Total | Unclaimed). Map Unclaimed → remaining. This snapshot could not be fetched at compile time; the desk fails closed until a trusted parse exists.",
    fieldMapping: "game number + name, prize values, total, unclaimed remaining",
    hasFullMultiTier: true,
    dataMode: "compiled",
    holdback: null,
    pricePoints: [5, 10, 20, 25, 30, 50],
    helplineExtra: null,
    weekLabel: "Compiled · fetch failed",
    publishedAt: "2026-08-21T12:00:00-05:00",
    minAge: 18,
    claimWindow:
      "Illinois instant prizes must typically be claimed within one year of the announced game end date. Confirm on the ticket and illinoislottery.com.",
    remainingDefinition:
      "Unclaimed maps to remaining on published prize values. Not live retailer inventory. Unpublished tiers are not invented.",
    rulesNotes: [
      "This desk does not subtract a Play It Again holdback. That rule is Tennessee-only.",
      "If the official remaining table cannot be compiled, no placeholder counts are shown.",
      "Not affiliated with the Illinois Lottery. Prize payment is solely the Lottery’s under its rules.",
    ],
  },
  ma: {
    id: "ma",
    name: "Massachusetts",
    shortName: "MA",
    lotteryName: "Massachusetts State Lottery",
    lotteryShort: "Massachusetts Lottery",
    timezone: "America/New_York",
    remainingPrizesUrl: "https://www.masslottery.com/tools/prizes-remaining",
    playResponsiblyUrl: "https://www.masslottery.com/about/responsible-gaming",
    dataSourceNotes:
      "Official prizes-remaining table (Game | Prize Amount | Start | Claimed | Remaining). Cash option when an annuity is listed. This snapshot could not be fetched at compile time; the desk fails closed until a trusted parse exists.",
    fieldMapping: "game + prize amount + remaining; cash option when annuity is listed",
    hasFullMultiTier: true,
    dataMode: "compiled",
    holdback: null,
    pricePoints: [5, 10, 20, 25, 30, 50],
    helplineExtra: {
      label: "Massachusetts Gambling Helpline",
      tel: "18003275050",
    },
    weekLabel: "Compiled · fetch failed",
    publishedAt: "2026-08-21T12:00:00-04:00",
    minAge: 18,
    claimWindow:
      "Massachusetts instant prizes must typically be claimed within one year of the announced game end date. Confirm on the ticket and masslottery.com.",
    remainingDefinition:
      "Remaining is the published Remaining column. Cash-option amounts are used when that is the published prize. Not live retailer inventory.",
    rulesNotes: [
      "This desk does not subtract a Play It Again holdback. That rule is Tennessee-only.",
      "If the official remaining table cannot be compiled, no placeholder counts are shown.",
      "Not affiliated with the Massachusetts State Lottery. Prize payment is solely the Lottery’s under its rules.",
    ],
  },
  ia: {
    id: "ia",
    name: "Iowa",
    shortName: "IA",
    lotteryName: "Iowa Lottery",
    lotteryShort: "Iowa Lottery",
    timezone: "America/Chicago",
    remainingPrizesUrl: "https://www.ialottery.com/Pages/Games/RemainingPrizes.aspx",
    playResponsiblyUrl: "https://www.ialottery.com/Pages/AboutUs/ResponsibleGambling.aspx",
    dataSourceNotes:
      "Compiled from the official Iowa remaining-prizes table as of August 20, 2026. Scratch games only. Unclaimed → remaining. Official table lists prizes of $50 and greater.",
    fieldMapping:
      "game name (number), game type=Scratch, cost, prize, claimed, unclaimed remaining",
    hasFullMultiTier: true,
    dataMode: "compiled",
    holdback: null,
    pricePoints: [5, 10, 20, 25, 30, 50],
    helplineExtra: {
      label: "Iowa 1-800-BETS OFF",
      tel: "18002387633",
    },
    weekLabel: "Compiled · August 20, 2026",
    publishedAt: "2026-08-20T23:59:00-05:00",
    minAge: 21,
    claimWindow:
      "Iowa scratch-off prizes must typically be claimed within 90 days of the announced game end date. Confirm on the ticket and ialottery.com.",
    remainingDefinition:
      "Compiled from the official remaining-prizes page as of August 20, 2026. Unclaimed maps to remaining. The official table lists remaining prizes of $50 and greater. Sub-$50 remaining is not invented.",
    rulesNotes: [
      "Iowa Lottery tickets may only be purchased by players 21 or older (Iowa Code § 99G.30).",
      "This desk does not subtract a Play It Again holdback. That rule is Tennessee-only.",
      "Iowa publishes remaining prizes of $50 and greater. Lower unpublished counts are not invented.",
      "Scratch-off prizes must typically be claimed within 90 days of the announced game end date. The ticket and Iowa Lottery rules control.",
      "Not affiliated with the Iowa Lottery. Prize payment is solely the Lottery’s under its rules.",
    ],
  },
  id: {
    id: "id",
    name: "Idaho",
    shortName: "ID",
    lotteryName: "Idaho Lottery",
    lotteryShort: "Idaho Lottery",
    timezone: "America/Boise",
    remainingPrizesUrl: "https://www.idaholottery.com/games/scratch?view=remaining_prizes",
    playResponsiblyUrl: "https://www.idaholottery.com/play-responsibly",
    dataSourceNotes:
      "Compiled from the official Idaho remaining-prizes print table as of August 21, 2026. Prize | Remaining. Map Remaining → remaining.",
    fieldMapping: "game number + name, prize amount, remaining",
    hasFullMultiTier: true,
    dataMode: "compiled",
    holdback: null,
    pricePoints: [5, 10, 20, 25, 30, 50],
    helplineExtra: null,
    weekLabel: "Compiled · August 21, 2026",
    publishedAt: "2026-08-21T12:00:00-06:00",
    minAge: 18,
    claimWindow:
      "Idaho scratch-off prizes must typically be claimed within 180 days of the official end of the game. Confirm on the ticket and idaholottery.com.",
    remainingDefinition:
      "Compiled from the official remaining-prizes table as of August 21, 2026. Remaining is the published Remaining column. Not live retailer inventory.",
    rulesNotes: [
      "This desk does not subtract a Play It Again holdback. That rule is Tennessee-only.",
      "Scratch-off prizes must typically be claimed within 180 days of the official end of the game. The ticket and Idaho Lottery rules control.",
      "Not affiliated with the Idaho Lottery. Prize payment is solely the Lottery’s under its rules.",
    ],
  },
  ct: {
    id: "ct",
    name: "Connecticut",
    shortName: "CT",
    lotteryName: "Connecticut Lottery Corporation",
    lotteryShort: "CT Lottery",
    timezone: "America/New_York",
    remainingPrizesUrl: "https://ctlottery.org/ScratchGamesTable",
    playResponsiblyUrl: "https://ctlottery.org/ResponsibleGaming",
    dataSourceNotes:
      "Compiled from official Connecticut per-game remaining tables (Prize Amount | Total Prizes | Unclaimed Prizes) as of August 20, 2026. Map Unclaimed Prizes → remaining. Not a live feed and not store inventory. $5–$50 games.",
    fieldMapping:
      "game number + name, prize amount, total prizes, unclaimed remaining; cash option when annuity is listed",
    hasFullMultiTier: true,
    dataMode: "compiled",
    holdback: null,
    pricePoints: [5, 10, 20, 25, 30, 50],
    helplineExtra: {
      label: "Connecticut Council on Problem Gambling",
      tel: "18887897777",
    },
    weekLabel: "Compiled · August 20, 2026",
    publishedAt: "2026-08-20T12:00:00-04:00",
    minAge: 18,
    claimWindow:
      "Connecticut scratch-off prizes must typically be claimed within 90 days of the announced game end date. Confirm on the ticket and ctlottery.org.",
    remainingDefinition:
      "Compiled from official per-game Unclaimed Prizes tables as of August 20, 2026. Unclaimed Prizes maps to remaining. Cash-option amounts are used when that is the published prize. Not live retailer inventory.",
    rulesNotes: [
      "This desk does not subtract a Play It Again holdback. That rule is Tennessee-only.",
      "Scratch-off prizes must typically be claimed within 90 days of the announced game end date. The ticket and Connecticut Lottery Corporation rules control.",
      "Not affiliated with the Connecticut Lottery Corporation. Prize payment is solely the Lottery’s under its rules.",
    ],
  },
};

export const STATE_LIST: StateConfig[] = STATE_IDS.map((id) => STATES[id]);

export const STATE_MAP: Record<StateId, StateConfig> = STATES;

export function isStateId(value: unknown): value is StateId {
  return typeof value === "string" && (STATE_IDS as readonly string[]).includes(value);
}

export function parseStateId(value: unknown): StateId {
  return isStateId(value) ? value : DEFAULT_STATE_ID;
}

export function getState(id: StateId | string | null | undefined): StateConfig {
  return STATES[parseStateId(id)];
}

export function isSampleDesk(state: StateConfig | StateId): boolean {
  const config = typeof state === "string" ? getState(state) : state;
  return config.dataMode === "sample";
}

export function deskStatusLabel(state: StateConfig): string {
  if (state.dataMode === "sample") return "Demo data";
  if (state.dataMode === "compiled") return "Compiled snapshot";
  return "Official table";
}

/** Lottery purchase/redeem age for this desk. App use stays 18+. */
export function purchaseAgeLabel(state: StateConfig): string {
  return `${state.minAge}+`;
}

export function purchaseAgeLine(state: StateConfig): string {
  return `You must be ${state.minAge} or older to buy or redeem ${state.lotteryShort} tickets.`;
}

/** Short global age line used in footers and meta. */
export const APP_AGE_LINE =
  "18+ to use this tool. Lottery tickets are 18+ in most supported states; Arizona and Iowa are 21+.";

/** Heat engine context. Only Tennessee applies a top-prize holdback today. */
export function heatContextFor(state: StateConfig): HeatContext {
  if (!state.holdback || state.holdback.subtractTop <= 0) {
    return { topHoldback: 0 };
  }
  return {
    topHoldback: state.holdback.subtractTop,
    holdbackLabel: state.holdback.label,
  };
}
