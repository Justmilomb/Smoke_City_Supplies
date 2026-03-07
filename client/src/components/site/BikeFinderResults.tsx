import React from "react";
import { ArrowLeft, Package, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductCard from "./ProductCard";
import type { BikeFinderResult } from "@/lib/bike-finder";

type Props = {
  result: BikeFinderResult;
  onClear: () => void;
};

export default function BikeFinderResults({ result, onClear }: Props) {
  const allCategoryNames = result.categories.map((c) => c.name);
  const [activeTab, setActiveTab] = React.useState(allCategoryNames[0] || "all");

  if (result.totalCompatible === 0) {
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
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            <Button variant="outline" onClick={onClear} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Search for another bike
            </Button>
            <Button onClick={onClear} className="gap-2">
              View All Products
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            {result.totalCompatible} compatible part{result.totalCompatible !== 1 ? "s" : ""} for{" "}
            <span className="text-primary">{result.displayName}</span>
          </h2>
          <div className="mt-1 flex items-center gap-2">
            {result.fromCache && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Zap className="h-3 w-3" />
                Instant result
              </Badge>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onClear} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Search another bike
        </Button>
      </div>

      {/* Products */}
      {result.categories.length === 1 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {result.categories[0].products.map((p) => (
            <ProductCard key={p.id} part={p} />
          ))}
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex h-auto flex-wrap gap-1">
            {result.categories.map((cat) => (
              <TabsTrigger key={cat.name} value={cat.name} className="gap-1.5 text-sm">
                {cat.name}
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-xs">
                  {cat.products.length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {result.categories.map((cat) => (
            <TabsContent key={cat.name} value={cat.name} className="mt-4">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {cat.products.map((p) => (
                  <ProductCard key={p.id} part={p} />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
