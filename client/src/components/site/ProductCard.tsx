import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Star, Truck, Sparkles } from "lucide-react";
import { getProductImage, type Part } from "@/lib/mockData";

function stockLabel(stock: Part["stock"]) {
  if (stock === "in-stock")
    return {
      label: "In stock",
      tone: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    };
  if (stock === "low")
    return {
      label: "Low stock",
      tone: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
    };
  return {
    label: "Out of stock",
    tone: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
  };
}

export default function ProductCard({ part }: { part: Part }) {
  const s = stockLabel(part.stock);

  return (
    <Link href={`/product/${part.id}`}>
      <a
        data-testid={`card-product-${part.id}`}
        className="group block rounded-2xl focus-visible:outline-none"
      >
        <Card className="glass overflow-hidden rounded-2xl border-border/70 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
          <div className="relative aspect-square bg-[hsl(var(--muted))]">
            <img
              data-testid={`img-product-${part.id}`}
              src={getProductImage(part)}
              alt={part.name}
              className="h-full w-full object-contain p-6 transition-transform duration-300 group-hover:scale-[1.03]"
            />
            <div className="absolute left-3 top-3 flex gap-2">
              <Badge
                data-testid={`badge-stock-${part.id}`}
                className={`rounded-full border-0 ${s.tone}`}
              >
                {s.label}
              </Badge>
              {part.tags.includes("Popular") ? (
                <Badge
                  data-testid={`badge-popular-${part.id}`}
                  className="rounded-full border-0 bg-[hsl(var(--primary))]/12 text-[hsl(var(--primary))]"
                >
                  <Sparkles className="mr-1 h-3.5 w-3.5" /> Popular
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div
                  data-testid={`text-product-name-${part.id}`}
                  className="text-pretty text-sm font-semibold leading-snug"
                >
                  {part.name}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {part.vehicle === "bike" ? "Bike" : "Scooter"} · {part.category}
                </div>
              </div>
              <div
                data-testid={`text-product-price-${part.id}`}
                className="text-sm font-semibold tabular-nums"
              >
                £{part.price.toFixed(2)}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3.5 w-3.5 text-amber-500" />
                <span
                  data-testid={`text-product-rating-${part.id}`}
                  className="tabular-nums"
                >
                  {part.rating.toFixed(1)}
                </span>
                <span className="text-muted-foreground">({part.reviewCount})</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Truck className="h-3.5 w-3.5" />
                <span data-testid={`text-product-eta-${part.id}`}>
                  {part.deliveryEta}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </a>
    </Link>
  );
}
