import { getSql } from "./db";
import {
  isProfileHomeState,
  profileComplete,
  type BillingProfile,
  type BillingProfileInput,
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

export async function persistBillingProfile(
  userId: string,
  data: BillingProfileInput,
): Promise<BillingProfile> {
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
      userId,
    ],
  );
  return loadBillingProfile(userId);
}
