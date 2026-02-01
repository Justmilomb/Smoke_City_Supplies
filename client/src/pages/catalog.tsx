import React from "react";
import { useLocation } from "wouter";
import { BookOpen, Info, Sparkles } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";
import { useCategories } from "@/lib/store";
import { useProducts } from "@/lib/products";
import FiltersBar, { type CatalogFilters } from "@/components/site/FiltersBar";
import ProductCard from "@/components/site/ProductCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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
        <div>
          <h1 data-testid="text-catalog-title" className="font-[var(--font-serif)] text-3xl font-semibold tracking-tight">
            Shop parts
          </h1>
          <p data-testid="text-catalog-subtitle" className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Filter by vehicle and category. If you’re not sure what something means, check the mini-dictionary.
          </p>
        </div>

        <FiltersBar categories={cats} value={filters} onChange={setFilters} />

        <Card className="glass rounded-3xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[hsl(var(--primary))]" />
                <div className="text-sm font-semibold">Beginner help</div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Quick explanations so new riders can shop confidently.
              </div>
            </div>
            <Badge data-testid="badge-dictionary" className="rounded-full bg-[hsl(var(--primary))]/12 text-[hsl(var(--primary))]">
              <Sparkles className="mr-1 h-3.5 w-3.5" /> Simple
            </Badge>
          </div>

          <div className="mt-4">
            <Tabs defaultValue={intentVehicle === "all" ? "bike" : intentVehicle}>
              <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-[hsl(var(--muted))] p-1">
                <TabsTrigger data-testid="tab-bike" value="bike" className="rounded-xl">
                  Bike terms
                </TabsTrigger>
                <TabsTrigger data-testid="tab-scooter" value="scooter" className="rounded-xl">
                  Scooter terms
                </TabsTrigger>
              </TabsList>
              <TabsContent value="bike" className="mt-4">
                <Accordion type="single" collapsible className="w-full">
                  {["Drivetrain", "Cassette", "Rotor", "Tubeless"].map((t) => (
                    <AccordionItem key={t} value={t}>
                      <AccordionTrigger data-testid={`accordion-${t}`}>{t}</AccordionTrigger>
                      <AccordionContent>
                        <div data-testid={`text-definition-${t}`} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Info className="mt-0.5 h-4 w-4 text-[hsl(var(--primary))]" />
                          {t === "Drivetrain" && "The parts that make the bike move (chain, cassette, crank)."}
                          {t === "Cassette" && "The gears on the rear wheel."}
                          {t === "Rotor" && "The disc that brake pads squeeze to stop you."}
                          {t === "Tubeless" && "A tire setup without an inner tube."}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </TabsContent>
              <TabsContent value="scooter" className="mt-4">
                <Accordion type="single" collapsible className="w-full">
                  {["Controller", "Inner tube", "Brake lever"].map((t) => (
                    <AccordionItem key={t} value={t}>
                      <AccordionTrigger data-testid={`accordion-${t}`}>{t}</AccordionTrigger>
                      <AccordionContent>
                        <div data-testid={`text-definition-${t}`} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Info className="mt-0.5 h-4 w-4 text-[hsl(var(--accent))]" />
                          {t === "Controller" && "The scooter’s brain that controls power."}
                          {t === "Inner tube" && "The inflatable tube inside some tires."}
                          {t === "Brake lever" && "The handlebar lever you pull to slow down/stop."}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </TabsContent>
            </Tabs>
          </div>
        </Card>

        <div className="flex items-center justify-between">
          <div data-testid="text-results-count" className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{visible.length}</span> items
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <ProductCard key={p.id} part={p} />
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}
