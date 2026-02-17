import React from "react";
import { Link, useLocation } from "wouter";
import { ScanLine, PackagePlus, X } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";
import BackButton from "@/components/site/BackButton";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { BrowserMultiFormatReader } from "@zxing/browser";

type Resolved = {
  barcode: { code: string; format?: string };
  product: { id: string; name: string; quantity: number; stock: string };
};

type InventoryTx = {
  id: string;
  productId: string;
  type: string;
  quantityDelta: number;
  reason?: string;
  createdAt: string;
};

export default function AdminInventory() {
  usePageMeta({ title: "Inventory Scanner", description: "Scan barcodes to manage stock.", noindex: true });

  const [, setLoc] = useLocation();
  const [scanValue, setScanValue] = React.useState("");
  const [scanFormat, setScanFormat] = React.useState("unknown");
  const [qty, setQty] = React.useState(1);
  const [resolved, setResolved] = React.useState<Resolved | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [transactions, setTransactions] = React.useState<InventoryTx[]>([]);
  const [scanning, setScanning] = React.useState(false);
  const [scanSource, setScanSource] = React.useState<"native" | "zxing" | "">("");
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const stopScanRef = React.useRef<(() => void) | null>(null);

  const requestRearCameraStream = async () => {
    const attempts: MediaStreamConstraints[] = [
      {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      },
      {
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
      { video: true },
    ];

    let lastErr: unknown = null;
    for (const constraints of attempts) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error("Unable to access camera");
  };


  const loadTransactions = React.useCallback(async () => {
    const res = await fetch("/api/admin/inventory/transactions?limit=12", { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    setTransactions(Array.isArray(data) ? data : []);
  }, []);

  React.useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const resolveBarcode = async (code = scanValue) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);

    try {
      const res = await fetch("/api/admin/barcodes/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: trimmed, format: scanFormat }),
      });

      if (res.status === 404) {
        const payload = await res.json().catch(() => ({}));
        const barcode = payload?.code || trimmed;
        toast.info("Unknown barcode. Please create the product first.");
        setLoc(`/admin/new?barcode=${encodeURIComponent(barcode)}&format=${encodeURIComponent(scanFormat)}`);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to resolve barcode");
      }

      const data = await res.json();
      setResolved(data);
      setScanValue(trimmed);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  };

  const stockIn = async () => {
    if (!scanValue.trim()) {
      toast.error("Scan or enter a barcode first");
      return;
    }
    if (qty < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/inventory/stock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: scanValue.trim(), quantity: qty, reason: "Admin stock-in" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to stock in");
      }

      const updated = await res.json();
      toast.success(`Stock updated for ${updated.name}`);
      setResolved((prev) =>
        prev
          ? {
              ...prev,
              product: {
                ...prev.product,
                quantity: updated.quantity,
                stock: updated.stock,
              },
            }
          : prev
      );
      loadTransactions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Stock update failed");
    } finally {
      setLoading(false);
    }
  };

  const stopScanning = React.useCallback(() => {
    stopScanRef.current?.();
    stopScanRef.current = null;
    const video = videoRef.current;
    if (video?.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }
    setScanning(false);
    setScanSource("");
  }, []);

  const startCameraScan = async () => {
    if (!window.isSecureContext) {
      toast.error("Camera scanning requires HTTPS (or localhost). Open the site over a secure connection.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("This browser does not support camera access. Try Chrome on your phone.");
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    const Detector = (window as any).BarcodeDetector;

    try {
      const stream = await requestRearCameraStream();
      video.srcObject = stream;
      await video.play();

      if (Detector) {
        const supported = await Detector.getSupportedFormats?.();
        const detector = new Detector({ formats: supported || ["ean_13", "ean_8", "code_128", "upc_a", "upc_e"] });
        setScanSource("native");
        setScanning(true);

        let active = true;
        stopScanRef.current = () => { active = false; };
        const startedAt = Date.now();

        const tryScan = async () => {
          if (!active) return;
          if (Date.now() - startedAt > 30000) {
            stopScanning();
            toast.error("No barcode detected. Try better lighting or manual barcode entry.");
            return;
          }
          const codes = await detector.detect(video);
          if (codes.length > 0) {
            const c = codes[0];
            const raw = c.rawValue || "";
            if (raw) {
              setScanValue(raw);
              setScanFormat(String((c as any).format || "unknown"));
              stopScanning();
              await resolveBarcode(raw);
              return;
            }
          }
          requestAnimationFrame(tryScan);
        };

        requestAnimationFrame(tryScan);
        return;
      }

      // Safari and other browsers fallback.
      const reader = new BrowserMultiFormatReader();
      setScanSource("zxing");
      setScanning(true);
      let done = false;

      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } } },
        video,
        async (result, _error, callbackControls) => {
          if (!result) return;
          const raw = result.getText?.() || "";
          if (!raw) return;
          done = true;
          callbackControls.stop();
          setScanValue(raw);
          setScanFormat("unknown");
          stopScanning();
          await resolveBarcode(raw);
        }
      );

      stopScanRef.current = () => {
        if (!done) {
          done = true;
          controls.stop();
        }
      };

      window.setTimeout(() => {
        if (done) return;
        stopScanning();
        toast.error("No barcode detected. Try better lighting or manual barcode entry.");
      }, 30000);
    } catch (err) {
      stopScanning();
      const message = err instanceof Error ? err.message : "Camera scan failed";
      if (message.toLowerCase().includes("denied") || message.toLowerCase().includes("notallowed")) {
        toast.error("Camera permission denied. Allow camera access for this site and try again.");
        return;
      }
      if (message.toLowerCase().includes("notfound")) {
        toast.error("No camera found on this device.");
        return;
      }
      toast.error(message);
    }
  };

  return (
    <SiteLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Inventory Scanner</h1>
            <p className="mt-2 text-muted-foreground">Use your phone camera to scan barcodes for stock management.</p>
          </div>
          <BackButton fallback="/admin" />
        </div>

        <Card className="p-5 border-border/50 space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            Use this page on your phone for best barcode scanning performance.
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <Input
              value={scanValue}
              onChange={(e) => setScanValue(e.target.value)}
              placeholder="Scan or enter barcode"
              className="h-11 rounded-lg"
            />
            <Button className="h-11 gap-2" variant="outline" onClick={startCameraScan} disabled={loading || scanning}>
              <ScanLine className="h-4 w-4" />
              {scanning ? `Scanning (${scanSource || "camera"})...` : "Scan"}
            </Button>
            <Button className="h-11" onClick={() => resolveBarcode()} disabled={loading}>
              Find Product
            </Button>
          </div>

          {/* Camera preview */}
          <div className={`relative overflow-hidden rounded-lg bg-black ${scanning ? "block" : "hidden"}`}>
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="w-full aspect-[4/3] object-cover"
            />
            {/* Viewfinder overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 border-[3px] border-white/20 rounded-lg" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-1/3 border-2 border-white/60 rounded-md" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[0.5px] w-3/4 h-[1px] bg-red-500/70" />
            </div>
            {/* Cancel button */}
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-3 right-3 h-9 gap-1.5 bg-black/60 hover:bg-black/80 text-white border-0"
              onClick={stopScanning}
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <div className="absolute bottom-3 left-0 right-0 text-center text-sm text-white/80">
              Point at a barcode
            </div>
          </div>

          {resolved && (
            <div className="rounded-lg border border-border/60 p-4 space-y-3">
              <div className="text-sm text-muted-foreground">Matched product</div>
              <div className="font-semibold">{resolved.product.name}</div>
              <div className="text-sm text-muted-foreground">
                Barcode: <span className="font-mono">{resolved.barcode.code}</span>
              </div>
              <div className="text-sm">Current quantity: <span className="font-semibold">{resolved.product.quantity}</span></div>

              <div className="grid gap-3 sm:grid-cols-[160px_auto] items-end">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Quantity to add</label>
                  <Input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                    className="h-11 rounded-lg"
                  />
                </div>
                <Button className="h-11 gap-2" onClick={stockIn} disabled={loading}>
                  <PackagePlus className="h-4 w-4" />
                  Confirm Stock In
                </Button>
              </div>

              <div className="pt-2">
                <Link href={`/admin/edit/${resolved.product.id}`}>
                  <Button variant="secondary" className="h-10" asChild>
                    <a>Open Product</a>
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5 border-border/50">
          <h2 className="text-lg font-semibold mb-3">Recent Inventory Activity</h2>
          {transactions.length === 0 ? (
            <div className="text-sm text-muted-foreground">No inventory activity yet.</div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="rounded-md border border-border/60 px-3 py-2 text-sm flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{tx.type}</div>
                    <div className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</div>
                  </div>
                  <div className={`font-semibold ${tx.quantityDelta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {tx.quantityDelta >= 0 ? `+${tx.quantityDelta}` : tx.quantityDelta}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </SiteLayout>
  );
}
