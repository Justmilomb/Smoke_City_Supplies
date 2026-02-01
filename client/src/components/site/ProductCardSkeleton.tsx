import { Card } from "@/components/ui/card";

export default function ProductCardSkeleton() {
  return (
    <Card className="h-full overflow-hidden border border-border/50">
      <div className="aspect-square animate-pulse bg-muted/50" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
        <div className="h-6 w-20 rounded bg-muted animate-pulse" />
      </div>
    </Card>
  );
}
