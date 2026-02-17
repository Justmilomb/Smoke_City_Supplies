import React from "react";
import SiteLayout from "@/components/site/SiteLayout";
import BackButton from "@/components/site/BackButton";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  packedAt?: string;
  stockRevertedAt?: string;
  stockRevertReason?: string;
  shippingServiceLevel?: string;
  shippingRateId?: string;
  shippingAmountPence?: number;
  dispatchAdvice?: string;
  expectedShipDate?: string;
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

async function generateLabel(orderId: string, payload: {
  name: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
  selectedRateId?: string;
  selectedServiceCode?: string;
}) {
  const res = await fetch(`${API}/admin/orders/${orderId}/shipping-label`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const missing = Array.isArray(data?.missingFields) && data.missingFields.length ? ` (${data.missingFields.join(", ")})` : "";
    throw new Error((data.message ?? "Failed to generate shipping label") + missing);
  }
  return res.json();
}

async function submitFulfillmentScan(orderId: string, payload: { code?: string; productId?: string; quantity?: number }) {
  const res = await fetch(`${API}/admin/orders/${orderId}/fulfillment/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
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
  const [labelOpen, setLabelOpen] = React.useState(false);
  const [labelForm, setLabelForm] = React.useState({
    name: order.customerName || "",
    email: order.customerEmail || "",
    addressLine1: order.addressLine1 || "",
    addressLine2: order.addressLine2 || "",
    city: order.city || "",
    county: order.county || "",
    postcode: order.postcode || "",
    country: (order.country || "GB").toUpperCase(),
    selectedRateId: order.shippingRateId || "",
  });

  React.useEffect(() => {
    setLabelForm({
      name: order.customerName || "",
      email: order.customerEmail || "",
      addressLine1: order.addressLine1 || "",
      addressLine2: order.addressLine2 || "",
      city: order.city || "",
      county: order.county || "",
      postcode: order.postcode || "",
      country: (order.country || "GB").toUpperCase(),
      selectedRateId: order.shippingRateId || "",
    });
  }, [order.id, order.customerName, order.customerEmail, order.addressLine1, order.addressLine2, order.city, order.county, order.postcode, order.country, order.shippingRateId]);

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
      const data = await generateLabel(order.id, {
        name: labelForm.name.trim(),
        email: labelForm.email.trim() || undefined,
        addressLine1: labelForm.addressLine1.trim(),
        addressLine2: labelForm.addressLine2.trim() || undefined,
        city: labelForm.city.trim(),
        county: labelForm.county.trim() || undefined,
        postcode: labelForm.postcode.trim().toUpperCase(),
        country: (labelForm.country.trim() || "GB").toUpperCase(),
        selectedRateId: labelForm.selectedRateId.trim() || undefined,
      });
      toast.success(data.trackingNumber ? `Label generated (${data.trackingNumber})` : "Label generated");
      if (data.manualRoyalMailUrl) {
        window.open(data.manualRoyalMailUrl, "_blank", "noopener,noreferrer");
      }
      setLabelOpen(false);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Label generation failed");
    } finally {
      setWorking(false);
    }
  };

  const onPrintPackingSlip = () => {
    window.open(`${API}/admin/orders/${order.id}/packing-slip`, "_blank", "noopener,noreferrer");
  };

  const onFulfillmentScan = async () => {
    const code = window.prompt("Scan or enter barcode for this order:");
    let payload: { code?: string; productId?: string; quantity?: number };
    if (code?.trim()) {
      payload = { code: code.trim(), quantity: 1 };
    } else {
      const choices = order.items.map((item, idx) => `${idx + 1}. ${item.productName} (x${item.quantity})`).join("\n");
      const picked = window.prompt(`No barcode entered. Select packed product number:\n${choices}`);
      if (!picked?.trim()) return;
      const index = Number(picked.trim()) - 1;
      if (!Number.isInteger(index) || index < 0 || index >= order.items.length) {
        toast.error("Invalid product selection");
        return;
      }
      payload = { productId: order.items[index].productId, quantity: 1 };
    }

    setWorking(true);
    try {
      const data = await submitFulfillmentScan(order.id, payload);
      toast.success(data?.packed ? "Order fully packed" : "Packing progress recorded");
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
        onClick={() => setLabelOpen(true)}
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
      <Button variant="outline" size="sm" className="h-8" onClick={onPrintPackingSlip}>
        Packing Slip
      </Button>
      {order.shippingLabelUrl && (
        <a href={order.shippingLabelUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
          Label PDF
        </a>
      )}
      <Dialog open={labelOpen} onOpenChange={setLabelOpen}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>Prepare Royal Mail Label</DialogTitle>
            <DialogDescription>
              Confirm shipping details, then open Royal Mail to buy and print the label.
            </DialogDescription>
            <p className="text-xs text-muted-foreground">
              Shipping is fulfilled via Royal Mail. Confirm service terms in Royal Mail T&amp;Cs before purchasing labels.
            </p>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Name *</Label>
                <Input value={labelForm.name} onChange={(e) => setLabelForm((s) => ({ ...s, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input value={labelForm.email} onChange={(e) => setLabelForm((s) => ({ ...s, email: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Address Line 1 *</Label>
              <Input value={labelForm.addressLine1} onChange={(e) => setLabelForm((s) => ({ ...s, addressLine1: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Address Line 2</Label>
              <Input value={labelForm.addressLine2} onChange={(e) => setLabelForm((s) => ({ ...s, addressLine2: e.target.value }))} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>City *</Label>
                <Input value={labelForm.city} onChange={(e) => setLabelForm((s) => ({ ...s, city: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>County</Label>
                <Input value={labelForm.county} onChange={(e) => setLabelForm((s) => ({ ...s, county: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Postcode *</Label>
                <Input value={labelForm.postcode} onChange={(e) => setLabelForm((s) => ({ ...s, postcode: e.target.value.toUpperCase() }))} />
              </div>
              <div className="space-y-1">
                <Label>Country *</Label>
                <Input value={labelForm.country} onChange={(e) => setLabelForm((s) => ({ ...s, country: e.target.value.toUpperCase() }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Royal Mail Service *</Label>
              <Input
                placeholder="royal_mail_tracked_48_two_day_aim, royal_mail_next_day_aim, or royal_mail_next_day_guaranteed"
                value={labelForm.selectedRateId}
                onChange={(e) => setLabelForm((s) => ({ ...s, selectedRateId: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLabelOpen(false)} disabled={working}>
              Cancel
            </Button>
            <Button type="button" onClick={onGenerateLabel} disabled={working}>
              {working ? "Preparing..." : "Prepare Label"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
                  {order.shippingServiceLevel && (
                    <div className="text-xs text-muted-foreground">
                      {order.shippingServiceLevel} · £{((order.shippingAmountPence ?? 0) / 100).toFixed(2)}
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    {order.items?.map((i) => `${i.productName} × ${i.quantity}`).join(", ") ?? "—"}
                  </div>
                  <div className="text-base font-medium tabular-nums">£{((order.totalPence ?? 0) / 100).toFixed(2)}</div>
                  {order.trackingNumber && <div className="text-xs text-muted-foreground">Tracking: {order.trackingNumber}</div>}
                  {order.packedAt && <div className="text-xs text-emerald-700">Packed: {new Date(order.packedAt).toLocaleString()}</div>}
                  {order.stockRevertedAt && <div className="text-xs text-amber-700">Restocked: {new Date(order.stockRevertedAt).toLocaleString()}</div>}
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
                      {order.shippingServiceLevel && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {order.shippingServiceLevel} · £{((order.shippingAmountPence ?? 0) / 100).toFixed(2)}
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
                      {order.packedAt && <div className="text-xs text-emerald-700">Packed</div>}
                      {order.stockRevertedAt && <div className="text-xs text-amber-700">Restocked</div>}
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
