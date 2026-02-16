import React from "react";
import SiteLayout from "@/components/site/SiteLayout";
import BackButton from "@/components/site/BackButton";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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

type Order = {
  id: string;
  createdAt: string;
  totalPence: number;
  status: string;
  paymentStatus: string;
  customerEmail?: string;
  customerName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  stripePaymentIntentId?: string;
  invoiceNumber?: string;
  invoiceSentAt?: string;
  shippingLabelUrl?: string;
  trackingNumber?: string;
  items: { productId: string; productName: string; quantity: number }[];
};

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

async function resendInvoice(orderId: string) {
  const res = await fetch(`${API}/admin/orders/${orderId}/invoice/resend`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? "Failed to resend invoice");
  }
  return res.json();
}

async function generateLabel(orderId: string) {
  const res = await fetch(`${API}/admin/orders/${orderId}/shipping-label`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? "Failed to generate shipping label");
  }
  return res.json();
}

async function submitFulfillmentScan(orderId: string, code: string, quantity = 1) {
  const res = await fetch(`${API}/admin/orders/${orderId}/fulfillment/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ code, quantity }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? "Failed to record fulfillment scan");
  }
  return res.json();
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

function ActionButtons({ order }: { order: Order }) {
  const queryClient = useQueryClient();
  const [working, setWorking] = React.useState(false);

  const onResendInvoice = async () => {
    setWorking(true);
    try {
      await resendInvoice(order.id);
      toast.success("Invoice sent");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invoice resend failed");
    } finally {
      setWorking(false);
    }
  };

  const onGenerateLabel = async () => {
    setWorking(true);
    try {
      const data = await generateLabel(order.id);
      toast.success(data.trackingNumber ? `Label generated (${data.trackingNumber})` : "Label generated");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Label generation failed");
    } finally {
      setWorking(false);
    }
  };

  const onFulfillmentScan = async () => {
    const code = window.prompt("Scan or enter barcode for this order:");
    if (!code?.trim()) return;

    setWorking(true);
    try {
      await submitFulfillmentScan(order.id, code.trim(), 1);
      toast.success("Fulfillment scan recorded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fulfillment scan failed");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" className="h-8" onClick={onResendInvoice} disabled={working || order.paymentStatus !== "paid"}>
        Resend Invoice
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8"
        onClick={onGenerateLabel}
        disabled={working || order.paymentStatus !== "paid" || order.status !== "processing"}
      >
        Generate Label
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8"
        onClick={onFulfillmentScan}
        disabled={working || order.paymentStatus !== "paid"}
      >
        Fulfillment Scan
      </Button>
      {order.shippingLabelUrl && (
        <a href={order.shippingLabelUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
          Label PDF
        </a>
      )}
    </div>
  );
}

export default function AdminOrders() {
  usePageMeta({ title: "Orders", description: "Track and manage orders.", noindex: true });
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
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Orders</h1>
            <p className="mt-2 text-muted-foreground">
              Includes payment status, shipping details, invoice state, and shipping label actions.
            </p>
          </div>
          <BackButton fallback="/admin" />
        </div>

        <Card className="border-border/50 overflow-hidden">
          {orders.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No orders yet.</div>
          ) : isMobile ? (
            <div className="divide-y divide-border/60">
              {orders.map((order: Order) => (
                <div key={order.id} className="flex flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{order.id.slice(0, 8)}…</span>
                    <OrderStatusSelect orderId={order.id} currentStatus={order.status ?? "pending"} onUpdated={() => {}} />
                  </div>
                  <div className="text-sm">{new Date(order.createdAt).toLocaleDateString()}</div>
                  <div className="text-xs text-muted-foreground">
                    Payment: <span className="font-medium">{order.paymentStatus || "awaiting_payment"}</span>
                  </div>
                  {(order.customerName || order.customerEmail) && (
                    <div className="text-sm text-muted-foreground">
                      {order.customerName && <span>{order.customerName}</span>}
                      {order.customerName && order.customerEmail && " · "}
                      {order.customerEmail && <span>{order.customerEmail}</span>}
                    </div>
                  )}
                  {(order.addressLine1 || order.city || order.postcode) && (
                    <div className="text-xs text-muted-foreground">
                      {[order.addressLine1, order.addressLine2, order.city, order.county, order.postcode, order.country]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    {order.items?.map((i) => `${i.productName} × ${i.quantity}`).join(", ") ?? "—"}
                  </div>
                  <div className="text-base font-medium tabular-nums">£{((order.totalPence ?? 0) / 100).toFixed(2)}</div>
                  {order.trackingNumber && <div className="text-xs text-muted-foreground">Tracking: {order.trackingNumber}</div>}
                  <ActionButtons order={order} />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer / Address</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invoice / Shipping</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order: Order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}…</TableCell>
                    <TableCell className="text-sm">{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-sm max-w-[280px]">
                      {order.customerName && <div>{order.customerName}</div>}
                      {order.customerEmail && <div className="text-muted-foreground">{order.customerEmail}</div>}
                      {(order.addressLine1 || order.city || order.postcode) && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {[order.addressLine1, order.addressLine2, order.city, order.county, order.postcode, order.country]
                            .filter(Boolean)
                            .join(", ")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm max-w-[260px]">
                      {order.items?.map((i) => `${i.productName} × ${i.quantity}`).join(", ") ?? "—"}
                    </TableCell>
                    <TableCell className="tabular-nums font-medium">£{((order.totalPence ?? 0) / 100).toFixed(2)}</TableCell>
                    <TableCell className="text-sm">
                      <div>{order.paymentStatus || "awaiting_payment"}</div>
                      {order.stripePaymentIntentId && (
                        <div className="text-xs text-muted-foreground font-mono">{order.stripePaymentIntentId.slice(0, 14)}…</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <OrderStatusSelect orderId={order.id} currentStatus={order.status ?? "pending"} onUpdated={() => {}} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {order.invoiceNumber && <div className="text-xs">{order.invoiceNumber}</div>}
                      {order.invoiceSentAt && <div className="text-xs text-muted-foreground">Sent</div>}
                      {order.trackingNumber && <div className="text-xs text-muted-foreground">Tracking: {order.trackingNumber}</div>}
                      <div className="mt-2">
                        <ActionButtons order={order} />
                      </div>
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
