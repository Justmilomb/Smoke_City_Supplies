import { loadStripe, Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

export async function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    // Fetch publishable key from server
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
