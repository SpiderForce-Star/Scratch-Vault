import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "./auth/middleware";
import { getSql } from "./db";
import {
  ageOnDate,
  isProfileHomeState,
  profileComplete,
  requiredAgeForHomeState,
  type BillingProfile,
  type BillingProfileInput,
  type ProfileHomeState,
} from "./profile";

type ProfileRow = {
  profileLegalName: string | null;
  profileDob: string | Date | null;
  profileHomeState: string | null;
  profileAgeAttestedAt: string | Date | null;
  profileTermsAcceptedAt: string | Date | null;
  profileNoRefundsAcceptedAt: string | Date | null;
  profileBillingConsentAt: string | Date | null;
};

function toIso(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function toDob(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function asProfile(row: ProfileRow | undefined): BillingProfile {
  const legalName = row?.profileLegalName?.trim() || null;
  const dob = toDob(row?.profileDob);
  const homeState = isProfileHomeState(row?.profileHomeState)
    ? row.profileHomeState
    : null;
  const profile: BillingProfile = {
    legalName,
    dob,
    homeState,
    ageAttestedAt: toIso(row?.profileAgeAttestedAt),
    termsAcceptedAt: toIso(row?.profileTermsAcceptedAt),
    noRefundsAcceptedAt: toIso(row?.profileNoRefundsAcceptedAt),
    billingConsentAt: toIso(row?.profileBillingConsentAt),
    complete: false,
  };
  profile.complete = profileComplete(profile);
  return profile;
}

export async function loadBillingProfile(userId: string): Promise<BillingProfile> {
  const sql = await getSql();
  const rows = await sql.query<ProfileRow>(
    `select "profileLegalName" as "profileLegalName",
            "profileDob" as "profileDob",
            "profileHomeState" as "profileHomeState",
            "profileAgeAttestedAt" as "profileAgeAttestedAt",
            "profileTermsAcceptedAt" as "profileTermsAcceptedAt",
            "profileNoRefundsAcceptedAt" as "profileNoRefundsAcceptedAt",
            "profileBillingConsentAt" as "profileBillingConsentAt"
       from "user"
      where id = $1`,
    [userId],
  );
  return asProfile(rows[0]);
}

function validateInput(raw: unknown): BillingProfileInput {
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
    homeState: homeState as ProfileHomeState,
    ageAttested: true,
    termsAccepted: true,
    noRefundsAccepted: true,
    billingConsent: true,
  };
}

export const getBillingProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<BillingProfile> => {
    return loadBillingProfile(context.userId);
  });

export const saveBillingProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => validateInput(data))
  .handler(async ({ data, context }): Promise<BillingProfile> => {
    const sql = await getSql();
    const now = new Date().toISOString();
    await sql.query(
      `update "user"
          set "profileLegalName" = $1,
              "profileDob" = $2,
              "profileHomeState" = $3,
              "profileAgeAttestedAt" = $4,
              "profileTermsAcceptedAt" = $5,
              "profileNoRefundsAcceptedAt" = $6,
              "profileBillingConsentAt" = $7,
              "updatedAt" = CURRENT_TIMESTAMP
        where id = $8`,
      [
        data.legalName,
        data.dob,
        data.homeState,
        now,
        now,
        now,
        now,
        context.userId,
      ],
    );
    return loadBillingProfile(context.userId);
  });
