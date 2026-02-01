import { Link } from "wouter";
import { Boxes, FolderTree, ImagePlus, LayoutGrid, Package, Plus, Sparkles } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
        <Card className="glass rounded-3xl p-5 transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold">{title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{description}</div>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[hsl(var(--primary))]/12 text-[hsl(var(--primary))]">
              {icon}
            </span>
          </div>
        </Card>
      </a>
    </Link>
  );
}

export default function AdminDashboard() {
  return (
    <SiteLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge data-testid="badge-admin" className="rounded-full bg-[hsl(var(--primary))]/12 text-[hsl(var(--primary))]">
              <Sparkles className="mr-1 h-3.5 w-3.5" /> Admin
            </Badge>
            <h1 data-testid="text-admin-title" className="mt-2 font-[var(--font-serif)] text-3xl font-semibold tracking-tight">
              Store dashboard
            </h1>
            <p data-testid="text-admin-subtitle" className="mt-1 text-sm text-muted-foreground">
              Add parts, upload images, and keep your catalog tidy.
            </p>
          </div>
          <Link href="/admin/new">
            <Button data-testid="button-admin-new" asChild className="h-11 rounded-2xl">
              <a data-testid="link-admin-new">
                <Plus className="mr-2 h-4 w-4" /> Add new part
              </a>
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <AdminTile
            testId="tile-admin-parts"
            title="Parts"
            description="Edit, remove, and check stock"
            icon={<LayoutGrid className="h-5 w-5" />}
            href="/admin/parts"
          />
          <AdminTile
            testId="tile-admin-categories"
            title="Categories"
            description="Add and manage custom categories"
            icon={<FolderTree className="h-5 w-5" />}
            href="/admin/categories"
          />
          <AdminTile
            testId="tile-admin-images"
            title="Add part"
            description="Upload image and add new part"
            icon={<ImagePlus className="h-5 w-5" />}
            href="/admin/new"
          />
          <AdminTile
            testId="tile-admin-orders"
            title="Orders"
            description="View customer orders"
            icon={<Package className="h-5 w-5" />}
            href="/admin/orders"
          />
        </div>

        <Card className="glass rounded-3xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Boxes className="h-4 w-4 text-[hsl(var(--primary))]" />
                <div className="text-sm font-semibold">Starter checklist</div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Products and orders are saved. Add parts, track inventory, and view orders from the tiles above.
              </div>
            </div>
            <Badge data-testid="badge-prototype" variant="secondary" className="rounded-full">
              Live
            </Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              "Add 10–20 popular parts first",
              "Use clear names + sizes",
              "Mark low stock to create urgency",
            ].map((t, i) => (
              <div
                key={i}
                data-testid={`text-check-${i}`}
                className="rounded-2xl border border-border/70 bg-background/60 p-4 text-sm"
              >
                {t}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </SiteLayout>
  );
}
