import React, { useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminLayout from "@/components/admin/AdminLayout";

const API = "/api";

type Order = {
  id: string;
  createdAt: string;
  status: string;
  totalPence: number;
  customerEmail?: string;
  customerName?: string;
  customerAddress?: string;
  customerPostcode?: string;
  items: { productName: string; quantity: number }[];
};

async function fetchOrder(id: string): Promise<Order> {
  const res = await fetch(`${API}/orders/${id}`, { credentials: "include" });
  if (!res.ok) throw new Error("Order not found");
  return res.json();
}

export default function AdminOrderLabel() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id ?? "";

  const { data: order, isLoading, error } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => fetchOrder(orderId),
    enabled: !!orderId,
  });

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @media print {
        body * { visibility: hidden; }
        .parcel-label-print, .parcel-label-print * { visibility: visible; }
        .parcel-label-print { position: absolute; left: 0; top: 0; width: 100%; }
        .no-print { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const handlePrint = () => window.print();

  if (!orderId) {
    return (
      <AdminLayout>
        <div className="p-8">
          <p className="text-muted-foreground">No order ID.</p>
          <Link href="/admin/orders">
            <Button variant="outline" className="mt-4" asChild>
              <a>Back to orders</a>
            </Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-8">
          <p className="text-muted-foreground">Loading order…</p>
        </div>
      </AdminLayout>
    );
  }

  if (error || !order) {
    return (
      <AdminLayout>
        <div className="p-8">
          <p className="text-destructive">Order not found.</p>
          <Link href="/admin/orders">
            <Button variant="outline" className="mt-4" asChild>
              <a>Back to orders</a>
            </Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const hasAddress = order.customerName || order.customerAddress || order.customerPostcode;

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="no-print mx-auto max-w-2xl flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/orders">
            <Button variant="ghost" size="sm" asChild>
              <a className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to orders
              </a>
            </Button>
          </Link>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print parcel label
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Use your browser&apos;s print dialog. Works with standard label sheets or thermal printers.
        </p>
        </div>

      <div
        className="parcel-label-print mx-auto bg-white text-black rounded-lg border-2 border-black p-6 shadow-lg"
        style={{
          width: "4in",
          minHeight: "6in",
          maxWidth: "100%",
        }}
      >
        <div className="flex flex-col h-full">
          <div className="text-xs text-gray-500 mb-2 font-mono">
            Order #{order.id.slice(0, 8)} · {new Date(order.createdAt).toLocaleDateString()}
          </div>

          <div className="border-2 border-dashed border-gray-400 p-4 flex-1 flex flex-col justify-center">
            <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Ship to</div>
            {hasAddress ? (
              <div className="text-lg font-medium leading-snug space-y-0.5">
                {order.customerName && <div>{order.customerName}</div>}
                {order.customerAddress && (
                  <div className="font-normal text-base">
                    {order.customerAddress.split(",").map((line, i) => (
                      <div key={i}>{line.trim()}</div>
                    ))}
                  </div>
                )}
                {order.customerPostcode && (
                  <div className="font-semibold mt-1">{order.customerPostcode}</div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 italic">No address on file</div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-300 text-sm text-gray-600">
            {order.items?.length ? (
              <span>{order.items.length} item(s): {order.items.map((i) => `${i.productName} × ${i.quantity}`).join(", ")}</span>
            ) : (
              <span>—</span>
            )}
          </div>
          <div className="mt-1 text-xs font-mono text-gray-500">
            {order.id}
          </div>
        </div>
      </div>
      </div>
    </AdminLayout>
  );
}
