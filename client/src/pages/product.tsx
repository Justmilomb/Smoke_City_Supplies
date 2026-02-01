import { useRoute, Link } from "wouter";
import { ArrowLeft, BadgeCheck, Headphones, ShieldCheck, Star, Truck } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";
import { useProduct } from "@/lib/products";
import { useCart } from "@/lib/cart";
import { getProductImage } from "@/lib/mockData";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function ProductPage() {
  const [, params] = useRoute("/product/:id");
  const { data: part, isLoading } = useProduct(params?.id);
  const { actions: cartActions } = useCart();

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="glass rounded-3xl p-8 text-center text-muted-foreground">
          Loading…
        </div>
      </SiteLayout>
    );
  }

  if (!part) {
    return (
      <SiteLayout>
        <div className="glass rounded-3xl p-8">
          <div data-testid="text-product-missing" className="text-sm text-muted-foreground">
            That part doesn’t exist (yet).
          </div>
          <Link href="/catalog">
            <a data-testid="link-back-catalog" className="mt-3 inline-block text-sm font-medium text-[hsl(var(--primary))] hover:underline">
              Back to catalog
            </a>
          </Link>
        </div>
      </SiteLayout>
    );
  }

  const imageUrl = getProductImage(part);

  return (
    <SiteLayout>
      <div className="flex flex-col gap-8">
        <Link href="/catalog">
          <a data-testid="link-product-back" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </a>
        </Link>

        <div className="grid gap-8 lg:grid-cols-12">
          <Card className="glass overflow-hidden rounded-3xl lg:col-span-6">
            <div className="aspect-square bg-[hsl(var(--muted))]">
              <img
                data-testid="img-product-hero"
                src={imageUrl}
                alt={part.name}
                className="h-full w-full object-contain p-10"
              />
            </div>
          </Card>

          <div className="lg:col-span-6">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge data-testid="badge-vehicle" className="rounded-full bg-[hsl(var(--primary))]/12 text-[hsl(var(--primary))]">
                  {part.vehicle === "bike" ? "Bike" : "Scooter"}
                </Badge>
                <Badge data-testid="badge-category" variant="secondary" className="rounded-full">
                  {part.category}
                </Badge>
                <Badge data-testid="badge-eta" variant="secondary" className="rounded-full">
                  <Truck className="mr-1 h-3.5 w-3.5" /> {part.deliveryEta}
                </Badge>
              </div>

              <h1 data-testid="text-product-title" className="text-balance font-[var(--font-serif)] text-3xl font-semibold tracking-tight">
                {part.name}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <div className="inline-flex items-center gap-1">
                  <Star className="h-4 w-4 text-amber-500" />
                  <span data-testid="text-product-rating" className="font-medium text-foreground tabular-nums">
                    {part.rating.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">({part.reviewCount} reviews)</span>
                </div>
                <span className="text-muted-foreground">•</span>
                <span data-testid="text-product-compat">Fits: {part.compatibility.join(", ")}</span>
              </div>

              <div data-testid="text-product-price" className="text-2xl font-semibold tabular-nums">
                ${part.price.toFixed(2)}
              </div>

              <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                <Button
                  data-testid="button-add-to-cart"
                  className="h-11 rounded-2xl"
                  onClick={() => {
                    cartActions.add({
                      productId: part.id,
                      productName: part.name,
                      priceEach: part.price,
                      quantity: 1,
                      image: imageUrl,
                    });
                    toast.success("Added to cart");
                  }}
                  disabled={part.stock === "out"}
                >
                  Add to cart
                </Button>
                <Button data-testid="button-ask-support" variant="secondary" className="h-11 rounded-2xl">
                  Ask support
                </Button>
              </div>

              <Card className="glass mt-5 rounded-3xl p-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="flex items-start gap-2">
                    <BadgeCheck className="mt-0.5 h-4 w-4 text-[hsl(var(--primary))]" />
                    <div>
                      <div className="text-sm font-semibold">Quality checked</div>
                      <div className="text-xs text-muted-foreground">Only reputable parts</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Headphones className="mt-0.5 h-4 w-4 text-[hsl(var(--accent))]" />
                    <div>
                      <div className="text-sm font-semibold">Real support</div>
                      <div className="text-xs text-muted-foreground">Help choosing the right fit</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
                    <div>
                      <div className="text-sm font-semibold">Secure checkout</div>
                      <div className="text-xs text-muted-foreground">Protected payments</div>
                    </div>
                  </div>
                </div>

                <Separator className="my-5" />

                <div>
                  <div className="text-sm font-semibold">Description</div>
                  <p data-testid="text-product-description" className="mt-2 text-sm text-muted-foreground">
                    {part.description}
                  </p>
                </div>

                <div className="mt-5">
                  <div className="text-sm font-semibold">Specs</div>
                  <div className="mt-2 grid gap-2">
                    {part.specs.map((s, idx) => (
                      <div
                        key={idx}
                        data-testid={`row-spec-${idx}`}
                        className="flex items-center justify-between rounded-xl border border-border/70 bg-background/60 px-3 py-2"
                      >
                        <div className="text-xs text-muted-foreground">{s.label}</div>
                        <div className="text-xs font-medium">{s.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
