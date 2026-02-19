import React from "react";
import { useRoute, Link } from "wouter";
import { CheckCircle2, Headphones, ChevronRight, Loader2, Search, Shield, Sparkles, Star, Truck } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";
import BackButton from "@/components/site/BackButton";
import { useContactModal } from "@/components/site/ContactModal";
import { useProduct, useProducts } from "@/lib/products";
import { useCart } from "@/lib/cart";
import ProductCard from "@/components/site/ProductCard";
import { getProductImage } from "@/lib/mockData";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function ProductPage() {
  const [, params] = useRoute("/product/:id");
  const { data: part, isLoading } = useProduct(params?.id);
  const { data: allProducts = [] } = useProducts();
  const { state: cartState, actions: cartActions } = useCart();
  const contactModal = useContactModal();
  const [selectedImageIndex, setSelectedImageIndex] = React.useState(0);
  const [bikeInput, setBikeInput] = React.useState("");
  const [compatCheck, setCompatCheck] = React.useState<{ compatible: string; reason: string } | null>(null);
  const [compatLoading, setCompatLoading] = React.useState(false);
  const [showCompatForm, setShowCompatForm] = React.useState(false);

  usePageMeta({
    title: part?.metaTitle || part?.name || "Product",
    description: part?.metaDescription || part?.description?.slice(0, 160).trim() || "Motorcycle part from Smoke City Supplies. UK delivery.",
    image: part ? getProductImage(part) : undefined,
    keywords: part?.metaKeywords,
    ogType: "product",
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

  const images = part.images?.length ? part.images : [getProductImage(part)];
  const imageUrl = images[selectedImageIndex] || images[0];
  const absoluteImage =
    typeof window !== "undefined" && imageUrl
      ? imageUrl.startsWith("http")
        ? imageUrl
        : `${window.location.origin}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`
      : undefined;
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
  const productUrl = `${siteUrl}/product/${part.id}`;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: part.name,
    description: part.metaDescription || part.description?.slice(0, 500) || part.name,
    ...(absoluteImage && { image: absoluteImage }),
    ...(part.brand && { brand: { "@type": "Brand", name: part.brand } }),
    ...(part.partNumber && { sku: part.partNumber }),
    ...(part.category && { category: part.category }),
    url: productUrl,
    offers: {
      "@type": "Offer",
      url: productUrl,
      price: part.price,
      priceCurrency: "GBP",
      availability:
        part.stock === "out"
          ? "https://schema.org/OutOfStock"
          : part.stock === "low"
            ? "https://schema.org/LimitedAvailability"
            : "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: "Smoke City Supplies",
      },
    },
    ...(part.reviewCount > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: part.rating,
        reviewCount: part.reviewCount,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl || undefined,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Parts",
        item: `${siteUrl}/store`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: part.category,
        item: `${siteUrl}/store?category=${encodeURIComponent(part.category)}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: part.name,
      },
    ],
  };
  const stockStatus =
    part.stock === "in-stock"
      ? (part.quantity != null && part.quantity <= 20 ? `${part.quantity} in stock` : "In Stock")
      : part.stock === "low"
        ? (part.quantity != null && part.quantity > 0 ? `${part.quantity} left` : "Low Stock")
        : "Out of Stock";

  const availableStock = part.quantity ?? 0;
  const currentInCart = cartState.items.find((i) => i.productId === part.id)?.quantity ?? 0;
  const atStockLimit = availableStock > 0 && currentInCart >= availableStock;

  const vehicleLabel = part.vehicle === "motorcycle" ? "Motorcycle" : "Scooter";

  const checkCompat = async () => {
    if (bikeInput.trim().length < 3) return;
    setCompatLoading(true);
    setCompatCheck(null);
    try {
      const res = await fetch("/api/check-compatibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: part.name,
          partNumber: part.partNumber,
          compatibility: part.compatibility,
          bike: bikeInput.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Check failed" }));
        throw new Error(err.message || "Check failed");
      }
      const data = await res.json();
      setCompatCheck({ compatible: data.compatible, reason: data.reason });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Compatibility check failed");
    } finally {
      setCompatLoading(false);
    }
  };

  return (
    <SiteLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
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
          <div className="space-y-3">
            <Card className="overflow-hidden border-border/50">
              <div className="aspect-square bg-gradient-to-br from-muted/50 to-muted/30">
                <img
                  data-testid="img-product-hero"
                  src={imageUrl}
                  alt={part.name}
                  className="h-full w-full object-contain p-4"
                />
              </div>
            </Card>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`h-16 w-16 shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                      idx === selectedImageIndex
                        ? "border-primary"
                        : "border-border/50 hover:border-border"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${part.name} ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            {part.partNumber && (
              <div className="text-sm text-muted-foreground font-mono">
                Part number: <span className="font-semibold text-foreground">{part.partNumber}</span>
              </div>
            )}
            {part.brand && (
              <Link href={`/store?brands=${encodeURIComponent(part.brand)}`}>
                <span className="text-sm font-medium text-primary hover:underline cursor-pointer">{part.brand}</span>
              </Link>
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
                  cartActions.add({
                    productId: part.id,
                    productName: part.name,
                    priceEach: part.price,
                    quantity: 1,
                    image: imageUrl,
                    maxStock: availableStock,
                  });
                  toast.success("Added to cart");
                }}
                disabled={part.stock === "out" || atStockLimit}
              >
                {part.stock === "out"
                  ? "Out of Stock"
                  : atStockLimit
                    ? "Maximum in Cart"
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
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">Compatibility</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => { setShowCompatForm((v) => !v); setCompatCheck(null); }}
                  >
                    <Search className="h-3 w-3" />
                    Check my bike
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {part.compatibility.map((comp, idx) => (
                    <Badge key={idx} variant="secondary" className="rounded-md">
                      {comp}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {!part.compatibility.length && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Compatibility</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => { setShowCompatForm((v) => !v); setCompatCheck(null); }}
                >
                  <Search className="h-3 w-3" />
                  Check my bike
                </Button>
              </div>
            )}

            {showCompatForm && (
              <Card className="border-border/50 p-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Enter your bike details (e.g. "Honda CBR600RR 2012") and we'll check if this part fits.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Yamaha R6 2018"
                    value={bikeInput}
                    onChange={(e) => setBikeInput(e.target.value)}
                    className="h-10"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        checkCompat();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    className="h-10 shrink-0"
                    disabled={compatLoading || bikeInput.trim().length < 3}
                    onClick={checkCompat}
                  >
                    {compatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
                  </Button>
                </div>
                {compatCheck && (
                  <div className={`rounded-lg p-3 text-sm font-medium ${
                    compatCheck.compatible === "yes"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}>
                    {compatCheck.compatible === "yes" ? "Yes — " : "No — "}
                    {compatCheck.reason}
                  </div>
                )}
              </Card>
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

        {/* Related Products */}
        {(() => {
          const related = allProducts
            .filter((p) => p.id !== part.id)
            .filter((p) =>
              p.category === part.category ||
              p.compatibility?.some((c) => part.compatibility?.includes(c))
            )
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 4);
          if (related.length === 0) return null;
          return (
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-4">You May Also Need</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {related.map((p) => (
                  <ProductCard key={p.id} part={p} />
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </SiteLayout>
  );
}
