import { useRoute, Link } from "wouter";
import { CheckCircle2, Headphones, Shield, Star, Truck } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";
import BackButton from "@/components/site/BackButton";
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
        <Card className="border-border/50 p-12 text-center">
          <div className="text-muted-foreground">Loading product…</div>
        </Card>
      </SiteLayout>
    );
  }

  if (!part) {
    return (
      <SiteLayout>
        <Card className="border-border/50 p-8">
          <div data-testid="text-product-missing" className="text-muted-foreground">
            Product not found.
          </div>
          <Link href="/catalog">
            <Button variant="outline" className="mt-4" asChild>
              <a data-testid="link-back-catalog">
                Back to catalog
              </a>
            </Button>
          </Link>
        </Card>
      </SiteLayout>
    );
  }

  const imageUrl = getProductImage(part);
  const stockStatus = part.stock === "in-stock" ? "In Stock" : part.stock === "low" ? "Low Stock" : "Out of Stock";

  return (
    <SiteLayout>
      <div className="flex flex-col gap-6">
        <BackButton fallback="/catalog" />

        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="overflow-hidden border-border/50">
            <div className="aspect-square bg-gradient-to-br from-muted/50 to-muted/30">
              <img
                data-testid="img-product-hero"
                src={imageUrl}
                alt={part.name}
                className="h-full w-full object-contain p-12"
              />
            </div>
          </Card>

          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-md">
                {part.vehicle === "bike" ? "Bike" : "Scooter"}
              </Badge>
              <Badge variant="outline" className="rounded-md">
                {part.category}
              </Badge>
              <Badge
                variant={part.stock === "in-stock" ? "default" : "secondary"}
                className="rounded-md"
              >
                {stockStatus}
              </Badge>
            </div>

            <div>
              <h1 data-testid="text-product-title" className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
                {part.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span data-testid="text-product-rating" className="font-semibold tabular-nums">
                    {part.rating.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">
                    ({part.reviewCount} reviews)
                  </span>
                </div>
                <span className="text-muted-foreground">•</span>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Truck className="h-4 w-4" />
                  <span>{part.deliveryEta}</span>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-1 text-sm text-muted-foreground">Price</div>
              <div data-testid="text-product-price" className="text-4xl font-bold tabular-nums">
                ${part.price.toFixed(2)}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                data-testid="button-add-to-cart"
                size="lg"
                className="h-12 flex-1"
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
                Add to Cart
              </Button>
              <Link href="/contact">
                <Button data-testid="button-ask-support" variant="outline" size="lg" className="h-12" asChild>
                  <a>Contact Support</a>
                </Button>
              </Link>
            </div>

            {part.compatibility.length > 0 && (
              <div>
                <div className="mb-2 text-sm font-medium">Compatibility</div>
                <div className="flex flex-wrap gap-2">
                  {part.compatibility.map((comp, idx) => (
                    <Badge key={idx} variant="secondary" className="rounded-md">
                      {comp}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Card className="border-border/50 p-6">
              <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Quality Checked</div>
                    <div className="text-xs text-muted-foreground">Verified parts only</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Headphones className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Expert Support</div>
                    <div className="text-xs text-muted-foreground">Help when you need it</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Secure Checkout</div>
                    <div className="text-xs text-muted-foreground">Protected payments</div>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <div>
                <h3 className="mb-3 font-semibold">Description</h3>
                <p data-testid="text-product-description" className="text-sm leading-relaxed text-muted-foreground">
                  {part.description}
                </p>
              </div>

              {part.specs.length > 0 && (
                <>
                  <Separator className="my-6" />
                  <div>
                    <h3 className="mb-3 font-semibold">Specifications</h3>
                    <div className="space-y-2">
                      {part.specs.map((s, idx) => (
                        <div
                          key={idx}
                          data-testid={`row-spec-${idx}`}
                          className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-2.5"
                        >
                          <div className="text-sm text-muted-foreground">{s.label}</div>
                          <div className="text-sm font-medium">{s.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
