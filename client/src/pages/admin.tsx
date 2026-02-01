import React from "react";
import { Link } from "wouter";
import { FolderTree, ImagePlus, LayoutGrid, Package, Plus, Printer } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useProducts } from "@/lib/products";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const API = "/api";

async function fetchOrders() {
  const res = await fetch(`${API}/orders`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch orders");
  return res.json();
}

async function updateOrderStatus(orderId: string, status: string) {
  const res = await fetch(`${API}/orders/${orderId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? "Failed to update order");
  }
  return res.json();
}

type Order = {
  id: string;
  createdAt: string;
  status: string;
  totalPence: number;
  customerName?: string;
  items: { productName: string; quantity: number }[];
};

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
  usePageMeta({ title: "Admin", description: "Store management dashboard." });
  const queryClient = useQueryClient();
  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
  });
  const { data: products = [] } = useProducts();

  const pendingCount = orders.filter(
    (o: Order) => o.status === "pending" || o.status === "processing"
  ).length;
  const recentOrders = [...orders]
    .sort((a: Order, b: Order) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const handleMarkShipped = (orderId: string) => {
    updateOrderStatus(orderId, "shipped")
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        toast.success("Order marked as shipped");
      })
      .catch((err) => toast.error(err.message ?? "Failed to update"));
  };

  return (
    <AdminLayout>
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

        <div className="flex flex-wrap gap-4 rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Pending orders:</span>
            <span className="text-xl font-semibold tabular-nums">{pendingCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Products:</span>
            <span className="text-xl font-semibold tabular-nums">{products.length}</span>
          </div>
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
            title="Orders & labels"
            description="Track orders & print labels"
            icon={<Printer className="h-6 w-6" />}
            href="/admin/orders"
          />
          <AdminTile
            testId="tile-admin-images"
            title="Upload Images"
            description="Add product photos"
            icon={<ImagePlus className="h-6 w-6" />}
            href="/admin/new"
          />
        </div>

        {recentOrders.length > 0 && (
          <Card className="border-border/50 overflow-hidden">
            <div className="border-b border-border/60 p-4">
              <h2 className="font-semibold">Recent orders</h2>
              <p className="text-sm text-muted-foreground">
                Quick actions: print label or mark shipped
              </p>
            </div>
            <ul className="divide-y divide-border/60">
              {recentOrders.map((order: Order) => (
                <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">
                      #{order.id.slice(0, 8)} · {(order.totalPence / 100).toFixed(2)} GBP
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {order.customerName ?? "—"} · {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {order.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`/admin/orders/${order.id}/label`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <Printer className="h-3.5 w-3.5" />
                        Print label
                      </Button>
                    </a>
                    {(order.status === "pending" || order.status === "processing") && (
                      <Button
                        size="sm"
                        onClick={() => handleMarkShipped(order.id)}
                      >
                        Mark shipped
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-border/60 p-3 text-center">
              <Link href="/admin/orders">
                <a className="text-sm font-medium text-primary hover:underline">
                  View all orders →
                </a>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
