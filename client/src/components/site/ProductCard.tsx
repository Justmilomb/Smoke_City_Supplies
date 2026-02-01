import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Star, Truck, Sparkles } from "lucide-react";
import { getProductImage, type Part } from "@/lib/mockData";

function stockLabel(stock: Part["stock"]) {
  if (stock === "in-stock")
    return {
      label: "In Stock",
      tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  if (stock === "low")
    return {
      label: "Low Stock",
      tone: "bg-amber-50 text-amber-700 border-amber-200",
    };
  return {
    label: "Out of Stock",
    tone: "bg-rose-50 text-rose-700 border-rose-200",
  };
}

export default function ProductCard({ part }: { part: Part }) {
  const s = stockLabel(part.stock);

  return (
    <Link href={`/product/${part.id}`}>
      <a
        data-testid={`card-product-${part.id}`}
        className="group block focus-visible:outline-none"
      >
        <Card className="h-full overflow-hidden border border-border/50 transition-all hover:border-primary/50 hover:shadow-lg">
          <div className="relative aspect-square bg-gradient-to-br from-muted/50 to-muted/30">
            <img
              data-testid={`img-product-${part.id}`}
              src={getProductImage(part)}
              alt={part.name}
              className="h-full w-full object-contain p-8 transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute left-4 top-4 flex flex-col gap-2">
              <Badge
                data-testid={`badge-stock-${part.id}`}
                variant="outline"
                className={`rounded-md border text-xs font-medium ${s.tone}`}
              >
                {s.label}
              </Badge>
              {part.tags.includes("Popular") && (
                <Badge
                  data-testid={`badge-popular-${part.id}`}
                  className="rounded-md border-0 bg-primary/10 text-primary"
                >
                  <Sparkles className="mr-1 h-3 w-3" />
                  Popular
                </Badge>
              )}
            </div>
          </div>

          <div className="p-6">
            <div className="mb-3">
              <div
                data-testid={`text-product-name-${part.id}`}
                className="mb-1 line-clamp-2 text-base font-semibold leading-snug text-foreground group-hover:text-primary transition-colors"
              >
                {part.name}
              </div>
              <div className="text-xs font-medium text-muted-foreground">
                {part.vehicle === "bike" ? "Bike" : "Scooter"} · {part.category}
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span
                    data-testid={`text-product-rating-${part.id}`}
                    className="text-sm font-semibold tabular-nums"
                  >
                    {part.rating.toFixed(1)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({part.reviewCount})
                  </span>
                </div>
              </div>
              <div
                data-testid={`text-product-price-${part.id}`}
                className="text-lg font-bold tabular-nums text-foreground"
              >
                ${part.price.toFixed(2)}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Truck className="h-3.5 w-3.5" />
              <span data-testid={`text-product-eta-${part.id}`}>
                {part.deliveryEta}
              </span>
            </div>
          </div>
        </Card>
      </a>
    </Link>
  );
}
