import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Printer, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";
import BackButton from "@/components/site/BackButton";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const API = "/api";

async function fetchOrders() {
  const res = await fetch(`${API}/orders`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch orders");
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

export default function AdminOrdersLabels() {
  usePageMeta({ title: "Print labels", description: "Print delivery labels for pending orders." });
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
  });

  const pendingOrders = orders.filter(
    (o: Order) => o.status === "pending" || o.status === "processing"
  );

  const handlePrintAll = () => {
    if (pendingOrders.length === 0) {
      toast.info("No pending orders to print");
      return;
    }
    pendingOrders.forEach((order: Order, i: number) => {
      setTimeout(() => {
        window.open(`/admin/orders/${order.id}/label`, "_blank", "noopener,noreferrer");
      }, i * 300);
    });
    toast.success(`Opening ${pendingOrders.length} label(s) in new tabs`);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="text-muted-foreground">Loading orders…</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Print labels
            </h1>
            <p className="mt-2 text-muted-foreground">
              Pending and processing orders only. Print one label or open all in new tabs.
            </p>
          </div>
          <BackButton fallback="/admin/orders" />
        </div>

        {pendingOrders.length > 0 && (
          <div className="flex items-center gap-3">
            <Button onClick={handlePrintAll} className="gap-2">
              <Printer className="h-4 w-4" />
              Print all ({pendingOrders.length})
            </Button>
            <Link href="/admin/orders">
              <a className="text-sm text-muted-foreground hover:text-foreground">View all orders</a>
            </Link>
          </div>
        )}

        <Card className="border-border/50 overflow-hidden">
          {pendingOrders.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No pending or processing orders. Labels are available from the{" "}
              <Link href="/admin/orders">
                <a className="text-primary hover:underline">Orders</a>
              </Link>{" "}
              page.
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {pendingOrders.map((order: Order) => (
                <li key={order.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">
                      #{order.id.slice(0, 8)} · £{((order.totalPence ?? 0) / 100).toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {order.customerName ?? "—"} · {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {order.items?.map((i) => `${i.productName} × ${i.quantity}`).join(", ") ?? "—"}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5" asChild>
                    <a href={`/admin/orders/${order.id}/label`} target="_blank" rel="noopener noreferrer">
                      <Printer className="h-3.5 w-3.5" />
                      Print label
                    </a>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
