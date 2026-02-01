import { Link } from "wouter";
import { Settings, Shield, Truck, Phone, ArrowRight, Package } from "lucide-react";
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
    title: "Smoke City Supplies | Motorcycle Parts UK",
    description: "Genuine motorcycle parts, UK delivery. Online only — shop brakes, engine, suspension, exhaust and more. Expert advice and support.",
  });
  return (
    <SiteLayout>
      <div className="flex flex-col gap-8">
        {/* Hero */}
        <section className="grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 border border-accent bg-accent/10 px-3 py-1 text-sm font-medium text-accent mb-4">
              <Package className="h-4 w-4" />
              UK Motorcycle Parts Specialist
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl leading-tight">
              Quality Parts for
              <span className="text-primary"> Every Bike</span>
            </h1>
            <p className="mt-4 text-muted-foreground md:text-lg max-w-lg">
              From brakes to exhausts, we stock genuine OEM and aftermarket parts for all major motorcycle brands. Fast UK delivery with expert support.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button size="lg" className="gap-2 font-semibold" asChild>
                <Link href="/store" data-testid="link-shop-parts">
                  Browse Catalogue
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="bg-muted border p-8 space-y-4">
              <h3 className="font-bold text-lg">Quick Links</h3>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/store?category=Brakes" className="border bg-card p-4 hover:border-primary transition-colors block">
                  <span className="font-medium">Brakes</span>
                </Link>
                <Link href="/store?category=Engine" className="border bg-card p-4 hover:border-primary transition-colors block">
                  <span className="font-medium">Engine</span>
                </Link>
                <Link href="/store?category=Exhaust" className="border bg-card p-4 hover:border-primary transition-colors block">
                  <span className="font-medium">Exhaust</span>
                </Link>
                <Link href="/store?category=Suspension" className="border bg-card p-4 hover:border-primary transition-colors block">
                  <span className="font-medium">Suspension</span>
                </Link>
              </div>
              <Link href="/store" className="text-primary text-sm font-medium hover:underline inline-flex items-center gap-1">
                View all categories <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>

        {/* Trust strip */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 border-t border-b py-6 -mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary text-primary-foreground">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Genuine Parts</h3>
              <p className="text-xs text-muted-foreground">OEM & quality aftermarket</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary text-primary-foreground">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">UK Delivery</h3>
              <p className="text-xs text-muted-foreground">Fast nationwide shipping</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary text-primary-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Secure Checkout</h3>
              <p className="text-xs text-muted-foreground">Safe payment processing</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary text-primary-foreground">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Expert Support</h3>
              <p className="text-xs text-muted-foreground">Call or email for help</p>
            </div>
          </div>
        </section>

        {/* Info section */}
        <section className="grid md:grid-cols-3 gap-6">
          <div className="border bg-card p-6">
            <h3 className="font-bold text-lg mb-2">Wide Selection</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Browse thousands of parts for motorcycles and scooters from leading manufacturers including Brembo, Ohlins, Akrapovic, and more.
            </p>
            <Link href="/store" className="text-primary text-sm font-medium hover:underline">
              Shop all parts
            </Link>
          </div>
          <div className="border bg-card p-6">
            <h3 className="font-bold text-lg mb-2">Fast Delivery</h3>
            <p className="text-sm text-muted-foreground mb-4">
              We dispatch orders quickly with tracked delivery across the UK. Most in-stock items ship same or next business day.
            </p>
            <Link href="/shipping" className="text-primary text-sm font-medium hover:underline">
              Delivery information
            </Link>
          </div>
          <div className="border bg-card p-6">
            <h3 className="font-bold text-lg mb-2">Need Help?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Not sure which part you need? Our team can help you find the right components for your specific bike model.
            </p>
            <button
              type="button"
              onClick={() => contactModal?.open()}
              className="text-primary text-sm font-medium hover:underline text-left"
            >
              Get in touch
            </button>
          </div>
        </section>

        {/* Available Parts (from API) */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Available Parts
            </h2>
            <Button variant="outline" className="gap-2" asChild>
              <Link href="/store">
                Browse all <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
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
            <Button size="lg" className="gap-2" asChild>
              <Link href="/store">Browse all parts <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </section>

        {/* CTA */}
        <section className="border bg-foreground text-background px-6 py-10 text-center md:py-12">
          <h2 className="text-xl font-bold md:text-2xl">
            Ready to find your part?
          </h2>
          <p className="mt-2 text-background/70 text-sm md:text-base">
            Search by model, category, or part number.
          </p>
          <Button variant="secondary" className="mt-5 gap-2 bg-background text-foreground hover:bg-background/90" asChild>
            <Link href="/store">
              Browse Parts
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </section>
      </div>
    </SiteLayout>
  );
}
