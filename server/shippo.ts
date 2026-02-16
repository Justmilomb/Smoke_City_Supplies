export type ShippoLabelResult = {
  labelId: string;
  labelUrl: string;
  trackingNumber: string;
  provider: "shippo";
};

export async function createShippoLabel(input: {
  name: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
}): Promise<ShippoLabelResult> {
  const apiKey = process.env.SHIPPO_API_KEY;
  if (!apiKey) {
    throw new Error("SHIPPO_API_KEY is not configured");
  }

  const fromAddress = {
    name: process.env.SHIP_FROM_NAME || "Smoke City Supplies",
    street1: process.env.SHIP_FROM_ADDRESS_LINE1 || "Warehouse Address",
    city: process.env.SHIP_FROM_CITY || "Manchester",
    zip: process.env.SHIP_FROM_POSTCODE || "M1 1AA",
    country: process.env.SHIP_FROM_COUNTRY || "GB",
    email: process.env.INVOICE_FROM_EMAIL || "support@smokecitysupplies.com",
  };

  const toAddress = {
    name: input.name,
    street1: input.addressLine1,
    street2: input.addressLine2 || "",
    city: input.city,
    state: input.county || "",
    zip: input.postcode,
    country: input.country || "GB",
    email: input.email || "",
  };

  const shipmentRes = await fetch("https://api.goshippo.com/shipments/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `ShippoToken ${apiKey}`,
    },
    body: JSON.stringify({
      address_from: fromAddress,
      address_to: toAddress,
      parcels: [
        {
          length: "20",
          width: "15",
          height: "10",
          distance_unit: "cm",
          weight: "1",
          mass_unit: "kg",
        },
      ],
      async: false,
    }),
  });

  if (!shipmentRes.ok) {
    const body = await shipmentRes.text().catch(() => "");
    throw new Error(`Shippo shipment failed (${shipmentRes.status}): ${body || "unknown"}`);
  }

  const shipment = (await shipmentRes.json()) as any;
  const rate = shipment?.rates?.[0];
  if (!rate?.object_id) {
    throw new Error("Shippo returned no available rates");
  }

  const txnRes = await fetch("https://api.goshippo.com/transactions/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `ShippoToken ${apiKey}`,
    },
    body: JSON.stringify({
      rate: rate.object_id,
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
