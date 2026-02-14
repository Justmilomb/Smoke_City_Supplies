type QuoteInput = {
  subtotalPence: number;
  postcode?: string;
  itemCount?: number;
};

export type ShippingQuote = {
  method: "free" | "standard" | "highlands-and-islands" | "heavy-order";
  amountPence: number;
  label: string;
  eta: string;
};

const UK_STANDARD_PENCE = 499;
const UK_HEAVY_PENCE = 799;
const UK_HIGHLANDS_PENCE = 899;
const FREE_SHIPPING_THRESHOLD_PENCE = 7500;
const HEAVY_ORDER_THRESHOLD_ITEM_COUNT = 5;

const highlandsPrefixes = [
  "AB", "DD", "FK", "GY", "HS", "IM", "IV", "JE", "KA27", "KA28", "KW", "PA20",
  "PA", "PH", "TR21", "TR22", "TR23", "TR24", "TR25", "ZE",
];

function normalizePostcode(postcode?: string): string {
  return (postcode ?? "").toUpperCase().replace(/\s+/g, "");
}

function isHighlandsAndIslands(postcode?: string): boolean {
  const normalized = normalizePostcode(postcode);
  if (!normalized) return false;
  return highlandsPrefixes.some((prefix) => normalized.startsWith(prefix));
}

export function calculateShippingQuote(input: QuoteInput): ShippingQuote {
  const subtotalPence = Math.max(0, Math.round(input.subtotalPence));
  const itemCount = Math.max(0, input.itemCount ?? 0);

  if (subtotalPence >= FREE_SHIPPING_THRESHOLD_PENCE) {
    return {
      method: "free",
      amountPence: 0,
      label: "Free UK Shipping",
      eta: "2-4 business days",
    };
  }

  if (isHighlandsAndIslands(input.postcode)) {
    return {
      method: "highlands-and-islands",
      amountPence: UK_HIGHLANDS_PENCE,
      label: "UK Remote Area Shipping",
      eta: "3-6 business days",
    };
  }

  if (itemCount >= HEAVY_ORDER_THRESHOLD_ITEM_COUNT) {
    return {
      method: "heavy-order",
      amountPence: UK_HEAVY_PENCE,
      label: "Heavy Order Shipping",
      eta: "2-4 business days",
    };
  }

  return {
    method: "standard",
    amountPence: UK_STANDARD_PENCE,
    label: "Standard UK Shipping",
    eta: "2-4 business days",
  };
}
