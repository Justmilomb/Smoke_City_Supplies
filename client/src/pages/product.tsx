import { useRoute, Link } from "wouter";
import { CheckCircle2, Headphones, ChevronRight, Shield, Sparkles, Star, Truck } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";
import BackButton from "@/components/site/BackButton";
import { useContactModal } from "@/components/site/ContactModal";
import { useProduct } from "@/lib/products";
import { useCart, useCartItemQuantity } from "@/lib/cart";
import { getProductImage } from "@/lib/mockData";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function ProductPage() {
  const [, params] = useRoute("/product/:id");
  const { data: part, isLoading } = useProduct(params?.id);
  const { actions: cartActions } = useCart();
  const contactModal = useContactModal();
  const inCartQty = useCartItemQuantity(params?.id ?? "");
  const stockQty = part?.quantity ?? 0;
  const canAddMore = stockQty > inCartQty;

  usePageMeta({
    title: part?.name ?? "Product",
    description: part?.description?.slice(0, 160).trim() ?? "Motorcycle part from Smoke City Supplies. UK delivery.",
    image: part ? getProductImage(part) : undefined,
  });

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
          <Link href="/store">
            <Button variant="outline" className="mt-4" asChild>
              <a data-testid="link-back-catalog">
                Back to parts
              </a>
            </Button>
          </Link>
        </Card>
      </SiteLayout>
    );
  }

  const imageUrl = getProductImage(part);
  const absoluteImage =
    typeof window !== "undefined" && imageUrl
      ? imageUrl.startsWith("http")
        ? imageUrl
        : `${window.location.origin}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`
      : undefined;
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: part.name,
    description: part.description?.slice(0, 500) ?? part.name,
    ...(absoluteImage && { image: absoluteImage }),
    ...(part.brand && { brand: { "@type": "Brand", name: part.brand } }),
    offers: {
      "@type": "Offer",
      price: part.price,
      priceCurrency: "GBP",
      availability:
        part.stock === "out"
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
    },
  };
  const stockStatus =
    part.stock === "in-stock"
      ? (part.quantity != null && part.quantity <= 20 ? `${part.quantity} in stock` : "In Stock")
      : part.stock === "low"
        ? (part.quantity != null && part.quantity > 0 ? `${part.quantity} left` : "Low Stock")
        : "Out of Stock";

  const vehicleLabel = part.vehicle === "motorcycle" ? "Motorcycle" : part.vehicle === "bike" ? "Bike" : "Scooter";

  return (
    <SiteLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <div className="flex flex-col gap-6">
        <BackButton fallback="/store" />

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/store">
            <a className="hover:text-foreground">Parts</a>
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/store?category=${encodeURIComponent(part.category)}`}>
            <a className="hover:text-foreground">{part.category}</a>
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium truncate max-w-[180px]">{part.name}</span>
        </nav>

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
            {part.partNumber && (
              <div className="text-sm text-muted-foreground font-mono">
                Part number: <span className="font-semibold text-foreground">{part.partNumber}</span>
              </div>
            )}
            {part.brand && (
              <div className="text-sm font-medium text-primary">{part.brand}</div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-md">
                {vehicleLabel}
              </Badge>
              {part.subcategory && (
                <Badge variant="outline" className="rounded-md">
                  {part.subcategory}
                </Badge>
              )}
              <Badge variant="outline" className="rounded-md">
                {part.category}
              </Badge>
              <Badge
                variant={part.stock === "in-stock" ? "default" : "secondary"}
                className="rounded-md"
              >
                {stockStatus}
              </Badge>
              {part.tags?.includes("Popular") && (
                <Badge className="rounded-md border-0 bg-primary/10 text-primary">
                  <Sparkles className="mr-1 h-3 w-3" />
                  Popular
                </Badge>
              )}
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
                £{part.price.toFixed(2)}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                data-testid="button-add-to-cart"
                size="lg"
                className="h-12 flex-1"
                onClick={() => {
                  if (!canAddMore) {
                    toast.error(`Only ${stockQty} available — you already have ${inCartQty} in your cart`);
                    return;
                  }
                  cartActions.add({
                    productId: part.id,
                    productName: part.name,
                    priceEach: part.price,
                    quantity: 1,
                    image: imageUrl,
                    stockQuantity: stockQty,
                  });
                  toast.success("Added to cart");
                }}
                disabled={part.stock === "out" || !canAddMore}
              >
                {inCartQty > 0 && canAddMore
                  ? `Add another (${inCartQty} in cart)`
                  : inCartQty > 0 && !canAddMore
                    ? `Max in cart (${inCartQty})`
                    : "Add to Cart"}
              </Button>
              <Button
                data-testid="button-ask-support"
                variant="outline"
                size="lg"
                className="h-12 gap-2"
                onClick={() => contactModal?.openWithPartNumber(part.partNumber ?? part.id)}
              >
                <Headphones className="h-5 w-5" />
                Contact Support
              </Button>
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

              {part.features && part.features.length > 0 && (
                <>
                  <Separator className="my-6" />
                  <div>
                    <h3 className="mb-3 font-semibold">Features</h3>
                    <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
                      {part.features.map((f, idx) => (
                        <li key={idx}>{f}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

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
