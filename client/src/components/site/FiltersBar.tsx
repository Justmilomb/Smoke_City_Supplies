import React from "react";
import { useLocation } from "wouter";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card } from "@/components/ui/card";
import {
  MOTORCYCLE_MANUFACTURERS,
  MOTORCYCLE_MODELS,
  PART_BRANDS,
  type PartCategory,
  type VehicleType,
} from "@/lib/mockData";

export type CatalogFilters = {
  q: string;
  vehicle: "all" | VehicleType;
  category: "all" | PartCategory;
  sort: "relevance" | "price-asc" | "price-desc" | "rating" | "newest";
  model: string;
  brands: string[];
  priceMin: number | "";
  priceMax: number | "";
  inStockOnly: boolean;
};

const DEFAULT_FILTERS: CatalogFilters = {
  q: "",
  vehicle: "all",
  category: "all",
  sort: "relevance",
  model: "",
  brands: [],
  priceMin: "",
  priceMax: "",
  inStockOnly: false,
};

function parseQuery(search: string): Partial<CatalogFilters> {
  const p = new URLSearchParams(search);
  const q = p.get("q") ?? "";
  const vehicleRaw = p.get("vehicle");
  const vehicle: CatalogFilters["vehicle"] =
    vehicleRaw === "bike" || vehicleRaw === "scooter" || vehicleRaw === "motorcycle"
      ? vehicleRaw
      : "all";
  const categoryRaw = p.get("category");
  const category: CatalogFilters["category"] =
    categoryRaw && categoryRaw !== "all" ? (categoryRaw as CatalogFilters["category"]) : "all";
  const sortRaw = p.get("sort");
  const sort: CatalogFilters["sort"] =
    sortRaw === "price-asc" ||
    sortRaw === "price-desc" ||
    sortRaw === "rating" ||
    sortRaw === "newest"
      ? sortRaw
      : "relevance";
  const model = p.get("model") ?? "";
  const brandsParam = p.get("brands");
  const brands = brandsParam ? brandsParam.split(",").filter(Boolean) : [];
  const parseOptionalNumber = (value: string | null): number | "" => {
    if (value === null || value === "") return "";
    const n = Number(value);
    return Number.isFinite(n) ? n : "";
  };
  const priceMin = parseOptionalNumber(p.get("priceMin"));
  const priceMax = parseOptionalNumber(p.get("priceMax"));
  const inStockOnly = p.get("inStock") === "1";
  return { q, vehicle, category, sort, model, brands, priceMin, priceMax, inStockOnly };
}

function toQuery(next: CatalogFilters) {
  const p = new URLSearchParams();
  if (next.q) p.set("q", next.q);
  if (next.vehicle !== "all") p.set("vehicle", next.vehicle);
  if (next.category !== "all") p.set("category", next.category);
  if (next.sort !== "relevance") p.set("sort", next.sort);
  if (next.model) p.set("model", next.model);
  if (next.brands.length > 0) p.set("brands", next.brands.join(","));
  if (next.priceMin !== "") p.set("priceMin", String(next.priceMin));
  if (next.priceMax !== "") p.set("priceMax", String(next.priceMax));
  if (next.inStockOnly) p.set("inStock", "1");
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

  const [searchInput, setSearchInput] = React.useState(value.q);
  const searchDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setSearchInput(value.q);
  }, [value.q]);

  React.useEffect(() => {
    const idx = loc.indexOf("?");
    const search = idx >= 0 ? loc.slice(idx) : "";
    const parsed = parseQuery(search);
    onChange({
      ...DEFAULT_FILTERS,
      ...parsed,
    });
  }, [loc, onChange]);

  const push = (next: CatalogFilters) => {
    onChange(next);
    const path = loc.indexOf("?") >= 0 ? loc.slice(0, loc.indexOf("?")) : loc;
    const base = path || "/";
    setLoc(base + toQuery(next));
  };

  const handleSearchChange = (q: string) => {
    setSearchInput(q);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      push({ ...value, q });
      searchDebounceRef.current = null;
    }, 300);
  };

  const activeCount =
    (value.q ? 1 : 0) +
    (value.vehicle !== "all" ? 1 : 0) +
    (value.category !== "all" ? 1 : 0) +
    (value.sort !== "relevance" ? 1 : 0) +
    (value.model ? 1 : 0) +
    (value.brands.length > 0 ? 1 : 0) +
    (value.priceMin !== "" || value.priceMax !== "" ? 1 : 0) +
    (value.inStockOnly ? 1 : 0);

  const filterContent = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center">
          <Input
            data-testid="input-catalog-search"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search parts, brands, part numbers…"
            className="h-10 w-full rounded-lg border md:min-w-[280px]"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:flex md:items-center md:gap-3">
            <Select
              value={value.vehicle}
              onValueChange={(v) => push({ ...value, vehicle: v as CatalogFilters["vehicle"] })}
            >
              <SelectTrigger data-testid="select-vehicle" className="h-10 w-full rounded-lg md:w-[160px]">
                <SelectValue placeholder="Vehicle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem data-testid="option-vehicle-all" value="all">
                  All Vehicles
                </SelectItem>
                <SelectItem data-testid="option-vehicle-bike" value="bike">
                  Bike
                </SelectItem>
                <SelectItem data-testid="option-vehicle-scooter" value="scooter">
                  Scooter
                </SelectItem>
                <SelectItem data-testid="option-vehicle-motorcycle" value="motorcycle">
                  Motorcycle
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={value.model || "all"}
              onValueChange={(v) => push({ ...value, model: v === "all" ? "" : v })}
            >
              <SelectTrigger data-testid="select-model" className="h-10 w-full rounded-lg md:w-[180px]">
                <SelectValue placeholder="Motorcycle model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All models</SelectItem>
                {MOTORCYCLE_MANUFACTURERS.map((mfr) => (
                  <SelectGroup key={mfr}>
                    <SelectLabel>{mfr}</SelectLabel>
                    {MOTORCYCLE_MODELS.filter((m) => m.startsWith(mfr)).map((model) => (
                      <SelectItem key={model} value={model} data-testid={`option-model-${model}`}>
                        {model.replace(mfr + " ", "")}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={value.category}
              onValueChange={(v) =>
                push({ ...value, category: v as CatalogFilters["category"] })
              }
            >
              <SelectTrigger data-testid="select-category" className="h-10 w-full rounded-lg md:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem data-testid="option-category-all" value="all">
                  All Categories
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
            <SelectTrigger data-testid="select-sort" className="h-10 w-full rounded-lg sm:w-[180px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem data-testid="option-sort-relevance" value="relevance">
                Relevance
              </SelectItem>
              <SelectItem data-testid="option-sort-rating" value="rating">
                Highest Rated
              </SelectItem>
              <SelectItem data-testid="option-sort-price-asc" value="price-asc">
                Price: Low to High
              </SelectItem>
              <SelectItem data-testid="option-sort-price-desc" value="price-desc">
                Price: High to Low
              </SelectItem>
              <SelectItem data-testid="option-sort-newest" value="newest">
                Newest
              </SelectItem>
            </SelectContent>
          </Select>

          {activeCount > 0 && (
            <Button
              data-testid="button-clear-filters"
              variant="outline"
              className="h-10 gap-2 rounded-lg"
              onClick={() => push(DEFAULT_FILTERS)}
            >
              <X className="h-4 w-4" />
              Clear ({activeCount})
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-border/50 pt-4">
        <div className="flex items-center gap-2">
          <Switch
            id="in-stock"
            checked={value.inStockOnly}
            onCheckedChange={(checked) => push({ ...value, inStockOnly: checked })}
          />
          <Label htmlFor="in-stock" className="text-sm cursor-pointer">
            In stock only
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground">Price (£)</Label>
          <Input
            type="number"
            min={0}
            step={1}
            placeholder="Min"
            className="h-9 w-24"
            value={value.priceMin === "" ? "" : value.priceMin}
            onChange={(e) => {
              const v = e.target.value;
              push({ ...value, priceMin: v === "" ? "" : (Number(v) || 0) });
            }}
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="number"
            min={0}
            step={1}
            placeholder="Max"
            className="h-9 w-24"
            value={value.priceMax === "" ? "" : value.priceMax}
            onChange={(e) => {
              const v = e.target.value;
              push({ ...value, priceMax: v === "" ? "" : (Number(v) || 0) });
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Brand:</span>
          {PART_BRANDS.map((brand) => (
            <label key={brand} className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox
                checked={value.brands.includes(brand)}
                onCheckedChange={(checked) => {
                  const next = checked
                    ? [...value.brands, brand]
                    : value.brands.filter((b) => b !== brand);
                  push({ ...value, brands: next });
                }}
              />
              <span className="text-sm">{brand}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <Card className="border-border/50 p-4 md:p-5">
      <div className="md:hidden">
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button
              data-testid="button-filters-toggle"
              variant="outline"
              className="h-10 w-full gap-2 rounded-lg"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeCount > 0 && (
                <Badge variant="secondary" className="ml-auto rounded-md">
                  {activeCount}
                </Badge>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-4">{filterContent}</div>
          </CollapsibleContent>
        </Collapsible>
      </div>
      <div className="hidden md:block">{filterContent}</div>
    </Card>
  );
}
