import { loadStripe, Stripe } from "@stripe/stripe-js";
import type { CartItem } from "@/lib/cart";

let stripePromise: Promise<Stripe | null> | null = null;

export async function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const res = await fetch("/api/stripe/config");
    const { publishableKey } = await res.json();
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

export async function createPaymentIntent(amount: number, customerEmail?: string, customerName?: string) {
  const res = await fetch("/api/stripe/create-payment-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, customerEmail, customerName }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to initialize payment");
  }

  return res.json();
}

export async function prepareCheckout(input: {
  items: CartItem[];
  customerEmail: string;
  customerName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  county?: string;
  postcode: string;
  country?: string;
}) {
  const res = await fetch("/api/checkout/prepare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: input.items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        priceEach: i.priceEach,
      })),
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2 || undefined,
      city: input.city,
      county: input.county || undefined,
      postcode: input.postcode,
      country: input.country || "GB",
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to prepare checkout");
  }

  return res.json() as Promise<{ orderId: string; clientSecret: string; paymentIntentId: string }>;
}
