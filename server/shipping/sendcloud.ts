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
  provider: "sendcloud";
  carrier: string;
  serviceName: string;
  serviceCode: string;
  serviceToken: string;
  amountPence: number;
  currency: "GBP";
  estimatedDays?: number;
};

export type ShippingLabelInput = ShippingAddress & {
  parcels: ShippingParcel[];
  selectedRateId?: string;
  selectedServiceCode?: string;
};

export type ShippingLabelResult = {
  provider: "sendcloud";
  labelId: string;
  labelUrl?: string;
  trackingNumber: string;
  labelContentBase64?: string;
  labelMimeType?: string;
  labelFilename?: string;
};

function sendcloudBaseUrl(): string {
  return String(process.env.SENDCLOUD_API_BASE_URL || "https://panel.sendcloud.sc/api/v2").trim().replace(/\/+$/, "");
}

function credentials() {
  const publicKey = String(process.env.SENDCLOUD_PUBLIC_KEY || "").trim();
  const secretKey = String(process.env.SENDCLOUD_SECRET_KEY || "").trim();
  if (!publicKey || !secretKey) {
    throw new Error("SENDCLOUD_PUBLIC_KEY and SENDCLOUD_SECRET_KEY are required.");
  }
  return { publicKey, secretKey };
}

function authHeader(): string {
  const { publicKey, secretKey } = credentials();
  return `Basic ${Buffer.from(`${publicKey}:${secretKey}`).toString("base64")}`;
}

function postcodeLooksUk(postcode: string): boolean {
  const normalized = postcode.trim().toUpperCase();
  return /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/.test(normalized);
}

function assertUkDestination(input: { country?: string; postcode?: string }) {
  const country = (input.country || "GB").toUpperCase();
  if (country !== "GB" && country !== "UK") {
    throw new Error("Only UK domestic shipping is supported right now.");
  }
  if (!input.postcode || !postcodeLooksUk(input.postcode)) {
    throw new Error("Please enter a valid UK postcode.");
  }
}

function totalWeightKg(parcels: ShippingParcel[]): number {
  const grams = parcels.reduce((sum, p) => sum + Math.max(1, Math.round(p.weightGrams || 0)), 0);
  return Number((grams / 1000).toFixed(3));
}

function maxDimensionCm(parcels: ShippingParcel[], key: "lengthCm" | "widthCm" | "heightCm"): number {
  return Math.max(1, ...parcels.map((p) => Math.max(1, Math.round(p[key] || 0))));
}

function normalizeQuote(method: any): ShippingQuote | null {
  const id = method?.id ?? method?.shipping_method_id ?? method?.method_id;
  if (id === undefined || id === null) return null;
  const priceRaw = method?.price ?? method?.amount ?? method?.amount_incl_tax;
  const price = Number(priceRaw);
  if (!Number.isFinite(price)) return null;
  const serviceName = String(method?.name || method?.service_name || "Shipping");
  const carrier = String(method?.carrier || method?.carrier_name || "Sendcloud");
  const serviceCode = String(method?.code || method?.service_point_input || id);
  const daysRaw = Number(method?.delivery_days ?? method?.delivery_time ?? method?.transit_days);
  const estimatedDays = Number.isFinite(daysRaw) && daysRaw > 0 ? Math.round(daysRaw) : undefined;

  return {
    rateId: String(id),
    provider: "sendcloud",
    carrier,
    serviceName,
    serviceCode,
    serviceToken: `sendcloud:${serviceCode}`,
    amountPence: Math.round(price * 100),
    currency: "GBP",
    estimatedDays,
  };
}

async function sendcloudRequest<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${sendcloudBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Sendcloud API failed (${res.status})${text ? `: ${text}` : ""}`);
  }
  return (await res.json()) as T;
}

function shipFrom() {
  return {
    name: process.env.SHIP_FROM_NAME || "Smoke City Supplies",
    addressLine1: process.env.SHIP_FROM_ADDRESS_LINE1 || "Warehouse Address",
    addressLine2: process.env.SHIP_FROM_ADDRESS_LINE2 || "",
    city: process.env.SHIP_FROM_CITY || "Manchester",
    county: process.env.SHIP_FROM_COUNTY || "",
    postcode: process.env.SHIP_FROM_POSTCODE || "M1 1AA",
    country: process.env.SHIP_FROM_COUNTRY || "GB",
  };
}

export function assertSendcloudConfigurationOrThrow() {
  credentials();
}

export function getSendcloudStatus() {
  try {
    credentials();
    return { mode: "live" as const, configured: true };
  } catch {
    return { mode: "live" as const, configured: false };
  }
}

export async function quoteSendcloudRates(input: ShippingQuoteInput): Promise<ShippingQuote[]> {
  assertUkDestination(input);
  credentials();

  const weightKg = totalWeightKg(input.parcels);
  const payload = await sendcloudRequest<any>(
    `/shipping_methods?from_country=${encodeURIComponent((shipFrom().country || "GB").toUpperCase())}&to_country=${encodeURIComponent((input.country || "GB").toUpperCase())}&weight=${encodeURIComponent(String(weightKg))}`
  );

  const methods = Array.isArray(payload?.shipping_methods)
    ? payload.shipping_methods
    : Array.isArray(payload?.shippingMethods)
      ? payload.shippingMethods
      : [];

  const normalized = methods
    .map((m: any) => normalizeQuote(m))
    .filter((q: ShippingQuote | null): q is ShippingQuote => Boolean(q))
    .sort((a: ShippingQuote, b: ShippingQuote) => a.amountPence - b.amountPence);

  return normalized;
}

export async function createSendcloudLabel(input: ShippingLabelInput): Promise<ShippingLabelResult> {
  assertUkDestination(input);
  credentials();

  const selectedRateId = String(input.selectedRateId || input.selectedServiceCode || "").trim();
  if (!selectedRateId) {
    throw new Error("Missing selected Sendcloud shipping method.");
  }

  const from = shipFrom();
  const parcelPayload = {
    parcel: {
      name: input.name,
      email: input.email || "",
      address: input.addressLine1,
      address_2: input.addressLine2 || "",
      city: input.city,
      state: input.county || "",
      postal_code: input.postcode,
      country: (input.country || "GB").toUpperCase(),
      request_label: true,
      apply_shipping_rules: false,
      shipment: { id: Number(selectedRateId) || selectedRateId },
      weight: totalWeightKg(input.parcels),
      length: maxDimensionCm(input.parcels, "lengthCm"),
      width: maxDimensionCm(input.parcels, "widthCm"),
      height: maxDimensionCm(input.parcels, "heightCm"),
      sender_address: {
        name: from.name,
        address: from.addressLine1,
        address_2: from.addressLine2,
        city: from.city,
        state: from.county,
        postal_code: from.postcode,
        country: (from.country || "GB").toUpperCase(),
      },
    },
  };

  const payload = await sendcloudRequest<any>("/parcels", {
    method: "POST",
    body: JSON.stringify(parcelPayload),
  });

  const parcel = payload?.parcel || payload;
  const labelId = String(parcel?.id || parcel?.parcel_id || "");
  const trackingNumber = String(parcel?.tracking_number || parcel?.tracking || "");
  const labelUrl = String(parcel?.label?.normal_printer || parcel?.label_url || parcel?.label?.label_printer || "");

  if (!labelId || !trackingNumber || !labelUrl) {
    throw new Error("Sendcloud did not return a complete label response.");
  }

  return {
    provider: "sendcloud",
    labelId,
    labelUrl,
    trackingNumber,
  };
}
