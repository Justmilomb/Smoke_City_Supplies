import React from "react";
import { Link } from "wouter";
import { Minus, Plus, ShoppingBag, Trash2, Lock } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";
import BackButton from "@/components/site/BackButton";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { usePageMeta } from "@/hooks/use-page-meta";

const API_BASE = "/api";

export default function CartPage() {
  const { state, actions } = useCart();
  usePageMeta({
    title: "Cart",
    description: "Review your selected parts before secure checkout.",
    canonical: "/cart",
    noIndex: true,
  });

  const total = state.items.reduce(
    (sum, i) => sum + i.priceEach * i.quantity,
    0
  );

  const handleCheckout = () => {
    if (state.items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    window.location.href = "/checkout";
  };

  if (state.items.length === 0) {
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

  return (
    <SiteLayout>
      <div className="flex flex-col gap-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Shopping Cart
            </h1>
            <p className="mt-2 text-muted-foreground">
              Review your items and proceed to checkout
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
                        {item.stockQuantity != null && (
                          <span className="text-xs text-muted-foreground">/{item.stockQuantity}</span>
                        )}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => {
                          const maxStock = item.stockQuantity ?? Infinity;
                          if (item.quantity >= maxStock) {
                            toast.error(`Only ${maxStock} available`);
                            return;
                          }
                          actions.updateQuantity(item.productId, item.quantity + 1);
                        }}
                        disabled={item.stockQuantity != null && item.quantity >= item.stockQuantity}
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
                <span className="font-medium">Calculated at checkout</span>
              </div>
              <div className="border-t pt-4 flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold tabular-nums">
                  £{total.toFixed(2)}
                </span>
              </div>
            </div>
            <Button
              className="w-full h-12 text-base bg-primary hover:bg-primary/90"
              size="lg"
              onClick={handleCheckout}
              disabled={state.items.length === 0}
            >
              <Lock className="mr-2 h-4 w-4 shrink-0" aria-hidden />
              Secure Checkout
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Payment secured by Stripe
            </p>
            <Link href="/store">
              <Button variant="outline" className="mt-3 w-full" asChild>
                <a>Continue Shopping</a>
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </SiteLayout>
  );
}
