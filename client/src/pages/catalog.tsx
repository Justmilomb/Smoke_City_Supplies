import React from "react";
import { useLocation } from "wouter";
import { BookOpen, Info, Sparkles } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";
import BackButton from "@/components/site/BackButton";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useCategories } from "@/lib/store";
import { useProducts } from "@/lib/products";
import FiltersBar, { type CatalogFilters } from "@/components/site/FiltersBar";
import ProductCard from "@/components/site/ProductCard";
import ProductCardSkeleton from "@/components/site/ProductCardSkeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { bikeTerms, scooterTerms } from "@/lib/dictionary";

function parseVehicle(loc: string): "all" | "bike" | "scooter" {
  const idx = loc.indexOf("?");
  const s = idx >= 0 ? loc.slice(idx) : "";
  const p = new URLSearchParams(s);
  const vehicle = (p.get("vehicle") ?? "all") as "all" | "bike" | "scooter";
  return vehicle;
}

export default function CatalogPage() {
  usePageMeta({
    title: "Parts Catalog",
    description: "Full catalog of motorcycle, bike and scooter parts. Filter by category, vehicle type and price. Quality parts with UK delivery from Smoke City Supplies.",
    keywords: "motorcycle parts catalog, bike parts list, scooter parts, motorcycle spares catalog, UK motorcycle parts, parts by category",
  });
  const cats = useCategories();
  const { data: parts = [], isLoading } = useProducts();
  const [loc] = useLocation();

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

  const derivedBrands = React.useMemo(
    () => Array.from(new Set(parts.map((p) => p.brand).filter((b): b is string => !!b))).sort(),
    [parts]
  );

  const visible = React.useMemo(() => {
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
      list = list.filter((p) => {
        const hay = `${p.name} ${p.category} ${p.vehicle} ${p.partNumber ?? ""} ${p.brand ?? ""} ${p.tags?.join(" ") ?? ""} ${p.compatibility?.join(" ") ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
    }

    if (filters.sort === "price-asc") list.sort((a, b) => a.price - b.price);
    if (filters.sort === "price-desc") list.sort((a, b) => b.price - a.price);
    if (filters.sort === "rating") list.sort((a, b) => b.rating - a.rating);
    if (filters.sort === "newest") list.reverse();

    return list;
  }, [filters, parts]);

  const intentVehicle = parseVehicle(loc);

  return (
    <SiteLayout>
      <div className="flex flex-col gap-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 data-testid="text-catalog-title" className="text-3xl font-bold tracking-tight md:text-4xl">
              Shop Parts
            </h1>
            <p data-testid="text-catalog-subtitle" className="mt-2 text-muted-foreground">
              Find exactly what you need with our comprehensive catalog
            </p>
          </div>
          <BackButton fallback="/" />
        </div>

        <FiltersBar categories={cats} brands={derivedBrands} value={filters} onChange={setFilters} />

        <Card className="border-border/50 p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="h-5 w-5 text-primary" />
                <div className="font-semibold">Terminology Guide</div>
              </div>
              <div className="text-sm text-muted-foreground">
                New to parts? Learn the basics here
              </div>
            </div>
            <Badge data-testid="badge-dictionary" variant="secondary" className="rounded-md">
              <Sparkles className="mr-1 h-3.5 w-3.5" /> Helpful
            </Badge>
          </div>

          <Tabs defaultValue={intentVehicle === "all" ? "bike" : intentVehicle} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger data-testid="tab-bike" value="bike">
                Bike Terms
              </TabsTrigger>
              <TabsTrigger data-testid="tab-scooter" value="scooter">
                Scooter Terms
              </TabsTrigger>
            </TabsList>
            <TabsContent value="bike" className="mt-4">
              <Accordion type="single" collapsible className="w-full">
                {bikeTerms.map((term) => (
                  <AccordionItem key={term.term} value={term.term}>
                    <AccordionTrigger data-testid={`accordion-${term.term}`} className="font-medium">
                      {term.term}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div data-testid={`text-definition-${term.term}`} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{term.definition}</span>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </TabsContent>
            <TabsContent value="scooter" className="mt-4">
              <Accordion type="single" collapsible className="w-full">
                {scooterTerms.map((term) => (
                  <AccordionItem key={term.term} value={term.term}>
                    <AccordionTrigger data-testid={`accordion-${term.term}`} className="font-medium">
                      {term.term}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div data-testid={`text-definition-${term.term}`} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{term.definition}</span>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="flex items-center justify-between">
          <div data-testid="text-results-count" className="text-sm font-medium text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{visible.length}</span> {visible.length === 1 ? "item" : "items"}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <Card className="border-border/50 p-12 text-center">
            <p className="text-muted-foreground">No products found. Try adjusting your filters.</p>
            <p className="mt-2 text-sm text-muted-foreground">Clear filters or try a different search term.</p>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((p) => (
              <ProductCard key={p.id} part={p} />
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
