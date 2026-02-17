import { Link } from "wouter";
import { Truck, Clock, MapPin, Package, CheckCircle2 } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";
import BackButton from "@/components/site/BackButton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/hooks/use-page-meta";

export default function ShippingPage() {
  usePageMeta({
    title: "Shipping & Delivery",
    description: "UK delivery for motorcycle parts. Fast shipping options and delivery times. Smoke City Supplies — online motorcycle parts.",
    keywords: "motorcycle parts delivery, UK shipping, motorcycle parts postage, fast delivery motorcycle parts",
  });
  return (
    <SiteLayout>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Shipping & Delivery
            </h1>
            <p className="mt-2 text-muted-foreground">
              Fast, reliable shipping to get your parts to you quickly
            </p>
            <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
              We ship motorcycle parts across the UK. Delivery times and options depend on your location and the items you order. All prices include UK delivery unless stated otherwise.
            </p>
          </div>
          <BackButton fallback="/" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-border/50 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Truck className="h-6 w-6" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">Delivery Times</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Orders placed before 6:00 PM (UK time, Mon-Fri) can qualify for next-day delivery where available. Orders placed after 6:00 PM or on weekends dispatch the next business day.
            </p>
          </Card>

          <Card className="border-border/50 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package className="h-6 w-6" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">Shipping Costs</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Royal Mail services at checkout:
              <br />
              Tracked 48 (Two Day Delivery Aim): £4.00
              <br />
              Next Day Aim: £5.00
              <br />
              Next Day Guaranteed: £10.00
            </p>
          </Card>

          <Card className="border-border/50 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MapPin className="h-6 w-6" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">Areas We Cover</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We currently ship across the United Kingdom only.
            </p>
          </Card>

          <Card className="border-border/50 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock className="h-6 w-6" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">Tracking</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Once your order ships, you'll receive an email with a tracking number so you can follow your delivery.
            </p>
          </Card>
        </div>

        <Card className="mt-8 border-border/50 bg-primary/5 p-6">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary shrink-0" />
            <div>
              <h3 className="font-semibold mb-1">Need Help?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Have questions about shipping for your order? We're here to help.
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Delivery commitments and exclusions are subject to Royal Mail service terms and conditions.
              </p>
              <Link href="/contact">
                <Button variant="outline" size="sm" asChild>
                  <a>Contact Support</a>
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </SiteLayout>
  );
}
