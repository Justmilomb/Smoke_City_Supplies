import React from "react";
import { ArrowLeft, Package, Zap, CheckCircle, HelpCircle, Globe, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductCard from "./ProductCard";
import type { BikeFinderResult } from "@/lib/bike-finder";

type Props = {
  result: BikeFinderResult;
  onClear: () => void;
  onSearchBike?: (bikeName: string) => void;
};

export default function BikeFinderResults({ result, onClear, onSearchBike }: Props) {
  const allCategoryNames = result.categories.map((c) => c.name);
  const [activeTab, setActiveTab] = React.useState(allCategoryNames[0] || "all");

  const matchLevel = result.matchLevel || (result.totalCompatible > 0 ? "exact" : "none");

  // No exact or family matches AND no universal products
  if (result.totalCompatible === 0 && !result.universalCategories?.length) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-border/50 bg-muted/30 px-8 py-12 text-center">
          <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <h3 className="mb-1 text-lg font-semibold text-foreground">
            No compatible parts found
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            We couldn't find parts for <span className="font-medium">{result.displayName}</span> in
            our current inventory.
          </p>
          <Button variant="outline" onClick={onClear} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Search for another bike
          </Button>
        </div>
        {result.suggestedBikes && result.suggestedBikes.length > 0 && (
          <SuggestedBikes bikes={result.suggestedBikes} onSearchBike={onSearchBike} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {matchLevel === "exact" && (
            <h2 className="text-lg font-bold text-foreground">
              {result.totalCompatible} compatible part{result.totalCompatible !== 1 ? "s" : ""} for{" "}
              <span className="text-primary">{result.displayName}</span>
            </h2>
          )}
          {matchLevel === "family" && (
            <>
              <h2 className="text-lg font-bold text-foreground">
                Parts for other {result.displayName.split(" ")[0]} models that may also fit{" "}
                <span className="text-primary">{result.displayName}</span>
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                These parts are listed for other {result.displayName.split(" ")[0]} bikes and may be compatible.
              </p>
            </>
          )}
          {(matchLevel === "universal" || matchLevel === "none") && (
            <>
              <h2 className="text-lg font-bold text-foreground">
                Products for <span className="text-primary">{result.displayName}</span>
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                We don't have bike-specific parts for this model yet. Here are products that work with any motorcycle.
              </p>
            </>
          )}
          <div className="mt-1 flex items-center gap-2">
            {result.fromCache && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Zap className="h-3 w-3" />
                Instant result
              </Badge>
            )}
            {matchLevel === "exact" && (
              <Badge variant="outline" className="gap-1 text-xs text-green-600 border-green-200">
                <CheckCircle className="h-3 w-3" />
                Confirmed compatible
              </Badge>
            )}
            {matchLevel === "family" && (
              <Badge variant="outline" className="gap-1 text-xs text-amber-600 border-amber-200">
                <HelpCircle className="h-3 w-3" />
                May also fit
              </Badge>
            )}
            {(matchLevel === "universal" || matchLevel === "none") && (
              <Badge variant="outline" className="gap-1 text-xs text-blue-600 border-blue-200">
                <Globe className="h-3 w-3" />
                Universal
              </Badge>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onClear} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Search another bike
        </Button>
      </div>

      {/* Main compatible products (exact or family) */}
      {result.categories.length > 0 && (
        <ProductCategoryGrid categories={result.categories} activeTab={activeTab} onTabChange={setActiveTab} />
      )}

      {/* Universal products section */}
      {result.universalCategories && result.universalCategories.length > 0 && (
        <div className="space-y-4">
          <div className="border-t border-border/50 pt-4">
            <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Globe className="h-4 w-4 text-blue-500" />
              Universal Products
              {result.totalUniversal != null && (
                <Badge variant="secondary" className="ml-1 text-xs">{result.totalUniversal}</Badge>
              )}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              These products work with any motorcycle.
            </p>
          </div>
          <ProductCategoryGrid
            categories={result.universalCategories}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabPrefix="universal-"
          />
        </div>
      )}

      {/* Suggested similar bikes */}
      {result.suggestedBikes && result.suggestedBikes.length > 0 && (
        <SuggestedBikes bikes={result.suggestedBikes} onSearchBike={onSearchBike} />
      )}
    </div>
  );
}

function ProductCategoryGrid({
  categories,
  activeTab,
  onTabChange,
  tabPrefix = "",
}: {
  categories: Array<{ name: string; products: any[] }>;
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabPrefix?: string;
}) {
  if (categories.length === 1) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {categories[0].products.map((p) => (
          <ProductCard key={p.id} part={p} />
        ))}
      </div>
    );
  }

  const tabValue = activeTab.startsWith(tabPrefix) ? activeTab : `${tabPrefix}${categories[0]?.name}`;

  return (
    <Tabs value={tabValue} onValueChange={onTabChange}>
      <TabsList className="flex h-auto flex-wrap gap-1">
        {categories.map((cat) => (
          <TabsTrigger key={`${tabPrefix}${cat.name}`} value={`${tabPrefix}${cat.name}`} className="gap-1.5 text-sm">
            {cat.name}
            <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-xs">
              {cat.products.length}
            </Badge>
          </TabsTrigger>
        ))}
      </TabsList>

      {categories.map((cat) => (
        <TabsContent key={`${tabPrefix}${cat.name}`} value={`${tabPrefix}${cat.name}`} className="mt-4">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cat.products.map((p) => (
              <ProductCard key={p.id} part={p} />
            ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}

function SuggestedBikes({
  bikes,
  onSearchBike,
}: {
  bikes: string[];
  onSearchBike?: (bikeName: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Search className="h-4 w-4 text-muted-foreground" />
        We have specific parts for these similar bikes:
      </h4>
      <div className="flex flex-wrap gap-2">
        {bikes.map((bike) => (
          <Button
            key={bike}
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => onSearchBike?.(bike)}
          >
            {bike}
          </Button>
        ))}
      </div>
    </div>
  );
}
