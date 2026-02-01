import { Link } from "wouter";
import { Package, Shield, Truck, Headphones, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import SiteLayout from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useContactModal } from "@/components/site/ContactModal";
import ProductCard from "@/components/site/ProductCard";
import ProductCardSkeleton from "@/components/site/ProductCardSkeleton";
import type { Part } from "@/lib/mockData";

export default function Home() {
  const contactModal = useContactModal();
  const { data: products = [], isLoading } = useQuery<Part[]>({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });
  const featuredProducts = products.slice(0, 5);
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
          <Link href="/shipping">
            <a className="flex items-start gap-4 rounded-lg border border-border/50 bg-card p-6 hover:border-primary/50 hover:bg-card/80 transition-colors cursor-pointer">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">UK delivery</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  We ship across the UK. Click to see delivery options.
                </p>
              </div>
            </a>
          </Link>
          <div className="flex items-start gap-4 rounded-lg border border-border/50 bg-card p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Secure checkout</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Safe payment powered by Stripe.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => contactModal?.open()}
            className="flex items-start gap-4 rounded-lg border border-border/50 bg-card p-6 hover:border-primary/50 hover:bg-card/80 transition-colors cursor-pointer text-left w-full"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Support</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Need help? Click here to contact us.
              </p>
            </div>
          </button>
        </section>

        {/* Featured Products */}
        <section className="mt-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-[var(--font-serif)] text-2xl font-bold text-foreground md:text-3xl">
              Available Parts
            </h2>
            <Link href="/store">
              <Button variant="outline" className="gap-2" asChild>
                <a>
                  Browse all
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : featuredProducts.map((part) => (
                  <ProductCard key={part.id} part={part} />
                ))}
          </div>
          {!isLoading && featuredProducts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No products available yet.
            </div>
          )}
          <div className="mt-8 text-center">
            <Link href="/store">
              <Button size="lg" className="gap-2" asChild>
                <a>
                  Browse all parts
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
