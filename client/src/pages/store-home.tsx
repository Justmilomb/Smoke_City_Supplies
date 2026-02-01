import { Link } from "wouter";
import {
  ArrowRight,
  Bike,
  Gauge,
  CheckCircle2,
  Truck,
  Shield,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SiteLayout from "@/components/site/SiteLayout";
import { useProducts } from "@/lib/products";
import ProductCard from "@/components/site/ProductCard";

export default function StoreHome() {
  const { data: parts = [] } = useProducts();
  const featured = parts.slice(0, 6);

  return (
    <SiteLayout>
      {/* Hero Section */}
      <section className="relative mb-16 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border border-border/50">
        <div className="relative px-8 py-16 md:px-12 md:py-20 lg:px-16 lg:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Zap className="h-4 w-4" />
              Fast shipping on all orders
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Premium Parts for
              <span className="block text-primary"> Your Ride</span>
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl">
              Shop quality bike and scooter parts with expert guidance. Fast delivery, easy returns, and support that actually helps.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/catalog">
                <Button size="lg" className="h-12 px-8 text-base">
                  Shop Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/catalog?vehicle=bike">
                <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                  Browse Bike Parts
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mb-16 grid gap-6 md:grid-cols-3">
        <Card className="border-border/50 p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Truck className="h-6 w-6" />
          </div>
          <h3 className="mb-2 font-semibold">Fast Shipping</h3>
          <p className="text-sm text-muted-foreground">
            Most orders ship same day. Free shipping on orders over $75.
          </p>
        </Card>
        <Card className="border-border/50 p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Shield className="h-6 w-6" />
          </div>
          <h3 className="mb-2 font-semibold">Quality Guaranteed</h3>
          <p className="text-sm text-muted-foreground">
            All parts tested and verified. 30-day return policy.
          </p>
        </Card>
        <Card className="border-border/50 p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="mb-2 font-semibold">Expert Support</h3>
          <p className="text-sm text-muted-foreground">
            Need help choosing? Our team is here to guide you.
          </p>
        </Card>
      </section>

      {/* Shop by Vehicle */}
      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">Shop by Vehicle</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <Link href="/catalog?vehicle=bike">
            <Card className="group relative overflow-hidden border-2 border-border/50 transition-all hover:border-primary/50 hover:shadow-lg">
              <div className="p-8">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <Bike className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Bike Parts</h3>
                <p className="mb-4 text-muted-foreground">
                  Everything you need for your bike: brakes, drivetrain, tires, and more.
                </p>
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  Shop bike parts
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Card>
          </Link>
          <Link href="/catalog?vehicle=scooter">
            <Card className="group relative overflow-hidden border-2 border-border/50 transition-all hover:border-primary/50 hover:shadow-lg">
              <div className="p-8">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <Gauge className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Scooter Parts</h3>
                <p className="mb-4 text-muted-foreground">
                  Complete selection of scooter components: tires, batteries, controllers, and more.
                </p>
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  Shop scooter parts
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Card>
          </Link>
        </div>
      </section>

      {/* Featured Products */}
      {featured.length > 0 && (
        <section>
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Featured Products</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Popular items with fast shipping
              </p>
            </div>
            <Link href="/catalog">
              <Button variant="ghost" className="gap-2">
                View all
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <ProductCard key={p.id} part={p} />
            ))}
          </div>
        </section>
      )}
    </SiteLayout>
  );
}
