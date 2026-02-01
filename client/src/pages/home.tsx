import { Link } from "wouter";
import { Package, Shield, Truck, Headphones, ArrowRight } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/hooks/use-page-meta";

export default function Home() {
  usePageMeta({
    title: "Smoke City Supplies",
    description: "Genuine motorcycle parts, UK delivery. Online only — shop brakes, engine, suspension, exhaust and more. Expert advice and support.",
  });
  return (
    <SiteLayout>
      <div className="flex flex-col">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/10 via-background to-muted/30 px-6 py-16 md:px-12 md:py-24 lg:py-28">
          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <h1 className="font-[var(--font-serif)] text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Smoke City Supplies
            </h1>
            <p className="mt-4 text-lg text-muted-foreground md:text-xl">
              Genuine motorcycle parts, delivered across the UK. Online only — no physical store, just great parts and support.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href="/store">
                <Button size="lg" className="gap-2 text-base" asChild>
                  <a data-testid="link-shop-parts">
                    Shop Parts
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" size="lg" asChild>
                  <a>Contact</a>
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Trust strip */}
        <section className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-start gap-4 rounded-lg border border-border/50 bg-card p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Genuine parts</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Quality parts from trusted brands. Filter by bike model and category.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-lg border border-border/50 bg-card p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">UK delivery</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                We ship across the UK. See delivery options at checkout.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-lg border border-border/50 bg-card p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Secure checkout</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Safe payment and clear returns policy.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-lg border border-border/50 bg-card p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Support</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Need help? Call, email, or use the contact button on any page.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-16 rounded-2xl border border-border/50 bg-primary/5 px-6 py-10 text-center md:py-14">
          <h2 className="font-[var(--font-serif)] text-2xl font-bold text-foreground md:text-3xl">
            Ready to find your part?
          </h2>
          <p className="mt-2 text-muted-foreground">
            Browse by motorcycle model, category, or brand.
          </p>
          <Link href="/store">
            <Button className="mt-6 gap-2" asChild>
              <a>Browse parts</a>
            </Button>
          </Link>
        </section>
      </div>
    </SiteLayout>
  );
}
