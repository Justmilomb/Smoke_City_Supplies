import { Shippo } from "shippo";
import type { ShippingQuoteInput, ShippingQuote, ShippingParcel } from "./royalMailManual";

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

function buildAddressFrom() {
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

function buildAddressTo(input: ShippingQuoteInput) {
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

    const shipment = await client.shipments.create({
      addressFrom: buildAddressFrom(),
      addressTo: buildAddressTo(input),
      parcels: buildParcels(input.parcels),
      async: false,
    });

    if (!shipment.rates?.length) {
      console.warn("[shippo] No rates returned for shipment", shipment.objectId);
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
