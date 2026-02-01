import React from "react";
import SiteLayout from "@/components/site/SiteLayout";
import BackButton from "@/components/site/BackButton";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const API = "/api";

const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;

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
  totalPence: number;
  status: string;
  customerEmail?: string;
  customerName?: string;
  items: { productName: string; quantity: number }[];
};

function OrderStatusSelect({
  orderId,
  currentStatus,
  onUpdated,
}: {
  orderId: string;
  currentStatus: string;
  onUpdated: () => void;
}) {
  const [value, setValue] = React.useState(currentStatus);
  const queryClient = useQueryClient();

  const handleChange = (newStatus: string) => {
    setValue(newStatus);
    updateOrderStatus(orderId, newStatus)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        onUpdated?.();
        toast.success("Order status updated");
      })
      .catch((err) => {
        setValue(currentStatus);
        toast.error(err.message ?? "Failed to update status");
      });
  };

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className="h-9 w-[140px] rounded-lg border">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ORDER_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function AdminOrders() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
  });
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="text-muted-foreground">Loading orders…</div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="flex flex-col gap-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Orders
            </h1>
            <p className="mt-2 text-muted-foreground">
              View and manage customer orders. Update status to track fulfillment.
            </p>
          </div>
          <BackButton fallback="/admin" />
        </div>

        <Card className="border-border/50 overflow-hidden">
          {orders.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No orders yet.
            </div>
          ) : isMobile ? (
            <div className="divide-y divide-border/60">
              {orders.map((order: Order) => (
                <div key={order.id} className="flex flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {order.id.slice(0, 8)}…
                    </span>
                    <OrderStatusSelect
                      orderId={order.id}
                      currentStatus={order.status ?? "pending"}
                      onUpdated={() => {}}
                    />
                  </div>
                  <div className="text-sm">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </div>
                  {(order.customerName || order.customerEmail) && (
                    <div className="text-sm text-muted-foreground">
                      {order.customerName && <span>{order.customerName}</span>}
                      {order.customerName && order.customerEmail && " · "}
                      {order.customerEmail && <span>{order.customerEmail}</span>}
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    {order.items?.map((i) => `${i.productName} × ${i.quantity}`).join(", ") ?? "—"}
                  </div>
                  <div className="text-base font-medium tabular-nums">
                    ${((order.totalPence ?? 0) / 100).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order: Order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}…</TableCell>
                    <TableCell className="text-sm">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {order.customerName || order.customerEmail ? (
                        <>
                          {order.customerName && <div>{order.customerName}</div>}
                          {order.customerEmail && (
                            <div className="text-muted-foreground">{order.customerEmail}</div>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {order.items?.map((i) => `${i.productName} × ${i.quantity}`).join(", ") ?? "—"}
                    </TableCell>
                    <TableCell className="tabular-nums font-medium">
                      ${((order.totalPence ?? 0) / 100).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <OrderStatusSelect
                        orderId={order.id}
                        currentStatus={order.status ?? "pending"}
                        onUpdated={() => {}}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </SiteLayout>
  );
}
