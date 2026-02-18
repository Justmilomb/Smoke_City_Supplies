import { Shippo } from "shippo";
import type { ShippingQuoteInput, ShippingQuote, ShippingParcel, ShippingLabelResult } from "./royalMailManual";

let _client: Shippo | null = null;

function getClient(): Shippo {
  if (!_client) {
    _client = new Shippo({ apiKeyHeader: process.env.SHIPPO_API_KEY! });
  }
  return _client;
}

export function isShippoEnabled(): boolean {
  return Boolean(process.env.SHIPPO_API_KEY) && process.env.SHIPPO_ENABLED !== "false";
}

export function buildAddressFrom() {
  return {
    name: process.env.SHIP_FROM_NAME || "",
    street1: process.env.SHIP_FROM_ADDRESS_LINE1 || "",
    street2: process.env.SHIP_FROM_ADDRESS_LINE2 || undefined,
    city: process.env.SHIP_FROM_CITY || "",
    state: process.env.SHIP_FROM_COUNTY || undefined,
    zip: process.env.SHIP_FROM_POSTCODE || "",
    country: process.env.SHIP_FROM_COUNTRY || "GB",
  };
}

export function buildAddressTo(input: ShippingQuoteInput) {
  return {
    name: input.name || "",
    street1: input.addressLine1 || "",
    street2: input.addressLine2 || undefined,
    city: input.city || "",
    state: input.county || undefined,
    zip: input.postcode || "",
    country: (input.country || "GB").toUpperCase(),
    email: input.email || undefined,
  };
}

function buildParcels(parcels: ShippingParcel[]) {
  return parcels.map((p) => ({
    length: String(p.lengthCm),
    width: String(p.widthCm),
    height: String(p.heightCm),
    distanceUnit: "cm" as const,
    weight: String(p.weightGrams),
    massUnit: "g" as const,
  }));
}

export async function quoteShippoRates(input: ShippingQuoteInput): Promise<ShippingQuote[]> {
  try {
    const client = getClient();

    const addressFrom = buildAddressFrom();
    const addressTo = buildAddressTo(input);
    console.log("[shippo] Requesting rates:", {
      from: { city: addressFrom.city, zip: addressFrom.zip, country: addressFrom.country },
      to: { city: addressTo.city, zip: addressTo.zip, country: addressTo.country },
      parcels: input.parcels.length,
    });

    const shipment = await client.shipments.create({
      addressFrom,
      addressTo,
      parcels: buildParcels(input.parcels),
      async: false,
    });

    if (!shipment.rates?.length) {
      console.warn("[shippo] No rates returned for shipment", shipment.objectId);
      if ((shipment as any).messages?.length) {
        console.warn("[shippo] Messages:", JSON.stringify((shipment as any).messages));
      }
      return [];
    }

    const gbpRates = shipment.rates.filter(
      (r) => r.currency?.toUpperCase() === "GBP" || r.currencyLocal?.toUpperCase() === "GBP"
    );

    if (!gbpRates.length) {
      console.warn("[shippo] No GBP rates found among", shipment.rates.length, "rates");
      return [];
    }

    return gbpRates.map((rate) => {
      const amountStr = rate.currency?.toUpperCase() === "GBP" ? rate.amount : rate.amountLocal;
      const amountPence = Math.round(parseFloat(amountStr) * 100);

      return {
        rateId: rate.objectId,
        provider: "shippo" as const,
        carrier: rate.provider || "Unknown Carrier",
        serviceName: rate.servicelevel?.name || "Standard",
        serviceCode: rate.servicelevel?.token || rate.objectId,
        serviceToken: `shippo:${rate.objectId}`,
        amountPence,
        currency: "GBP" as const,
        estimatedDays: rate.estimatedDays ?? 3,
      };
    });
  } catch (err) {
    console.error("[shippo] Failed to fetch rates:", err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * Purchase a label from Shippo using a rate object ID.
 * The rateId must be from a shipment created within the last 7 days.
 */
export async function createShippoLabel(rateId: string, metadata?: string): Promise<ShippingLabelResult> {
  const client = getClient();

  const transaction = await client.transactions.create({
    rate: rateId,
    labelFileType: "PDF_4x6" as any,
    async: false,
    metadata: metadata || "",
  });

  if (transaction.status === "ERROR") {
    const msgs = transaction.messages?.map((m) => m.text).filter(Boolean).join("; ");
    throw new Error(`Shippo label creation failed: ${msgs || "Unknown error"}`);
  }

  return {
    provider: "shippo",
    labelId: transaction.objectId || rateId,
    labelUrl: transaction.labelUrl || "",
    trackingNumber: transaction.trackingNumber || "",
    serviceName: metadata || "Shippo",
  };
}

/**
 * Create a shipment and immediately purchase a label in one call.
 * Used when we don't have an existing rate ID (e.g., for admin-initiated labels).
 */
export async function createShippoShipmentAndLabel(input: {
  addressFrom: ReturnType<typeof buildAddressFrom>;
  addressTo: ReturnType<typeof buildAddressTo>;
  parcels: ShippingParcel[];
  serviceLevelToken?: string;
  carrierAccount?: string;
  metadata?: string;
}): Promise<ShippingLabelResult> {
  const client = getClient();

  // Create shipment first to get rates
  const shipment = await client.shipments.create({
    addressFrom: input.addressFrom,
    addressTo: input.addressTo,
    parcels: buildParcels(input.parcels),
    async: false,
  });

  if (!shipment.rates?.length) {
    throw new Error("No shipping rates available for this address");
  }

  // Find matching rate or pick cheapest GBP rate
  const gbpRates = shipment.rates.filter(
    (r) => r.currency?.toUpperCase() === "GBP" || r.currencyLocal?.toUpperCase() === "GBP"
  );
  if (!gbpRates.length) {
    throw new Error("No GBP shipping rates available");
  }

  let selectedRate = gbpRates[0];
  if (input.serviceLevelToken) {
    const match = gbpRates.find(
      (r) => r.servicelevel?.token === input.serviceLevelToken || r.objectId === input.serviceLevelToken
    );
    if (match) selectedRate = match;
  }

  const transaction = await client.transactions.create({
    rate: selectedRate.objectId,
    labelFileType: "PDF_4x6" as any,
    async: false,
    metadata: input.metadata || "",
  });

  if (transaction.status === "ERROR") {
    const msgs = transaction.messages?.map((m) => m.text).filter(Boolean).join("; ");
    throw new Error(`Shippo label creation failed: ${msgs || "Unknown error"}`);
  }

  return {
    provider: "shippo",
    labelId: transaction.objectId || selectedRate.objectId,
    labelUrl: transaction.labelUrl || "",
    trackingNumber: transaction.trackingNumber || "",
    serviceName: selectedRate.servicelevel?.name || "Shippo Shipping",
  };
}
