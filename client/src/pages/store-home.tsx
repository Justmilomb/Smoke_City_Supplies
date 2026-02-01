import { Link } from "wouter";
import {
  ArrowRight,
  Bike,
  Gauge,
  Headphones,
  PackageCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SiteLayout from "@/components/site/SiteLayout";
import { useProducts } from "@/lib/products";
import ProductCard from "@/components/site/ProductCard";

import heroBg from "@/assets/images/hero-bg.png";

export default function StoreHome() {
  const { data: parts = [] } = useProducts();
  const featured = parts.slice(0, 3);

  return (
    <SiteLayout>
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        <img
          data-testid="img-hero"
          src={heroBg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-90"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(5,10,20,.85) 0%, rgba(5,10,20,.62) 40%, rgba(5,10,20,.08) 78%, rgba(5,10,20,0) 100%)",
          }}
        />
        <div className="relative grid gap-12 p-8 md:grid-cols-12 md:p-12 lg:p-16">
          <div className="md:col-span-7">
            <Badge
              data-testid="badge-hero"
              className="rounded-full bg-white/10 text-white ring-1 ring-white/15"
            >
              <Sparkles className="mr-1 h-4 w-4" /> Next-day delivery on popular
              parts
            </Badge>

            <h1
              data-testid="text-hero-title"
              className="mt-6 text-balance font-[var(--font-serif)] text-4xl font-semibold tracking-tight text-white md:text-5xl"
            >
              Bike & scooter parts, delivered fast.
            </h1>
            <p
              data-testid="text-hero-subtitle"
              className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-white/80 md:text-lg"
            >
              Clear categories, beginner-friendly guides, and customer service that
              actually helps you pick the right part.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link href="/catalog">
                <Button data-testid="button-hero-shop" asChild className="h-11 rounded-full">
                  <a data-testid="link-hero-shop">
                    Shop parts <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </Link>
              <Link href="/catalog?q=brake">
                <Button
                  data-testid="button-hero-find"
                  asChild
                  variant="secondary"
                  className="h-11 rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/15"
                >
                  <a data-testid="link-hero-find">Find my part</a>
                </Button>
              </Link>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-5 text-white backdrop-blur-sm">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Truck className="h-4 w-4" /> Fast delivery
                </div>
                <div className="mt-2 text-xs text-white/70">
                  Next-day on best sellers
                </div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-5 text-white backdrop-blur-sm">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Headphones className="h-4 w-4" /> Great support
                </div>
                <div className="mt-2 text-xs text-white/70">Chat-style help pages</div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-5 text-white backdrop-blur-sm">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <PackageCheck className="h-4 w-4" /> Easy returns
                </div>
                <div className="mt-2 text-xs text-white/70">Simple, no stress</div>
              </div>
            </div>
          </div>

          <div className="md:col-span-5">
            <Card className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
              <div className="border-b border-border/60 p-6">
                <div className="text-sm font-semibold">Shop by vehicle</div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Start simple—pick what you ride.
                </div>
              </div>
              <div className="grid gap-4 p-6">
                <Link href="/catalog?vehicle=bike">
                  <a data-testid="link-shop-bike" className="block">
                    <div className="group flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 p-4 transition hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[hsl(var(--primary))]/12 text-[hsl(var(--primary))]">
                          <Bike className="h-5 w-5" />
                        </span>
                        <div>
                          <div className="text-sm font-semibold">Bike parts</div>
                          <div className="text-xs text-muted-foreground">
                            Brakes, drivetrain, tires
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
                    </div>
                  </a>
                </Link>

                <Link href="/catalog?vehicle=scooter">
                  <a data-testid="link-shop-scooter" className="block">
                    <div className="group flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 p-4 transition hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[hsl(var(--accent))]/12 text-[hsl(var(--accent))]">
                          <Gauge className="h-5 w-5" />
                        </span>
                        <div>
                          <div className="text-sm font-semibold">Scooter parts</div>
                          <div className="text-xs text-muted-foreground">
                            Tires, brakes, electrical
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
                    </div>
                  </a>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="mt-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2
              data-testid="text-featured-title"
              className="font-[var(--font-serif)] text-2xl font-semibold tracking-tight"
            >
              Featured & fast
            </h2>
            <p
              data-testid="text-featured-subtitle"
              className="mt-2 text-sm text-muted-foreground"
            >
              Popular items that ship quickly.
            </p>
          </div>
          <Link href="/catalog">
            <a
              data-testid="link-featured-all"
              className="text-sm font-medium text-[hsl(var(--primary))] hover:underline"
            >
              View all
            </a>
          </Link>
        </div>

        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p) => (
            <ProductCard key={p.id} part={p} />
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
