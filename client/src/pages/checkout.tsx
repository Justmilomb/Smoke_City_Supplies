import React, { useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Lock, ArrowLeft, CreditCard } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";
import BackButton from "@/components/site/BackButton";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePageMeta } from "@/hooks/use-page-meta";
import { toast } from "sonner";

const API_BASE = "/api";
const PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

const cardElementOptions = {
  style: {
    base: {
      fontSize: "16px",
      color: "hsl(var(--foreground))",
      "::placeholder": { color: "hsl(var(--muted-foreground))" },
      iconColor: "hsl(var(--foreground))",
    },
    invalid: {
      color: "hsl(var(--destructive))",
    },
  },
};

function CheckoutForm({
  clientSecret,
  paymentIntentId,
  onSuccess,
}: {
  clientSecret: string;
  paymentIntentId: string;
  onSuccess: (orderId: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!stripe || !elements) return;
      const card = elements.getElement(CardElement);
      if (!card) return;
      setPaying(true);
      try {
        const { error } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: { card },
        });
        if (error) {
          toast.error(error.message ?? "Payment failed");
          setPaying(false);
          return;
        }
        const res = await fetch(`${API_BASE}/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentIntentId }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast.error(data.message ?? "Could not create order");
          setPaying(false);
          return;
        }
        const order = await res.json();
        onSuccess(order.id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Payment failed");
      } finally {
        setPaying(false);
      }
    },
    [stripe, elements, clientSecret, paymentIntentId, onSuccess]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-4">
        <Label className="flex items-center gap-2 mb-3 text-sm font-medium">
          <CreditCard className="h-4 w-4" />
          Card details
        </Label>
        <div className="rounded-md border border-input bg-background px-3 py-2.5 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
          <CardElement
            options={cardElementOptions}
            onChange={(e) => setCardComplete(e.complete)}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Payment is secure and powered by Stripe. Your card details are not stored.
        </p>
      </div>
      <Button
        type="submit"
        className="w-full h-12 text-base"
        size="lg"
        disabled={!stripe || !cardComplete || paying}
      >
        <Lock className="mr-2 h-4 w-4 shrink-0" aria-hidden />
        {paying ? "Processing…" : "Pay now"}
      </Button>
    </form>
  );
}

export default function CheckoutPage() {
  const { state, actions } = useCart();
  const [, setLocation] = useLocation();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState<"details" | "payment">("details");

  usePageMeta({
    title: "Checkout",
    description: "Secure checkout at Smoke City Supplies.",
  });

  const total = state.items.reduce((sum, i) => sum + i.priceEach * i.quantity, 0);

  const createPaymentIntent = useCallback(async () => {
    if (state.items.length === 0 || creating || clientSecret) return;
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/create-payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: state.items.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
            priceEach: i.priceEach,
          })),
          customerEmail: email.trim() || undefined,
          customerName: name.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Could not start payment");
      }
      const data = await res.json();
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
      setStep("payment");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setCreating(false);
    }
  }, [state.items, email, name, creating, clientSecret]);

  const handleSuccess = useCallback(
    (orderId: string) => {
      actions.clear();
      setLocation(`/checkout/success?order_id=${orderId}`);
    },
    [actions, setLocation]
  );

  if (state.items.length === 0 && !clientSecret) {
    return (
      <SiteLayout>
        <Card className="border-border/50 p-16 text-center">
          <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-6">
            Add items to your cart to checkout.
          </p>
          <Link href="/store">
            <Button size="lg" asChild>
              <a>Browse parts</a>
            </Button>
          </Link>
        </Card>
      </SiteLayout>
    );
  }

  const stripePromise = PUBLISHABLE_KEY ? loadStripe(PUBLISHABLE_KEY) : null;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl">
        <BackButton fallback="/cart" />
        <h1 className="text-3xl font-bold tracking-tight mt-4 mb-2">Checkout</h1>
        <p className="text-muted-foreground mb-8">
          Complete your order securely. Payment is processed on this site.
        </p>

        <div className="grid gap-8 md:grid-cols-[1fr,340px]">
          <div className="space-y-6">
            {step === "details" && (
              <>
                <Card className="border-border/50 p-6">
                  <h2 className="text-lg font-semibold mb-4">Contact (optional)</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="checkout-name">Name</Label>
                      <Input
                        id="checkout-name"
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkout-email">Email</Label>
                      <Input
                        id="checkout-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="rounded-lg"
                      />
                    </div>
                  </div>
                </Card>
                <Button
                  size="lg"
                  className="w-full h-12 text-base"
                  onClick={createPaymentIntent}
                  disabled={creating || state.items.length === 0}
                >
                  {creating ? "Preparing…" : "Continue to payment"}
                </Button>
              </>
            )}

            {step === "payment" && clientSecret && paymentIntentId && stripePromise ? (
              <Card className="border-border/50 p-6">
                <h2 className="text-lg font-semibold mb-4">Payment</h2>
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: "stripe",
                      variables: {
                        colorPrimary: "hsl(var(--primary))",
                        colorBackground: "hsl(var(--background))",
                        colorText: "hsl(var(--foreground))",
                        colorDanger: "hsl(var(--destructive))",
                        borderRadius: "0.5rem",
                      },
                    },
                  }}
                >
                  <CheckoutForm
                    clientSecret={clientSecret}
                    paymentIntentId={paymentIntentId}
                    onSuccess={handleSuccess}
                  />
                </Elements>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full mt-3"
                  onClick={() => setStep("details")}
                >
                  Back
                </Button>
              </Card>
            ) : step === "payment" && !PUBLISHABLE_KEY ? (
              <Card className="border-border/50 p-6">
                <p className="text-muted-foreground">
                  Payment is not configured. Please set VITE_STRIPE_PUBLISHABLE_KEY.
                </p>
              </Card>
            ) : null}
          </div>

          <Card className="border-border/50 p-6 h-fit">
            <h2 className="text-lg font-semibold mb-4">Order summary</h2>
            <ul className="space-y-3 mb-4">
              {state.items.map((item) => (
                <li key={item.productId} className="flex justify-between text-sm">
                  <span className="text-muted-foreground truncate max-w-[180px]">
                    {item.productName} × {item.quantity}
                  </span>
                  <span className="font-medium tabular-nums shrink-0">
                    £{(item.priceEach * item.quantity).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="border-t pt-4 flex justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold tabular-nums">
                £{total.toFixed(2)}
              </span>
            </div>
            <Link href="/cart">
              <Button variant="outline" className="w-full mt-4 gap-2" asChild>
                <a>
                  <ArrowLeft className="h-4 w-4" />
                  Edit cart
                </a>
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </SiteLayout>
  );
}
