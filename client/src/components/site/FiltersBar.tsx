import React from "react";
import { useLocation } from "wouter";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { PartCategory, VehicleType } from "@/lib/mockData";

export type CatalogFilters = {
  q: string;
  vehicle: "all" | VehicleType;
  category: "all" | PartCategory;
  sort: "relevance" | "price-asc" | "price-desc" | "rating";
};

function parseQuery(search: string): Partial<CatalogFilters> {
  const p = new URLSearchParams(search);
  const q = p.get("q") ?? "";
  const vehicle = (p.get("vehicle") ?? "all") as CatalogFilters["vehicle"];
  const category = (p.get("category") ?? "all") as CatalogFilters["category"];
  const sort = (p.get("sort") ?? "relevance") as CatalogFilters["sort"];
  return { q, vehicle, category, sort };
}

function toQuery(next: CatalogFilters) {
  const p = new URLSearchParams();
  if (next.q) p.set("q", next.q);
  if (next.vehicle !== "all") p.set("vehicle", next.vehicle);
  if (next.category !== "all") p.set("category", next.category);
  if (next.sort !== "relevance") p.set("sort", next.sort);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export default function FiltersBar({
  categories,
  value,
  onChange,
}: {
  categories: PartCategory[];
  value: CatalogFilters;
  onChange: (next: CatalogFilters) => void;
}) {
  const [loc, setLoc] = useLocation();

  React.useEffect(() => {
    const idx = loc.indexOf("?");
    const search = idx >= 0 ? loc.slice(idx) : "";
    const parsed = parseQuery(search);
    onChange({
      q: parsed.q ?? value.q,
      vehicle: parsed.vehicle ?? value.vehicle,
      category: parsed.category ?? value.category,
      sort: parsed.sort ?? value.sort,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const push = (next: CatalogFilters) => {
    onChange(next);
    setLoc(`/catalog${toQuery(next)}`);
  };

  const activeCount =
    (value.q ? 1 : 0) +
    (value.vehicle !== "all" ? 1 : 0) +
    (value.category !== "all" ? 1 : 0) +
    (value.sort !== "relevance" ? 1 : 0);

  const filterContent = (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center">
        <Input
          data-testid="input-catalog-search"
          value={value.q}
          onChange={(e) => push({ ...value, q: e.target.value })}
          placeholder="Search: chain, brake pads, 10×2.5…"
          className="h-11 w-full rounded-xl md:min-w-[200px]"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:flex md:items-center md:gap-2">
          <Select
            value={value.vehicle}
            onValueChange={(v) => push({ ...value, vehicle: v as CatalogFilters["vehicle"] })}
          >
            <SelectTrigger data-testid="select-vehicle" className="h-11 w-full rounded-xl sm:w-full md:w-auto">
              <SelectValue placeholder="Vehicle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem data-testid="option-vehicle-all" value="all">
                All vehicles
              </SelectItem>
              <SelectItem data-testid="option-vehicle-bike" value="bike">
                Bike
              </SelectItem>
              <SelectItem data-testid="option-vehicle-scooter" value="scooter">
                Scooter
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={value.category}
            onValueChange={(v) =>
              push({ ...value, category: v as CatalogFilters["category"] })
            }
          >
            <SelectTrigger data-testid="select-category" className="h-11 w-full rounded-xl sm:w-full md:w-auto">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem data-testid="option-category-all" value="all">
                All categories
              </SelectItem>
              {categories.map((c) => (
                <SelectItem data-testid={`option-category-${c}`} key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Select
          value={value.sort}
          onValueChange={(v) => push({ ...value, sort: v as CatalogFilters["sort"] })}
        >
          <SelectTrigger data-testid="select-sort" className="h-11 w-full rounded-xl sm:w-[180px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem data-testid="option-sort-relevance" value="relevance">
              Relevance
            </SelectItem>
            <SelectItem data-testid="option-sort-rating" value="rating">
              Top rated
            </SelectItem>
            <SelectItem data-testid="option-sort-price-asc" value="price-asc">
              Price: low to high
            </SelectItem>
            <SelectItem data-testid="option-sort-price-desc" value="price-desc">
              Price: high to low
            </SelectItem>
          </SelectContent>
        </Select>

        <Button
          data-testid="button-clear-filters"
          variant="secondary"
          className="h-11 w-full rounded-xl sm:w-auto"
          onClick={() => push({ q: "", vehicle: "all", category: "all", sort: "relevance" })}
        >
          Clear
          {activeCount ? (
            <Badge
              data-testid="badge-active-filters"
              className="ml-2 rounded-full bg-[hsl(var(--primary))]/12 text-[hsl(var(--primary))]"
            >
              {activeCount}
            </Badge>
          ) : null}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="glass rounded-2xl p-4 md:p-3">
      <div className="md:hidden">
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button
              data-testid="button-filters-toggle"
              variant="secondary"
              className="h-11 w-full rounded-xl"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {activeCount ? (
                <Badge className="ml-2 rounded-full bg-[hsl(var(--primary))]/12 text-[hsl(var(--primary))]">
                  {activeCount}
                </Badge>
              ) : null}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-4">{filterContent}</div>
          </CollapsibleContent>
        </Collapsible>
      </div>
      <div className="hidden md:block">{filterContent}</div>
    </div>
  );
}
