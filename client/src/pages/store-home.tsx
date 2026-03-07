import React from "react";
import { Link } from "wouter";
import { MapPin, Shield, Award, Headphones, Clock } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";
import { useCategories } from "@/lib/store";
import { useProducts } from "@/lib/products";
import FiltersBar, { type CatalogFilters } from "@/components/site/FiltersBar";
import ProductCard from "@/components/site/ProductCard";
import ProductCardSkeleton from "@/components/site/ProductCardSkeleton";
import BikeFinder from "@/components/site/BikeFinder";
import { usePageMeta } from "@/hooks/use-page-meta";
import type { Part, PartCategory } from "@/lib/mockData";
import type { BikeFinderResult } from "@/lib/bike-finder";

const PARTS_PER_PAGE = 24;

function filterParts(parts: Part[], filters: CatalogFilters): Part[] {
  if (!Array.isArray(parts)) return [];
  const q = filters.q.trim().toLowerCase();
  let list = [...parts];

  if (filters.vehicle !== "all") list = list.filter((p) => p.vehicle === filters.vehicle);
  if (filters.category !== "all") list = list.filter((p) => p.category === filters.category);
  if (filters.model) list = list.filter((p) => p.compatibility?.includes(filters.model));
  if (filters.brands.length > 0) list = list.filter((p) => p.brand && filters.brands.includes(p.brand));
  if (filters.priceMin !== "") list = list.filter((p) => p.price >= (filters.priceMin as number));
  if (filters.priceMax !== "") list = list.filter((p) => p.price <= (filters.priceMax as number));
  if (filters.inStockOnly) list = list.filter((p) => p.stock === "in-stock");

  if (q) {
    const haystack = (p: Part) =>
      `${p.name} ${p.category} ${p.vehicle} ${p.partNumber ?? ""} ${p.brand ?? ""} ${p.tags?.join(" ") ?? ""} ${p.compatibility?.join(" ") ?? ""}`.toLowerCase();
    list = list.filter((p) => haystack(p).includes(q));
  }

  if (filters.sort === "price-asc") list.sort((a, b) => a.price - b.price);
  if (filters.sort === "price-desc") list.sort((a, b) => b.price - a.price);
  if (filters.sort === "rating") list.sort((a, b) => b.rating - a.rating);
  if (filters.sort === "newest") list.reverse();

  return list;
}

export default function StoreHome() {
  usePageMeta({
    title: "Shop Motorcycle Parts",
    description: "Browse motorcycle parts by category, brand and bike model. Brakes, engine, suspension, exhaust, electrical and more. UK delivery.",
    keywords: "buy motorcycle parts, motorcycle brakes, motorcycle engine parts, motorcycle suspension, motorcycle exhaust, motorcycle tyres, UK motorcycle shop",
  });
  const cats = useCategories();
  const { data: parts = [], isLoading } = useProducts();
  const [filters, setFilters] = React.useState<CatalogFilters>({
    q: "",
    vehicle: "all",
    category: "all",
    sort: "relevance",
    model: "",
    brands: [],
    priceMin: "",
    priceMax: "",
    inStockOnly: false,
  });
  const [page, setPage] = React.useState(1);
  const [bikeResult, setBikeResult] = React.useState<BikeFinderResult | null>(null);

  const defaultCategories: PartCategory[] = [
    "Brakes", "Engine", "Suspension", "Exhaust", "Electrical",
    "Body & Frame", "Tires & Wheels", "Accessories",
  ];
  const categoriesList: PartCategory[] = Array.isArray(cats) && cats.length > 0 ? cats : defaultCategories;

  const derivedBrands = React.useMemo(
    () => Array.from(new Set(parts.map((p) => p.brand).filter((b): b is string => !!b))).sort(),
    [parts]
  );
  const compatibilityOptions = React.useMemo(
    () =>
      Array.from(
        new Set(
          parts
            .flatMap((p) => p.compatibility ?? [])
            .map((model) => model.trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [parts]
  );

  const visible = React.useMemo(() => filterParts(parts, filters), [parts, filters]);
  const totalPages = Math.ceil(visible.length / PARTS_PER_PAGE);
  const displayed = visible.slice(0, page * PARTS_PER_PAGE);
  const hasMore = page < totalPages;

  return (
    <SiteLayout>
      <div className="flex flex-col gap-6">
        {/* Bike compatibility finder — hero feature */}
        <BikeFinder onResultChange={setBikeResult} />

        {/* Local shop banner + trust badges */}
        <div className="rounded-lg border border-border/50 bg-primary/5 px-4 py-3 md:px-6 md:py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              UK-wide delivery — Online only
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5 font-semibold text-primary">
                <Clock className="h-4 w-4 text-primary" />
                Open 24/7
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-primary" />
                Genuine Parts
              </span>
              <span className="flex items-center gap-1.5">
                <Award className="h-4 w-4 text-primary" />
                Expert Advice
              </span>
              <span className="flex items-center gap-1.5">
                <Headphones className="h-4 w-4 text-primary" />
                Support
              </span>
            </div>
          </div>
        </div>

        {!bikeResult && (
          <>
            <FiltersBar
              categories={categoriesList}
              brands={derivedBrands}
              compatibilityOptions={compatibilityOptions}
              value={filters}
              onChange={setFilters}
            />

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{displayed.length}</span> of {visible.length} parts
              </p>
            </div>

            {isLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <div className="rounded-lg border border-border/50 bg-muted/30 px-8 py-16 text-center">
                <p className="text-muted-foreground">No parts found. Try adjusting your filters or search.</p>
                <p className="mt-2 text-sm text-muted-foreground">Clear filters or try a different search term.</p>
              </div>
            ) : (
              <>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {displayed.map((p) => (
                    <ProductCard key={p.id} part={p} />
                  ))}
                </div>
                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <button
                      type="button"
                      onClick={() => setPage((p) => p + 1)}
                      className="rounded-lg border border-border bg-background px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      Load more
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </SiteLayout>
  );
}
