import React, { useState } from "react";
import { Link } from "wouter";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";
import { useCart } from "@/lib/cart";
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

const API_BASE = "/api";

export default function CartPage() {
  const { state, actions } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const total = state.items.reduce(
    (sum, i) => sum + i.priceEach * i.quantity,
    0
  );

  const handleCheckout = async () => {
    if (state.items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    setPlacingOrder(true);
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: state.items.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
            priceEach: i.priceEach,
          })),
          customerEmail: email || undefined,
          customerName: name || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Checkout failed");
      }
      const order = await res.json();
      setOrderId(order.id);
      actions.clear();
      setOrderPlaced(true);
      setCheckoutOpen(false);
      toast.success("Order placed successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (state.items.length === 0 && !orderPlaced) {
    return (
      <SiteLayout>
        <Card className="rounded-2xl border border-border/60 bg-card p-12 text-center shadow-sm">
          <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 font-[var(--font-serif)] text-xl font-semibold">
            Your cart is empty
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add parts from the catalog to get started.
          </p>
          <Link href="/catalog">
            <Button className="mt-6 rounded-2xl" asChild>
              <a>Shop parts</a>
            </Button>
          </Link>
        </Card>
      </SiteLayout>
    );
  }

  if (orderPlaced) {
    return (
      <SiteLayout>
        <Card className="rounded-2xl border border-border/60 bg-card p-8 text-center shadow-sm">
          <h2 className="font-[var(--font-serif)] text-2xl font-semibold text-emerald-600">
            Order confirmed
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {orderId && (
              <>Order ID: <span className="font-mono">{orderId}</span></>
            )}
          </p>
          <p className="mt-4 text-muted-foreground">
            Thank you for your order. We&apos;ll get it shipped soon.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/catalog">
              <Button variant="secondary" className="rounded-2xl" asChild>
                <a>Continue shopping</a>
              </Button>
            </Link>
            <Link href="/">
              <Button className="rounded-2xl" asChild>
                <a>Back to home</a>
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
        <h1 className="font-[var(--font-serif)] text-3xl font-semibold tracking-tight">
          Your cart
        </h1>

        <div className="grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            {state.items.map((item) => (
              <Card
                key={item.productId}
                className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6"
              >
                <div className="flex flex-1 items-start gap-4 sm:min-w-0">
                  <div className="h-20 w-20 shrink-0 rounded-xl bg-muted/50 overflow-hidden sm:h-16 sm:w-16">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt=""
                        className="h-full w-full object-contain p-2"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
                        —
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/product/${item.productId}`}>
                      <a className="font-medium hover:underline block">
                        {item.productName}
                      </a>
                    </Link>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      ${item.priceEach.toFixed(2)} each
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-4 sm:border-0 sm:pt-0 sm:justify-end">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 rounded-xl shrink-0"
                      onClick={() =>
                        actions.updateQuantity(
                          item.productId,
                          Math.max(1, item.quantity - 1)
                        )
                      }
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="min-w-[2.5rem] text-center text-sm tabular-nums font-medium">
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 rounded-xl shrink-0"
                      onClick={() =>
                        actions.updateQuantity(item.productId, item.quantity + 1)
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold tabular-nums">
                      ${(item.priceEach * item.quantity).toFixed(2)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 rounded-xl text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => actions.remove(item.productId)}
                      aria-label="Remove from cart"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm h-fit">
            <div className="text-base font-semibold">Summary</div>
            <div className="mt-5 flex justify-between text-sm text-muted-foreground">
              <span>Subtotal ({state.items.reduce((s, i) => s + i.quantity, 0)} items)</span>
              <span className="tabular-nums font-medium text-foreground">
                ${total.toFixed(2)}
              </span>
            </div>
            <div className="mt-4 pt-4 border-t border-border/60 flex justify-between font-semibold text-base">
              <span>Total</span>
              <span className="tabular-nums">${total.toFixed(2)}</span>
            </div>
            <Button
              className="mt-6 w-full h-12 rounded-2xl"
              onClick={() => setCheckoutOpen(true)}
            >
              Checkout
            </Button>
            <Link href="/catalog">
              <Button variant="secondary" className="mt-4 w-full h-11 rounded-2xl" asChild>
                <a>Continue shopping</a>
              </Button>
            </Link>
          </Card>
        </div>
      </div>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
            <DialogDescription>
              Optional: add your email and name for order updates.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="checkout-email">Email</Label>
              <Input
                id="checkout-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="checkout-name">Name</Label>
              <Input
                id="checkout-name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Total: <span className="font-semibold text-foreground">${total.toFixed(2)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setCheckoutOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl"
              onClick={handleCheckout}
              disabled={state.items.length === 0 || placingOrder}
            >
              {placingOrder ? "Placing…" : "Place order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}
