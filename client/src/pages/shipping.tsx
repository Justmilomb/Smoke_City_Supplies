import { Link } from "wouter";
import { Truck, Clock, MapPin, Package } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";

export default function ShippingPage() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl space-y-12 py-8">
        <div>
          <h1 className="font-[var(--font-serif)] text-3xl font-semibold tracking-tight text-foreground">
            Shipping & Delivery
          </h1>
          <p className="mt-2 text-muted-foreground">
            How we get your parts to you.
          </p>
        </div>

        <section className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Truck className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="font-medium text-foreground">Delivery times</h2>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                Most orders ship within 1–2 business days. Standard delivery is 3–5 business days from shipment. Next-day delivery is available on popular parts for eligible areas.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="font-medium text-foreground">Shipping costs</h2>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                Standard shipping: $5.99. Free shipping on orders over $75. Express options available at checkout.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
              <MapPin className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="font-medium text-foreground">Areas we cover</h2>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                We ship to the continental United States. Alaska, Hawaii, and international shipping may be available—contact us for a quote.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="font-medium text-foreground">Tracking</h2>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                Once your order ships, you’ll receive an email with a tracking number so you can follow your delivery.
              </p>
            </div>
          </div>
        </section>

        <p className="text-sm text-muted-foreground">
          <Link href="/contact">
            <a className="underline hover:text-foreground">Contact us</a>
          </Link>{" "}
          if you have questions about shipping for your order.
        </p>
      </div>
    </SiteLayout>
  );
}
