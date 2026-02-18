import { Link } from "wouter";
import { FolderTree, ImagePlus, LayoutGrid, Package, Plus, ScanLine } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

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

  const testResend = async () => {
    try {
      const res = await fetch("/api/admin/test/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ to: "support@smokecitysupplies.com" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Resend test failed");
      }
      toast.success("Resend test email sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Resend test failed");
    }
  };

  return (
    <SiteLayout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="secondary" className="mb-3 rounded-md">
              Admin Dashboard
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Store Management
            </h1>
            <p className="mt-2 text-muted-foreground">
              Manage your inventory, orders, and categories from one place
            </p>
          </div>
          <Link href="/admin/new">
            <Button size="lg" className="gap-2" asChild>
              <a data-testid="link-admin-new">
                <Plus className="h-5 w-5" />
                Add Product
              </a>
            </Button>
          </Link>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={testResend}>
            Test Resend
          </Button>
        </div>

        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <AdminTile
            testId="tile-admin-parts"
            title="Products"
            description="Manage inventory"
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
            description="Track shipments"
            icon={<Package className="h-6 w-6" />}
            href="/admin/orders"
          />
          <AdminTile
            testId="tile-admin-images"
            title="Upload Images"
            description="Add product photos"
            icon={<ImagePlus className="h-6 w-6" />}
            href="/admin/new"
          />
          <AdminTile
            testId="tile-admin-inventory"
            title="Barcode Scanner"
            description="Stock in with phone"
            icon={<ScanLine className="h-6 w-6" />}
            href="/admin/inventory"
          />
        </div>
      </div>
    </SiteLayout>
  );
}
