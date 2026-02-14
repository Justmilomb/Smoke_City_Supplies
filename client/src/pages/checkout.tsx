import React, { useState, useCallback, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Lock, ArrowLeft, CreditCard, User, Mail, MapPin } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";
import BackButton from "@/components/site/BackButton";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePageMeta } from "@/hooks/use-page-meta";
import { toast } from "sonner";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const API_BASE = "/api";
const PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const IS_STRIPE_TEST_MODE = Boolean(PUBLISHABLE_KEY?.startsWith("pk_test_"));

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
          const message =
            error.code === "card_declined" && IS_STRIPE_TEST_MODE
              ? "In test mode use card 4242 4242 4242 4242 — real cards are declined."
              : error.message ?? "Payment failed";
          toast.error(message);
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
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="rounded-xl border border-border bg-card p-6">
        <Label className="flex items-center gap-2 mb-4 text-sm font-medium">
          <CreditCard className="h-4 w-4" />
          Card details
        </Label>
        <div className="rounded-lg border border-input bg-background px-3 py-3 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 min-h-[44px] [&_.StripeElement]:min-h-[24px] [&_.StripeElement]:block">
          <CardElement
            options={cardElementOptions}
            onChange={(e) => setCardComplete(e.complete)}
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Payment is secure and powered by Stripe. Your card details are not stored.
        </p>
        {IS_STRIPE_TEST_MODE && (
          <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium">Test mode</p>
            <p className="mt-1 text-xs opacity-90">
              Use test card <strong className="font-mono">4242 4242 4242 4242</strong>, any future expiry (e.g. 12/34), any 3-digit CVC, and any postcode. Real cards will be declined.
            </p>
          </div>
        )}
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
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [postcode, setPostcode] = useState("");
  const [shippingPence, setShippingPence] = useState(0);
  const [shippingLabel, setShippingLabel] = useState("Estimated UK Shipping");
  const [shippingEta, setShippingEta] = useState("");
  const [step, setStep] = useState<"details" | "payment">("details");

  usePageMeta({
    title: "Checkout",
    description: "Secure checkout at Smoke City Supplies.",
    canonical: "/checkout",
    noIndex: true,
  });

  const subtotal = state.items.reduce((sum, i) => sum + i.priceEach * i.quantity, 0);
  const total = subtotal + shippingPence / 100;

  const detailsValid =
    name.trim().length > 0 &&
    emailRegex.test(email.trim()) &&
    addressLine1.trim().length > 0 &&
    postcode.trim().length > 0;

  const createPaymentIntent = useCallback(async () => {
    if (state.items.length === 0 || creating || clientSecret || !detailsValid) return;
    setCreating(true);
    const customerAddress = [addressLine1.trim(), addressLine2.trim()].filter(Boolean).join(", ");
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
          customerEmail: email.trim(),
          customerName: name.trim(),
          customerAddress: customerAddress || undefined,
          customerPostcode: postcode.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Could not start payment");
      }
      const data = await res.json();
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
      setShippingPence(typeof data.shippingPence === "number" ? data.shippingPence : 0);
      setShippingLabel(typeof data.shippingLabel === "string" ? data.shippingLabel : "Shipping");
      setStep("payment");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setCreating(false);
    }
  }, [state.items, email, name, addressLine1, addressLine2, postcode, creating, clientSecret, detailsValid]);

  useEffect(() => {
    if (state.items.length === 0) {
      setShippingPence(0);
      setShippingLabel("Estimated UK Shipping");
      setShippingEta("");
      return;
    }
    let cancelled = false;
    const fetchQuote = async () => {
      try {
        const res = await fetch(`${API_BASE}/shipping/quote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: state.items.map((i) => ({
              productId: i.productId,
              productName: i.productName,
              quantity: i.quantity,
              priceEach: i.priceEach,
            })),
            customerPostcode: postcode.trim() || undefined,
          }),
        });
        if (!res.ok || cancelled) return;
        const quote = await res.json();
        if (cancelled) return;
        setShippingPence(typeof quote.shippingPence === "number" ? quote.shippingPence : 0);
        setShippingLabel(typeof quote.shippingLabel === "string" ? quote.shippingLabel : "Shipping");
        setShippingEta(typeof quote.shippingEta === "string" ? quote.shippingEta : "");
      } catch {
        // Keep last successful quote.
      }
    };
    fetchQuote();
    return () => {
      cancelled = true;
    };
  }, [postcode, state.items]);

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

        <div className="grid gap-10 md:grid-cols-[1fr,360px]">
          <div className="space-y-8">
            {step === "details" && (
              <>
                <Card className="border-border/50 p-6 sm:p-8 rounded-xl shadow-sm">
                  <h2 className="text-xl font-semibold mb-6">Delivery & contact</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    We need these details to process and deliver your order.
                  </p>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="checkout-name" className="flex items-center gap-2 text-sm font-medium">
                        <User className="h-4 w-4" />
                        Full name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="checkout-name"
                        placeholder="e.g. John Smith"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="rounded-lg h-11"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="checkout-email" className="flex items-center gap-2 text-sm font-medium">
                        <Mail className="h-4 w-4" />
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="checkout-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="rounded-lg h-11"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="checkout-address" className="flex items-center gap-2 text-sm font-medium">
                        <MapPin className="h-4 w-4" />
                        Address <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="checkout-address"
                        placeholder="Street address, house number"
                        value={addressLine1}
                        onChange={(e) => setAddressLine1(e.target.value)}
                        className="rounded-lg h-11"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="checkout-address2" className="text-sm font-medium text-muted-foreground">
                        Address line 2 <span className="text-muted-foreground/70">(optional)</span>
                      </Label>
                      <Input
                        id="checkout-address2"
                        placeholder="Flat, building, etc."
                        value={addressLine2}
                        onChange={(e) => setAddressLine2(e.target.value)}
                        className="rounded-lg h-11"
                      />
                    </div>

                    <div className="space-y-2 max-w-[180px]">
                      <Label htmlFor="checkout-postcode" className="flex items-center gap-2 text-sm font-medium">
                        Postcode <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="checkout-postcode"
                        placeholder="e.g. SW1A 1AA"
                        value={postcode}
                        onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                        className="rounded-lg h-11"
                        required
                      />
                    </div>
                  </div>
                </Card>

                <Button
                  size="lg"
                  className="w-full h-12 text-base rounded-lg"
                  onClick={createPaymentIntent}
                  disabled={creating || state.items.length === 0 || !detailsValid}
                >
                  {creating ? "Preparing…" : "Continue to payment"}
                </Button>
              </>
            )}

            {step === "payment" && clientSecret && paymentIntentId && stripePromise ? (
              <Card className="border-border/50 p-6 sm:p-8 rounded-xl shadow-sm">
                <h2 className="text-xl font-semibold mb-6">Payment</h2>
                <Elements
                  stripe={stripePromise}
                  options={{
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
                  className="w-full mt-6 rounded-lg"
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

          <Card className="border-border/50 p-6 sm:p-8 h-fit rounded-xl shadow-sm">
            <h2 className="text-xl font-semibold mb-6">Order summary</h2>
            <ul className="space-y-4 mb-6">
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
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium tabular-nums">£{subtotal.toFixed(2)}</span>
            </div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-muted-foreground">{shippingLabel}</span>
              <span className="font-medium tabular-nums">£{(shippingPence / 100).toFixed(2)}</span>
            </div>
            {shippingEta ? <p className="mb-4 text-xs text-muted-foreground">{shippingEta}</p> : null}
            <div className="border-t border-border pt-5 flex justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold tabular-nums">
                £{total.toFixed(2)}
              </span>
            </div>
            <Link href="/cart">
              <Button variant="outline" className="w-full mt-6 gap-2 rounded-lg" asChild>
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
