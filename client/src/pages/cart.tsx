import React, { useState } from "react";
import { Link } from "wouter";
import { Minus, Plus, ShoppingBag, Trash2, CheckCircle2, CreditCard } from "lucide-react";
import { Elements } from "@stripe/react-stripe-js";
import SiteLayout from "@/components/site/SiteLayout";
import BackButton from "@/components/site/BackButton";
import { useCart } from "@/lib/cart";
import { getStripe, prepareCheckout } from "@/lib/stripe";
import { StripeCheckoutForm } from "@/components/site/StripeCheckout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { usePageMeta } from "@/hooks/use-page-meta";

export default function CartPage() {
  usePageMeta({ title: "Shopping Cart", description: "Your shopping cart at Smoke City Supplies.", noindex: true });
  const { state, actions } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [county, setCounty] = useState("");
  const [postcode, setPostcode] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [preparedOrderId, setPreparedOrderId] = useState<string | null>(null);
  const [stripePromise] = useState(() => getStripe());

  const total = state.items.reduce(
    (sum, i) => sum + i.priceEach * i.quantity,
    0
  );

  const handleInitiateCheckout = async () => {
    if (state.items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    if (!email || !name || !addressLine1 || !city || !postcode) {
      toast.error("Please fill in all required fields");
      return;
    }

    setPlacingOrder(true);
    try {
      const { clientSecret: secret, orderId } = await prepareCheckout({
        items: state.items,
        customerEmail: email,
        customerName: name,
        addressLine1,
        addressLine2,
        city,
        county,
        postcode,
        country: "GB",
      });
      setClientSecret(secret);
      setPreparedOrderId(orderId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to initialize payment");
      setPlacingOrder(false);
    }
  };

  const handlePaymentSuccess = async () => {
    try {
      setOrderId(preparedOrderId);
      actions.clear();
      setOrderPlaced(true);
      setCheckoutOpen(false);
      toast.success("Payment successful! Your order is being confirmed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout completion failed");
    } finally {
      setPlacingOrder(false);
    }
  };

  const handlePaymentError = (error: string) => {
    toast.error(error);
    setPlacingOrder(false);
  };

  if (state.items.length === 0 && !orderPlaced) {
    return (
      <SiteLayout>
        <Card className="border-border/50 p-16 text-center">
          <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-6">
            Start shopping to add items to your cart
          </p>
          <Link href="/store">
            <Button size="lg" asChild>
              <a>Browse Products</a>
            </Button>
          </Link>
        </Card>
      </SiteLayout>
    );
  }

  if (orderPlaced) {
    return (
      <SiteLayout>
        <Card className="border-border/50 p-12 text-center max-w-2xl mx-auto">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-2 text-emerald-600 dark:text-emerald-400">
            Payment Successful!
          </h2>
          {orderId && (
            <p className="text-muted-foreground mb-4">
              Order ID: <span className="font-mono font-semibold">{orderId}</span>
            </p>
          )}
          <p className="text-muted-foreground mb-2">
            Thank you for your order, {name}!
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            We will email your invoice and payment confirmation to {email}. Your items will be dispatched shortly to {city}, {postcode}.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/store">
              <Button variant="outline" size="lg" asChild>
                <a>Continue Shopping</a>
              </Button>
            </Link>
            <Link href="/">
              <Button size="lg" asChild>
                <a>Back to Home</a>
              </Button>
            </Link>
          </div>
        </Card>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="flex flex-col gap-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Shopping Cart
            </h1>
            <p className="mt-2 text-muted-foreground">
              Review your items and proceed to secure checkout
            </p>
          </div>
          <BackButton fallback="/store" />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {state.items.map((item) => (
              <Card key={item.productId} className="border-border/50 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-start gap-4">
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted/50">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.productName}
                          className="h-full w-full object-contain p-2"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/product/${item.productId}`}>
                        <a className="font-semibold hover:text-primary transition-colors block mb-1">
                          {item.productName}
                        </a>
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        £{item.priceEach.toFixed(2)} each
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() =>
                          actions.updateQuantity(
                            item.productId,
                            Math.max(1, item.quantity - 1)
                          )
                        }
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="min-w-[2.5rem] text-center text-sm font-medium tabular-nums">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() =>
                          actions.updateQuantity(item.productId, item.quantity + 1)
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Subtotal</div>
                        <div className="text-lg font-bold tabular-nums">
                          £{(item.priceEach * item.quantity).toFixed(2)}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                        onClick={() => actions.remove(item.productId)}
                        aria-label="Remove from cart"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="border-border/50 p-6 h-fit lg:sticky lg:top-20">
            <h2 className="mb-6 text-lg font-semibold">Order Summary</h2>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Subtotal ({state.items.reduce((s, i) => s + i.quantity, 0)} {state.items.reduce((s, i) => s + i.quantity, 0) === 1 ? "item" : "items"})
                </span>
                <span className="font-medium tabular-nums">
                  £{total.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping (UK)</span>
                <span className="font-medium text-emerald-600">FREE</span>
              </div>
              <div className="border-t pt-4 flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold tabular-nums">
                  £{total.toFixed(2)}
                </span>
              </div>
            </div>
            <Button
              className="w-full h-12 text-base gap-2"
              size="lg"
              onClick={() => setCheckoutOpen(true)}
            >
              <CreditCard className="h-5 w-5" />
              Secure Checkout
            </Button>
            <Link href="/store">
              <Button variant="outline" className="mt-3 w-full" asChild>
                <a>Continue Shopping</a>
              </Button>
            </Link>
          </Card>
        </div>
      </div>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Secure Checkout</DialogTitle>
            <DialogDescription>
              Complete your delivery details and payment information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {!clientSecret ? (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="checkout-name">Full name *</Label>
                    <Input
                      id="checkout-name"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="rounded-lg"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="checkout-email">Email *</Label>
                    <Input
                      id="checkout-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="rounded-lg"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkout-address1">Address line 1 *</Label>
                  <Input
                    id="checkout-address1"
                    placeholder="House number and street"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    className="rounded-lg"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkout-address2">Address line 2 (optional)</Label>
                  <Input
                    id="checkout-address2"
                    placeholder="Flat, building, etc."
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    className="rounded-lg"
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="checkout-city">City *</Label>
                    <Input
                      id="checkout-city"
                      placeholder="City"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="rounded-lg"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="checkout-county">County</Label>
                    <Input
                      id="checkout-county"
                      placeholder="County"
                      value={county}
                      onChange={(e) => setCounty(e.target.value)}
                      className="rounded-lg"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkout-postcode">Postcode *</Label>
                  <Input
                    id="checkout-postcode"
                    placeholder="e.g. M1 1AA"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                    className="rounded-lg max-w-[140px]"
                    required
                  />
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Order total</span>
                    <span className="font-semibold">£{total.toFixed(2)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <StripeCheckoutForm
                    amount={total}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                  />
                </Elements>
              </div>
            )}
          </div>
          {!clientSecret && (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCheckoutOpen(false)}
                className="rounded-lg"
              >
                Cancel
              </Button>
              <Button
                className="rounded-lg gap-2"
                onClick={handleInitiateCheckout}
                disabled={state.items.length === 0 || placingOrder}
              >
                <CreditCard className="h-4 w-4" />
                {placingOrder ? "Initializing…" : "Continue to Payment"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}
