import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { CheckCircle2 } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePageMeta } from "@/hooks/use-page-meta";
import { toast } from "sonner";

const API_BASE = "/api";

export default function CheckoutSuccessPage() {
  const { actions } = useCart();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  usePageMeta({
    title: "Order Confirmed",
    description: "Thank you for your order at Smoke City Supplies.",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) {
      setError("Missing session. If you just paid, your order may still be processing.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        if (cancelled) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.message ?? "Could not create order");
          setLoading(false);
          return;
        }
        const order = await res.json();
        setOrderId(order.id);
        actions.clear();
        toast.success("Order confirmed!");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Something went wrong");
          toast.error("Could not confirm order");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Run once on mount when session_id is present
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <SiteLayout>
        <Card className="border-border/50 p-12 text-center max-w-2xl mx-auto">
          <p className="text-muted-foreground">Confirming your order…</p>
        </Card>
      </SiteLayout>
    );
  }

  if (error) {
    return (
      <SiteLayout>
        <Card className="border-border/50 p-12 text-center max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold mb-2">Order confirmation issue</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/cart">
              <Button variant="outline" asChild>
                <a>Back to Cart</a>
              </Button>
            </Link>
            <Link href="/store">
              <Button asChild>
                <a>Continue Shopping</a>
              </Button>
            </Link>
          </div>
        </Card>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <Card className="border-border/50 p-12 text-center max-w-2xl mx-auto">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
        </div>
        <h2 className="text-3xl font-bold mb-2 text-emerald-600">
          Order Confirmed!
        </h2>
        {orderId && (
          <p className="text-muted-foreground mb-4">
            Order ID: <span className="font-mono font-semibold">{orderId}</span>
          </p>
        )}
        <p className="text-muted-foreground mb-8">
          Thank you for your order. We&apos;ll send you a confirmation email shortly and ship your items as soon as possible.
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
