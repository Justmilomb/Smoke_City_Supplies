import React from "react";
import { useLocation } from "wouter";
import { BookOpen, Info, Sparkles } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";
import BackButton from "@/components/site/BackButton";
import { useCategories } from "@/lib/store";
import { useProducts } from "@/lib/products";
import FiltersBar, { type CatalogFilters } from "@/components/site/FiltersBar";
import ProductCard from "@/components/site/ProductCard";
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
  const cats = useCategories();
  const { data: parts = [] } = useProducts();
  const [loc] = useLocation();

  const [filters, setFilters] = React.useState<CatalogFilters>({
    q: "",
    vehicle: "all",
    category: "all",
    sort: "relevance",
  });

  const visible = React.useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    let list = parts;

    if (filters.vehicle !== "all") list = list.filter((p) => p.vehicle === filters.vehicle);
    if (filters.category !== "all") list = list.filter((p) => p.category === filters.category);

    if (q) {
      list = list.filter((p) => {
        const hay = `${p.name} ${p.category} ${p.vehicle} ${p.tags.join(" ")} ${p.compatibility.join(" ")}`.toLowerCase();
        return hay.includes(q);
      });
    }

    if (filters.sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (filters.sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    if (filters.sort === "rating") list = [...list].sort((a, b) => b.rating - a.rating);

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

        <FiltersBar categories={cats} value={filters} onChange={setFilters} />

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

        {visible.length === 0 ? (
          <Card className="border-border/50 p-12 text-center">
            <p className="text-muted-foreground">No products found. Try adjusting your filters.</p>
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
