export type ShippoLabelResult = {
  labelId: string;
  labelUrl: string;
  trackingNumber: string;
  provider: "shippo";
};

export type ShippoRate = {
  rateId: string;
  provider: "shippo";
  carrier: string;
  serviceName: string;
  serviceToken: string;
  amountPence: number;
  currency: string;
  estimatedDays?: number;
};

export type ShippoParcel = {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightGrams: number;
};

type ShippoAddress = {
  name: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
};

function getShippoApiKey(): string {
  const key = process.env.SHIPPO_API_KEY;
  if (!key) {
    throw new Error("SHIPPO_API_KEY is not configured");
  }
  return key;
}

function defaultParcel(): ShippoParcel {
  return { lengthCm: 20, widthCm: 15, heightCm: 10, weightGrams: 1000 };
}

function normalizeParcels(parcels: ShippoParcel[]): ShippoParcel[] {
  if (!parcels.length) return [defaultParcel()];
  return parcels.map((p) => ({
    lengthCm: Math.max(1, Math.round(p.lengthCm || defaultParcel().lengthCm)),
    widthCm: Math.max(1, Math.round(p.widthCm || defaultParcel().widthCm)),
    heightCm: Math.max(1, Math.round(p.heightCm || defaultParcel().heightCm)),
    weightGrams: Math.max(1, Math.round(p.weightGrams || defaultParcel().weightGrams)),
  }));
}

function buildFromAddress() {
  return {
    name: process.env.SHIP_FROM_NAME || "Smoke City Supplies",
    street1: process.env.SHIP_FROM_ADDRESS_LINE1 || "Warehouse Address",
    city: process.env.SHIP_FROM_CITY || "Manchester",
    zip: process.env.SHIP_FROM_POSTCODE || "M1 1AA",
    country: process.env.SHIP_FROM_COUNTRY || "GB",
    email: process.env.INVOICE_FROM_EMAIL || "support@smokecitysupplies.com",
  };
}

function buildToAddress(input: ShippoAddress) {
  return {
    name: input.name,
    street1: input.addressLine1,
    street2: input.addressLine2 || "",
    city: input.city,
    state: input.county || "",
    zip: input.postcode,
    country: input.country || "GB",
    email: input.email || "",
  };
}

async function createShippoShipment(input: ShippoAddress & { parcels: ShippoParcel[] }) {
  const shipmentRes = await fetch("https://api.goshippo.com/shipments/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `ShippoToken ${getShippoApiKey()}`,
    },
    body: JSON.stringify({
      address_from: buildFromAddress(),
      address_to: buildToAddress(input),
      parcels: normalizeParcels(input.parcels).map((parcel) => ({
        length: String(parcel.lengthCm),
        width: String(parcel.widthCm),
        height: String(parcel.heightCm),
        distance_unit: "cm",
        weight: String((parcel.weightGrams / 1000).toFixed(3)),
        mass_unit: "kg",
      })),
      async: false,
    }),
  });

  if (!shipmentRes.ok) {
    const body = await shipmentRes.text().catch(() => "");
    throw new Error(`Shippo shipment failed (${shipmentRes.status}): ${body || "unknown"}`);
  }

  return (await shipmentRes.json()) as any;
}

function normalizeRate(rate: any): ShippoRate | null {
  if (!rate?.object_id) return null;
  const amount = Number(rate.amount);
  if (!Number.isFinite(amount) || amount < 0) return null;
  const estimatedDays = Number(rate?.estimated_days);
  return {
    rateId: String(rate.object_id),
    provider: "shippo",
    carrier: String(rate.provider || rate.carrier_account || "carrier"),
    serviceName: String(rate.servicelevel?.name || "Shipping"),
    serviceToken: String(rate.servicelevel?.token || ""),
    amountPence: Math.round(amount * 100),
    currency: String(rate.currency || "GBP"),
    estimatedDays: Number.isFinite(estimatedDays) && estimatedDays > 0 ? estimatedDays : undefined,
  };
}

export async function quoteShippoRates(input: ShippoAddress & { parcels: ShippoParcel[] }): Promise<ShippoRate[]> {
  const shipment = await createShippoShipment(input);
  const rates: unknown[] = Array.isArray(shipment?.rates) ? shipment.rates : [];
  const normalized: Array<ShippoRate | null> = rates.map((rate) => normalizeRate(rate));
  return normalized
    .filter((r: ShippoRate | null): r is ShippoRate => Boolean(r))
    .sort((a: ShippoRate, b: ShippoRate) => a.amountPence - b.amountPence);
}

export async function createShippoLabel(input: {
  name: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
  parcels?: ShippoParcel[];
  preferredRateId?: string;
}): Promise<ShippoLabelResult> {
  const shipment = await createShippoShipment({
    ...input,
    parcels: input.parcels ?? [defaultParcel()],
  });
  const rateList = Array.isArray(shipment?.rates) ? shipment.rates : [];
  const selectedRate =
    rateList.find((r: any) => String(r?.object_id) === input.preferredRateId) ?? rateList[0];
  if (!selectedRate?.object_id) {
    throw new Error("Shippo returned no available rates");
  }

  const txnRes = await fetch("https://api.goshippo.com/transactions/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `ShippoToken ${getShippoApiKey()}`,
    },
    body: JSON.stringify({
      rate: selectedRate.object_id,
      label_file_type: "PDF",
      async: false,
    }),
  });

  if (!txnRes.ok) {
    const body = await txnRes.text().catch(() => "");
    throw new Error(`Shippo label purchase failed (${txnRes.status}): ${body || "unknown"}`);
  }

  const txn = (await txnRes.json()) as any;
  if (txn.status !== "SUCCESS") {
    throw new Error(txn.messages?.[0]?.text || "Shippo label transaction did not succeed");
  }

  return {
    labelId: String(txn.object_id),
    labelUrl: String(txn.label_url),
    trackingNumber: String(txn.tracking_number || ""),
    provider: "shippo",
  };
}
