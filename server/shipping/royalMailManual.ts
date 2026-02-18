import { randomUUID } from "crypto";

export type ShippingParcel = {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightGrams: number;
};

type ShippingAddress = {
  name: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
};

export type ShippingQuoteInput = ShippingAddress & {
  parcels: ShippingParcel[];
};

export type ShippingQuote = {
  rateId: string;
  provider: "royal_mail_manual" | "shippo";
  carrier: string;
  serviceName: string;
  serviceCode: string;
  serviceToken: string;
  amountPence: number;
  currency: "GBP";
  estimatedDays: number;
};

export type ShippingLabelInput = ShippingAddress & {
  parcels: ShippingParcel[];
  selectedRateId?: string;
  selectedServiceCode?: string;
  selectedServiceName?: string;
};

export type ShippingLabelResult = {
  provider: "royal_mail_manual" | "shippo";
  labelId: string;
  labelUrl: string;
  trackingNumber: string;
  serviceName: string;
};

function envPence(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : fallback;
}

export const ROYAL_MAIL_LABEL_URL = process.env.ROYAL_MAIL_LABEL_URL || "https://business.parcel.royalmail.com/";
export const ROYAL_MAIL_NEXT_DAY_GUARANTEED_PENCE = envPence("ROYAL_MAIL_NEXT_DAY_GUARANTEED_PENCE", 1000);
export const ROYAL_MAIL_NEXT_DAY_AIM_PENCE = envPence("ROYAL_MAIL_NEXT_DAY_AIM_PENCE", 500);
export const ROYAL_MAIL_TRACKED_48_PENCE = envPence("ROYAL_MAIL_TRACKED_48_PENCE", 400);

function postcodeLooksUk(postcode: string): boolean {
  const normalized = postcode.trim().toUpperCase();
  return /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/.test(normalized);
}

function assertUkDestination(input: { country?: string; postcode?: string }, requirePostcode = true) {
  const country = (input.country || "GB").toUpperCase();
  if (country !== "GB" && country !== "UK") {
    throw new Error("Only UK domestic shipping is supported right now.");
  }
  if (requirePostcode && (!input.postcode || !postcodeLooksUk(input.postcode))) {
    throw new Error("Please enter a valid UK postcode.");
  }
}

export function assertRoyalMailManualConfigurationOrThrow() {
  // Manual mode does not require API keys.
}

export function getRoyalMailManualStatus() {
  return { mode: "manual" as const, configured: true, provider: "royal_mail_manual" as const };
}

export function quoteRoyalMailFlatRates(input: Partial<ShippingQuoteInput> & { parcels?: ShippingParcel[] }): ShippingQuote[] {
  const hasPostcode = Boolean(input.postcode?.trim());
  assertUkDestination(input, hasPostcode);
  return [
    {
      rateId: "royal_mail_tracked_48_two_day_aim",
      provider: "royal_mail_manual",
      carrier: "Royal Mail",
      serviceName: "Royal Mail Tracked 48 (Two Day Delivery Aim)",
      serviceCode: "tracked_48_two_day_aim",
      serviceToken: "royal_mail_manual:tracked_48_two_day_aim",
      amountPence: ROYAL_MAIL_TRACKED_48_PENCE,
      currency: "GBP",
      estimatedDays: 2,
    },
    {
      rateId: "royal_mail_next_day_aim",
      provider: "royal_mail_manual",
      carrier: "Royal Mail",
      serviceName: "Royal Mail Next Day Aim",
      serviceCode: "next_day_aim",
      serviceToken: "royal_mail_manual:next_day_aim",
      amountPence: ROYAL_MAIL_NEXT_DAY_AIM_PENCE,
      currency: "GBP",
      estimatedDays: 1,
    },
    {
      rateId: "royal_mail_next_day_guaranteed",
      provider: "royal_mail_manual",
      carrier: "Royal Mail",
      serviceName: "Royal Mail Next Day Guaranteed",
      serviceCode: "next_day_guaranteed",
      serviceToken: "royal_mail_manual:next_day_guaranteed",
      amountPence: ROYAL_MAIL_NEXT_DAY_GUARANTEED_PENCE,
      currency: "GBP",
      estimatedDays: 1,
    },
  ];
}

export function createRoyalMailManualLabel(input: ShippingLabelInput): ShippingLabelResult {
  assertUkDestination(input);
  const selected = String(input.selectedRateId || input.selectedServiceCode || "").toLowerCase();
  const guaranteed = selected.includes("guaranteed");
  const tracked48 = selected.includes("tracked_48") || selected.includes("two_day");
  const serviceName = input.selectedServiceName ||
    (tracked48
      ? "Royal Mail Tracked 48 (Two Day Delivery Aim)"
      : guaranteed
        ? "Royal Mail Next Day Guaranteed"
        : "Royal Mail Next Day Aim");
  return {
    provider: "royal_mail_manual",
    labelId: `rm-manual-${randomUUID()}`,
    labelUrl: ROYAL_MAIL_LABEL_URL,
    trackingNumber: "MANUAL_PENDING",
    serviceName,
  };
}
