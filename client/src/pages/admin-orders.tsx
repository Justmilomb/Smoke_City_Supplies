import React from "react";
import SiteLayout from "@/components/site/SiteLayout";
import BackButton from "@/components/site/BackButton";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Printer } from "lucide-react";

const API = "/api";

const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;

async function fetchOrders() {
  const res = await fetch(`${API}/orders`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch orders");
  return res.json();
}

async function updateOrder(orderId: string, patch: { status?: string; trackingNumber?: string | null }) {
  const res = await fetch(`${API}/orders/${orderId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(patch),
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
  customerAddress?: string;
  customerPostcode?: string;
  items: { productName: string; quantity: number }[];
  trackingNumber?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
};

function ShipToAddress({ order }: { order: Order }) {
  const has = order.customerName || order.customerAddress || order.customerPostcode;
  if (!has) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="text-sm leading-tight">
      {order.customerName && <div className="font-medium">{order.customerName}</div>}
      {order.customerAddress && (
        <div className="text-muted-foreground">
          {order.customerAddress.split(",").map((line, i) => (
            <div key={i}>{line.trim()}</div>
          ))}
        </div>
      )}
      {order.customerPostcode && <div className="font-medium">{order.customerPostcode}</div>}
    </div>
  );
}

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
    updateOrder(orderId, { status: newStatus })
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

function OrderTrackingInput({
  orderId,
  currentTracking,
  onUpdated,
}: {
  orderId: string;
  currentTracking: string | null | undefined;
  onUpdated: () => void;
}) {
  const [value, setValue] = React.useState(currentTracking ?? "");
  const [saving, setSaving] = React.useState(false);
  const queryClient = useQueryClient();

  const save = () => {
    const v = value.trim() || null;
    if (v === (currentTracking ?? "")) return;
    setSaving(true);
    updateOrder(orderId, { trackingNumber: v })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        onUpdated?.();
        toast.success("Tracking number saved");
      })
      .catch((err) => {
        toast.error(err.message ?? "Failed to save");
      })
      .finally(() => setSaving(false));
  };

  return (
    <input
      type="text"
      placeholder="Tracking number"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => e.key === "Enter" && save()}
      className="h-9 w-full max-w-[180px] rounded-lg border border-input bg-background px-2 text-sm"
      disabled={saving}
    />
  );
}

export default function AdminOrders() {
  usePageMeta({ title: "Orders", description: "Track and manage orders." });
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
              View and manage customer orders. Status and tracking are saved to the database and persist across restarts.
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
                  {(order.shippedAt || order.deliveredAt) && (
                    <div className="text-xs text-muted-foreground">
                      {order.shippedAt && <span>Shipped {new Date(order.shippedAt).toLocaleDateString()}</span>}
                      {order.shippedAt && order.deliveredAt && " · "}
                      {order.deliveredAt && <span>Delivered {new Date(order.deliveredAt).toLocaleDateString()}</span>}
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Tracking</div>
                    <OrderTrackingInput
                      orderId={order.id}
                      currentTracking={order.trackingNumber}
                      onUpdated={() => {}}
                    />
                  </div>
                  <div className="text-sm">
                    <div className="text-xs text-muted-foreground mb-0.5">Ship to</div>
                    <ShipToAddress order={order} />
                  </div>
                  {order.customerEmail && (
                    <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5" asChild>
                      <a href={`/admin/orders/${order.id}/label`} target="_blank" rel="noopener noreferrer">
                        <Printer className="h-3.5 w-3.5" />
                        Print label
                      </a>
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {order.items?.map((i) => `${i.productName} × ${i.quantity}`).join(", ") ?? "—"}
                  </div>
                  <div className="text-base font-medium tabular-nums">
                    £{((order.totalPence ?? 0) / 100).toFixed(2)}
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
                  <TableHead>Ship to</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tracking / Delivery</TableHead>
                  <TableHead className="w-[100px]">Label</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order: Order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}…</TableCell>
                    <TableCell className="text-sm">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm max-w-[180px]">
                      <ShipToAddress order={order} />
                      {order.customerEmail && (
                        <div className="text-xs text-muted-foreground mt-0.5">{order.customerEmail}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {order.items?.map((i) => `${i.productName} × ${i.quantity}`).join(", ") ?? "—"}
                    </TableCell>
                    <TableCell className="tabular-nums font-medium">
                      £{((order.totalPence ?? 0) / 100).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <OrderStatusSelect
                        orderId={order.id}
                        currentStatus={order.status ?? "pending"}
                        onUpdated={() => {}}
                      />
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="space-y-1">
                        <OrderTrackingInput
                          orderId={order.id}
                          currentTracking={order.trackingNumber}
                          onUpdated={() => {}}
                        />
                        {(order.shippedAt || order.deliveredAt) && (
                          <div className="text-xs text-muted-foreground">
                            {order.shippedAt && <span>Shipped {new Date(order.shippedAt).toLocaleDateString()}</span>}
                            {order.shippedAt && order.deliveredAt && " · "}
                            {order.deliveredAt && <span>Delivered {new Date(order.deliveredAt).toLocaleDateString()}</span>}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" className="gap-1.5" asChild>
                        <a href={`/admin/orders/${order.id}/label`} target="_blank" rel="noopener noreferrer">
                          <Printer className="h-3.5 w-3.5" />
                          Print
                        </a>
                      </Button>
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
