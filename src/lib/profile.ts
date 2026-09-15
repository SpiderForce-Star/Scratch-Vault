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
    throw new Error("profile.errInvalid");
  }
  const data = raw as Record<string, unknown>;
  const legalName = typeof data.legalName === "string" ? data.legalName.trim() : "";
  const dob = typeof data.dob === "string" ? data.dob.trim() : "";
  const homeState = data.homeState;
  if (legalName.length < 2 || legalName.length > 120) {
    throw new Error("profile.errLegalName");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    throw new Error("profile.errDob");
  }
  if (!isProfileHomeState(homeState)) {
    throw new Error("profile.errState");
  }
  const age = ageOnDate(dob);
  if (age === null || age < 18) {
    throw new Error("profile.errAge");
  }
  const need = requiredAgeForHomeState(homeState);
  if (age < need) {
    throw new Error(
      homeState === "az"
        ? "profile.errAz21"
        : "profile.errIa21",
    );
  }
  if (age > 120) {
    throw new Error("profile.errDob");
  }
  if (data.ageAttested !== true) {
    throw new Error("profile.errAgeConfirm");
  }
  if (data.termsAccepted !== true) {
    throw new Error("profile.errTerms");
  }
  if (data.noRefundsAccepted !== true) {
    throw new Error("profile.errRefunds");
  }
  if (data.billingConsent !== true) {
    throw new Error("profile.errConsent");
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
