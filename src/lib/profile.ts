import { STATE_IDS, type StateId } from "@/config/states";

export const PROFILE_HOME_STATES = [...STATE_IDS, "other"] as const;
export type ProfileHomeState = (typeof PROFILE_HOME_STATES)[number];

export type BillingProfile = {
  legalName: string | null;
  dob: string | null;
  homeState: ProfileHomeState | null;
  ageAttestedAt: string | null;
  termsAcceptedAt: string | null;
  noRefundsAcceptedAt: string | null;
  billingConsentAt: string | null;
  complete: boolean;
};

export type BillingProfileInput = {
  legalName: string;
  dob: string;
  homeState: ProfileHomeState;
  ageAttested: boolean;
  termsAccepted: boolean;
  noRefundsAccepted: boolean;
  billingConsent: boolean;
};

export function isProfileHomeState(value: unknown): value is ProfileHomeState {
  return typeof value === "string" && (PROFILE_HOME_STATES as readonly string[]).includes(value);
}

export function ageOnDate(dobIso: string, at = new Date()): number | null {
  const dob = new Date(`${dobIso}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return null;
  let age = at.getFullYear() - dob.getFullYear();
  const month = at.getMonth() - dob.getMonth();
  if (month < 0 || (month === 0 && at.getDate() < dob.getDate())) age -= 1;
  return age;
}

/** App use is 18+. Ticket purchase in AZ and IA is 21+. */
export function requiredAgeForHomeState(homeState: ProfileHomeState): 18 | 21 {
  return homeState === "az" || homeState === "ia" ? 21 : 18;
}

export function profileComplete(profile: BillingProfile | null | undefined): boolean {
  if (!profile) return false;
  return Boolean(
    profile.legalName &&
      profile.dob &&
      profile.homeState &&
      profile.ageAttestedAt &&
      profile.termsAcceptedAt &&
      profile.noRefundsAcceptedAt &&
      profile.billingConsentAt,
  );
}

export function homeStateLabel(id: ProfileHomeState | StateId | "other"): string {
  const labels: Record<ProfileHomeState, string> = {
    tn: "Tennessee",
    ky: "Kentucky",
    sc: "South Carolina",
    ok: "Oklahoma",
    mi: "Michigan",
    az: "Arizona",
    nc: "North Carolina",
    pa: "Pennsylvania",
    tx: "Texas",
    mo: "Missouri",
    oh: "Ohio",
    il: "Illinois",
    ma: "Massachusetts",
    ia: "Iowa",
    id: "Idaho",
    ct: "Connecticut",
    other: "Another state / outside these desks",
  };
  return labels[id as ProfileHomeState] ?? id;
}

export function parseBillingProfileInput(raw: unknown): BillingProfileInput {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid profile");
  }
  const data = raw as Record<string, unknown>;
  const legalName = typeof data.legalName === "string" ? data.legalName.trim() : "";
  const dob = typeof data.dob === "string" ? data.dob.trim() : "";
  const homeState = data.homeState;
  if (legalName.length < 2 || legalName.length > 120) {
    throw new Error("Enter the legal name on the card.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    throw new Error("Enter a valid date of birth.");
  }
  if (!isProfileHomeState(homeState)) {
    throw new Error("Select your home state.");
  }
  const age = ageOnDate(dob);
  if (age === null || age < 18) {
    throw new Error("You must be 18 or older to use Scratch Vault.");
  }
  const need = requiredAgeForHomeState(homeState);
  if (age < need) {
    throw new Error(
      homeState === "az"
        ? "Arizona Lottery tickets are 21+. You must be 21 or older to complete a profile with Arizona as your home state."
        : "Iowa Lottery tickets are 21+. You must be 21 or older to complete a profile with Iowa as your home state.",
    );
  }
  if (age > 120) {
    throw new Error("Enter a valid date of birth.");
  }
  if (data.ageAttested !== true) {
    throw new Error("Confirm you meet the age requirement.");
  }
  if (data.termsAccepted !== true) {
    throw new Error("You must agree to the Terms of Service.");
  }
  if (data.noRefundsAccepted !== true) {
    throw new Error("You must acknowledge that fees are non-refundable.");
  }
  if (data.billingConsent !== true) {
    throw new Error("You must authorize the trial and auto-renewal terms.");
  }
  return {
    legalName,
    dob,
    homeState,
    ageAttested: true,
    termsAccepted: true,
    noRefundsAccepted: true,
    billingConsent: true,
  };
}
