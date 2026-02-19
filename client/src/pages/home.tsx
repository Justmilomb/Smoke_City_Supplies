import { Link } from "wouter";
import { Settings, Shield, Truck, Phone, ArrowRight, Package, Heart, Wrench, Loader2, Clock } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useProducts } from "@/lib/products";
import ProductCard from "@/components/site/ProductCard";

export default function Home() {
  const { data: products, isLoading } = useProducts();
  const featuredProducts = products?.filter(p => p.stock !== "out").slice(0, 4) ?? [];

  usePageMeta({
    title: "Smoke City Supplies | Quality Motorcycle Parts with Old-Fashioned Service",
    description: "A passionate team of motorcyclists bringing back real, human service to the parts industry. Genuine parts, expert advice, and care that's become rare in today's world.",
    keywords: "motorcycle parts, scooter parts, motorcycle spares, UK motorcycle parts, Smoke City Supplies, genuine motorcycle parts, motorcycle accessories",
  });

  return (
    <SiteLayout>
      <div className="flex flex-col gap-12">
        {/* Hero Section */}
        <section className="grid lg:grid-cols-2 gap-10 items-center py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <div className="inline-flex items-center gap-2 border border-accent bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent rounded-md">
                <Heart className="h-4 w-4" />
                Real Service, Real People
              </div>
              <div className="inline-flex items-center gap-2 border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary rounded-md">
                <Clock className="h-4 w-4" />
                Shop Online 24/7
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl leading-tight mb-5">
              Parts <span className="text-primary">Made</span> Right,
              <br />
              Service <span className="text-primary">Done</span> Right
            </h1>
            <div className="max-w-lg mb-8 text-muted-foreground md:text-lg">
              <p className="md:hidden">
                Real motorcycle parts support from real people. Fast answers, right-fit parts, and UK-wide delivery. Order online 24/7.
              </p>
              <div className="hidden space-y-4 md:block">
                <p>
                  We started <span className="font-semibold text-foreground">Smoke City Supplies</span> because we were tired of seeing the motorcycle parts industry lose its soul.
                </p>
                <p>
                  Every day, it's the same story: automated systems, indifferent corporations, and customers treated like order numbers. That's not service—that's just processing.
                </p>
                <p className="text-foreground font-medium">
                  We're bringing back <span className="underline decoration-primary decoration-2 underline-offset-4">old-fashioned service</span>—the kind where you talk to a real person who actually cares about your bike, your ride, and getting you the right part the first time.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Button size="lg" className="gap-2 font-semibold shadow-lg shadow-primary/20" asChild>
                <Link href="/store" data-testid="link-shop-parts">
                  Browse Parts
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="gap-2" asChild>
                <Link href="/contact">
                  <Phone className="h-4 w-4" />
                  Talk to Us
                </Link>
              </Button>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="bg-gradient-to-br from-primary/10 via-accent/5 to-muted border-2 border-primary/20 p-10 rounded-xl space-y-6 shadow-xl">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-primary text-primary-foreground rounded-lg">
                  <Wrench className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Expert Knowledge</h3>
                  <p className="text-sm text-muted-foreground">
                    Not sure which part fits your bike? We'll help you find the right one—no automated scripts, just genuine expertise.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-primary text-primary-foreground rounded-lg">
                  <Heart className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Personal Care</h3>
                  <p className="text-sm text-muted-foreground">
                    Every order matters. We check each part before it ships and make sure you're getting exactly what you need.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-primary text-primary-foreground rounded-lg">
                  <Phone className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Real Answers</h3>
                  <p className="text-sm text-muted-foreground">
                    Questions? Problems? Pick up the phone or send an email. You'll get a real person, not a chatbot.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Value Proposition Strip */}
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 border-t border-b py-8 -mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 bg-gradient-to-r from-muted/30 via-muted/50 to-muted/30">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-primary text-primary-foreground rounded-lg">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-base mb-1">Genuine Parts</h3>
              <p className="text-sm text-muted-foreground">OEM & quality aftermarket brands you can trust</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-primary text-primary-foreground rounded-lg">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-base mb-1">Fast UK Delivery</h3>
              <p className="text-sm text-muted-foreground">Same-day dispatch on in-stock items</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-primary text-primary-foreground rounded-lg">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-base mb-1">Open 24/7</h3>
              <p className="text-sm text-muted-foreground">Order any time — day or night, every day of the year</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-primary text-primary-foreground rounded-lg">
              <Heart className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-base mb-1">Human Service</h3>
              <p className="text-sm text-muted-foreground">Real help from someone who cares — Mon–Sat 9am–6pm</p>
            </div>
          </div>
        </section>

        {/* Featured Categories */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-3">
              Shop by Category
            </h2>
            <p className="text-muted-foreground md:text-lg">
              From brakes to exhausts, find everything your bike needs
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/store?category=brakes" className="group">
              <div className="border-2 border-border bg-card p-6 rounded-lg hover:border-primary hover:shadow-lg transition-all">
                <h3 className="font-bold text-lg group-hover:text-primary transition-colors">Brakes</h3>
                <p className="text-sm text-muted-foreground mt-1">Pads, discs, calipers</p>
              </div>
            </Link>
            <Link href="/store?category=engine" className="group">
              <div className="border-2 border-border bg-card p-6 rounded-lg hover:border-primary hover:shadow-lg transition-all">
                <h3 className="font-bold text-lg group-hover:text-primary transition-colors">Engine</h3>
                <p className="text-sm text-muted-foreground mt-1">Filters, gaskets, seals</p>
              </div>
            </Link>
            <Link href="/store?category=exhaust" className="group">
              <div className="border-2 border-border bg-card p-6 rounded-lg hover:border-primary hover:shadow-lg transition-all">
                <h3 className="font-bold text-lg group-hover:text-primary transition-colors">Exhaust</h3>
                <p className="text-sm text-muted-foreground mt-1">Systems, silencers</p>
              </div>
            </Link>
            <Link href="/store?category=suspension" className="group">
              <div className="border-2 border-border bg-card p-6 rounded-lg hover:border-primary hover:shadow-lg transition-all">
                <h3 className="font-bold text-lg group-hover:text-primary transition-colors">Suspension</h3>
                <p className="text-sm text-muted-foreground mt-1">Forks, shocks, springs</p>
              </div>
            </Link>
          </div>
          <div className="text-center mt-6">
            <Link href="/store" className="text-primary text-sm font-medium hover:underline inline-flex items-center gap-1">
              View all categories <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <section>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-3">
                Featured Parts
              </h2>
              <p className="text-muted-foreground md:text-lg">
                Quality parts ready to ship today
              </p>
            </div>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {featuredProducts.map(product => (
                  <ProductCard key={product.id} part={product} />
                ))}
              </div>
            )}
            <div className="text-center mt-6">
              <Button size="lg" className="gap-2 font-semibold" asChild>
                <Link href="/store">
                  View All Parts
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </section>
        )}

        {/* Why Different Section */}
        <section className="bg-gradient-to-br from-primary/5 via-accent/5 to-muted/50 border-2 border-primary/20 p-8 md:p-12 rounded-2xl">
          <div className="max-w-3xl mx-auto text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Why Smoke City is Different
            </h2>
            <p className="mb-6 text-muted-foreground md:text-lg">
              <span className="md:hidden">Real people, real advice, right parts — order online 24/7.</span>
              <span className="hidden md:inline">
              In a world of faceless corporations and automated responses, we're doing things the old way—with actual human care and expertise. When you order from Smoke City, you're not a ticket number in a queue. You're a fellow rider who deserves respect, honest advice, and parts that work.
              </span>
            </p>
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-4 py-2 mb-4">
              <Clock className="h-5 w-5 text-primary" />
              <span className="font-semibold text-primary">Online store open 24 hours a day, 7 days a week</span>
            </div>
            <p className="text-foreground font-medium md:text-lg">
              That's not just our promise—that's how we run every single day.
            </p>
          </div>
        </section>

        {/* Info Grid */}
        <section className="grid md:grid-cols-3 gap-6">
          <div className="border-2 border-border bg-card p-7 rounded-lg hover:border-primary/50 hover:shadow-md transition-all">
            <Settings className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-bold text-xl mb-3">Wide Selection</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Thousands of genuine OEM and aftermarket parts from leading brands including Brembo, Ohlins, Akrapovic, and more. If it's quality, we stock it.
            </p>
            <Link href="/store" className="text-primary text-sm font-medium hover:underline inline-flex items-center gap-1">
              Browse catalog <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="border-2 border-border bg-card p-7 rounded-lg hover:border-primary/50 hover:shadow-md transition-all">
            <Truck className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-bold text-xl mb-3">Fast Delivery</h3>
            <p className="text-sm text-muted-foreground mb-4">
              We dispatch orders quickly with tracked delivery across the UK. Most in-stock items ship same or next business day—because we know you need to ride.
            </p>
            <Link href="/shipping" className="text-primary text-sm font-medium hover:underline inline-flex items-center gap-1">
              Shipping info <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="border-2 border-border bg-card p-7 rounded-lg hover:border-primary/50 hover:shadow-md transition-all">
            <Phone className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-bold text-xl mb-3">Need Help?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Not sure which part you need? Reach out directly. Our team can help you find the right components for your specific bike model—with real expertise.
            </p>
            <Link href="/contact" className="text-primary text-sm font-medium hover:underline inline-flex items-center gap-1">
              Get in touch <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-2 border-primary bg-gradient-to-br from-foreground via-foreground to-foreground/90 text-background px-8 py-12 text-center md:py-16 rounded-2xl shadow-2xl">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-semibold text-background/90 mb-4">
            <Clock className="h-4 w-4" />
            Online store open 24/7
          </div>
          <h2 className="text-2xl font-bold md:text-3xl mb-3">
            Ready to experience real service?
          </h2>
          <p className="text-background/80 text-base md:text-lg max-w-2xl mx-auto mb-6">
            Browse our catalog any time — day or night. Find your part, or reach out if you need guidance. Genuine, knowledgeable service whenever you need it.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="secondary" size="lg" className="gap-2 bg-background text-foreground hover:bg-background/90 shadow-lg font-semibold" asChild>
              <Link href="/store">
                <Package className="h-5 w-5" />
                Browse Parts
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="gap-2 border-2 border-background text-background hover:bg-background/10" asChild>
              <Link href="/contact">
                <Phone className="h-5 w-5" />
                Talk to Us
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
