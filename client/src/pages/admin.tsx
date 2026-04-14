import { Link } from "wouter";
import { FolderTree, LayoutGrid, Package, Plus, ScanLine, ShoppingBag, TrendingUp, AlertTriangle, Store } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useDashboardStats } from "@/lib/products";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function StatCard({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const toneClass =
    tone === "warning"
      ? "text-amber-600 bg-amber-500/10"
      : tone === "danger"
        ? "text-rose-600 bg-rose-500/10"
        : tone === "success"
          ? "text-emerald-600 bg-emerald-500/10"
          : "text-primary bg-primary/10";

  return (
    <Card className="border-border/50 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${toneClass}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

function AdminTile({
  title,
  description,
  icon,
  href,
  testId,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  testId: string;
}) {
  return (
    <Link href={href}>
      <a data-testid={testId} className="block">
        <Card className="border-border/50 p-6 transition-all hover:border-primary/50 hover:shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="mb-1 text-base font-semibold">{title}</div>
              <div className="text-sm text-muted-foreground">{description}</div>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
          </div>
        </Card>
      </a>
    </Link>
  );
}

export default function AdminDashboard() {
  usePageMeta({ title: "Admin", description: "Store management dashboard.", noindex: true });
  const { data: stats } = useDashboardStats();

  const stockWarning =
    stats && (stats.lowStockCount > 0 || stats.outOfStockCount > 0)
      ? `${stats.lowStockCount} low, ${stats.outOfStockCount} out`
      : undefined;

  const ebaySubtext =
    stats && stats.ebaySyncErrors > 0
      ? `${stats.ebaySyncErrors} sync error${stats.ebaySyncErrors > 1 ? "s" : ""}`
      : undefined;

  return (
    <SiteLayout>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="secondary" className="mb-3 rounded-md">
              Admin Dashboard
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Store Management
            </h1>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/inventory">
              <Button size="lg" variant="outline" className="gap-2" asChild>
                <a>
                  <ScanLine className="h-5 w-5" />
                  Scan Barcode
                </a>
              </Button>
            </Link>
            <Link href="/admin/new">
              <Button size="lg" className="gap-2" asChild>
                <a data-testid="link-admin-new">
                  <Plus className="h-5 w-5" />
                  Add Product
                </a>
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Products"
            value={stats?.totalProducts ?? "—"}
            sub={stockWarning}
            icon={<Package className="h-5 w-5" />}
            tone={stats?.outOfStockCount ? "warning" : "default"}
          />
          <StatCard
            label="Orders"
            value={stats?.totalOrders ?? "—"}
            sub={stats ? `${stats.recentOrderCount} this week` : undefined}
            icon={<ShoppingBag className="h-5 w-5" />}
          />
          <StatCard
            label="Revenue (Month)"
            value={stats ? `£${stats.revenueThisMonth.toFixed(2)}` : "—"}
            icon={<TrendingUp className="h-5 w-5" />}
            tone="success"
          />
          <StatCard
            label="eBay Listed"
            value={stats?.ebayListedCount ?? "—"}
            sub={ebaySubtext}
            icon={<Store className="h-5 w-5" />}
            tone={stats?.ebaySyncErrors ? "danger" : "default"}
          />
        </div>

        {/* Navigation tiles */}
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <AdminTile
            testId="tile-admin-parts"
            title="Products"
            description="Manage inventory and catalog"
            icon={<LayoutGrid className="h-6 w-6" />}
            href="/admin/parts"
          />
          <AdminTile
            testId="tile-admin-categories"
            title="Categories"
            description="Organize products"
            icon={<FolderTree className="h-6 w-6" />}
            href="/admin/categories"
          />
          <AdminTile
            testId="tile-admin-orders"
            title="Orders"
            description="Track and manage orders"
            icon={<Package className="h-6 w-6" />}
            href="/admin/orders"
          />
          <AdminTile
            testId="tile-admin-inventory"
            title="Barcode Scanner"
            description="Stock in with phone"
            icon={<ScanLine className="h-6 w-6" />}
            href="/admin/inventory"
          />
          <AdminTile
            testId="tile-admin-ebay"
            title="eBay Settings"
            description="Connection, policies, sync"
            icon={<Store className="h-6 w-6" />}
            href="/admin/ebay"
          />
          {stats && (stats.lowStockCount > 0 || stats.outOfStockCount > 0) && (
            <AdminTile
              testId="tile-admin-low-stock"
              title="Low Stock Alert"
              description={`${stats.lowStockCount + stats.outOfStockCount} products need attention`}
              icon={<AlertTriangle className="h-6 w-6" />}
              href="/admin/parts"
            />
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
