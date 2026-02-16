import type { ApiOrder, ApiProduct, ShippingRatesQuoteInput } from "@shared/schema";
import type { ShippingParcel } from "./shipping/sendcloud";

const LONDON_TIMEZONE = "Europe/London";
const CUTOFF_HOUR_24 = 18;

export function buildParcelsForItems(
  productsById: Map<string, ApiProduct>,
  items: ShippingRatesQuoteInput["items"]
): ShippingParcel[] {
  const parcels: ShippingParcel[] = [];
  for (const item of items) {
    const product = productsById.get(item.productId);
    for (let i = 0; i < item.quantity; i += 1) {
      parcels.push({
        weightGrams: Math.max(1, product?.shippingWeightGrams ?? 1000),
        lengthCm: Math.max(1, product?.shippingLengthCm ?? 20),
        widthCm: Math.max(1, product?.shippingWidthCm ?? 15),
        heightCm: Math.max(1, product?.shippingHeightCm ?? 10),
      });
    }
  }
  return parcels.length ? parcels : [{ weightGrams: 1000, lengthCm: 20, widthCm: 15, heightCm: 10 }];
}

function getLondonDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_TIMEZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value || "";
  const weekday = get("weekday");
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  return { weekday, year, month, day, hour, minute };
}

function nextBusinessDateString(date = new Date()): string {
  const parts = getLondonDateParts(date);
  let jsDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
  while (true) {
    jsDate = new Date(jsDate.getTime() + 24 * 60 * 60 * 1000);
    const weekday = new Intl.DateTimeFormat("en-GB", {
      timeZone: LONDON_TIMEZONE,
      weekday: "short",
    }).format(jsDate);
    if (weekday !== "Sat" && weekday !== "Sun") {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: LONDON_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(jsDate);
    }
  }
}

export function dispatchAdviceNow(date = new Date()): { dispatchAdvice: string; cutoffLocal: string; expectedShipDate: string } {
  const now = getLondonDateParts(date);
  const isWeekend = now.weekday === "Sat" || now.weekday === "Sun";
  const afterCutoff = now.hour > CUTOFF_HOUR_24 || (now.hour === CUTOFF_HOUR_24 && now.minute > 0);
  const expectedShipDate = isWeekend || afterCutoff ? nextBusinessDateString(date) : new Intl.DateTimeFormat("en-CA", {
    timeZone: LONDON_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  const dispatchAdvice =
    isWeekend
      ? "Orders placed on weekends dispatch on the next business day."
      : afterCutoff
        ? "Orders placed after 6:00 PM UK time dispatch next business day (no next-day delivery guarantee)."
        : "Orders placed before 6:00 PM UK time can qualify for next-day delivery.";

  return {
    dispatchAdvice,
    cutoffLocal: "18:00 Europe/London",
    expectedShipDate,
  };
}

export function buildPackingSlipHtml(order: ApiOrder): string {
  const address = [order.addressLine1, order.addressLine2, order.city, order.county, order.postcode, order.country]
    .filter(Boolean)
    .join(", ");
  const itemRows = order.items
    .map((item) => `<tr><td style="padding:8px;border-bottom:1px solid #ddd">${item.productName}</td><td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">${item.quantity}</td></tr>`)
    .join("");
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#111">
<h1 style="margin:0 0 8px">Packing Slip</h1>
<p style="margin:0 0 12px"><strong>Order:</strong> ${order.id}<br/><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString("en-GB")}<br/><strong>Customer:</strong> ${order.customerName || "Customer"}</p>
<p style="margin:0 0 12px"><strong>Ship To:</strong> ${address || "-"}</p>
<table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:8px;border-bottom:2px solid #aaa">Item</th><th style="text-align:right;padding:8px;border-bottom:2px solid #aaa">Qty</th></tr></thead><tbody>${itemRows}</tbody></table>
</body></html>`;
}
