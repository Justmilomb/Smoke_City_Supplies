import React from "react";
import { Link, useLocation } from "wouter";
import { ScanLine, PackagePlus } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";
import BackButton from "@/components/site/BackButton";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type ZXingBrowserGlobal = {
  BrowserMultiFormatReader: new () => {
    decodeFromConstraints: (
      constraints: MediaStreamConstraints,
      videoEl: HTMLVideoElement,
      callback: (
        result: { getText: () => string } | null,
        error: unknown,
        controls: { stop: () => void }
      ) => void
    ) => Promise<{ stop: () => void }>;
    reset: () => void;
  };
};

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

  const createHiddenScannerVideo = () => {
    const video = document.createElement("video");
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    video.setAttribute("autoplay", "true");
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.style.position = "fixed";
    video.style.left = "-9999px";
    video.style.width = "1px";
    video.style.height = "1px";
    video.style.opacity = "0";
    document.body.appendChild(video);
    return video;
  };

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

  const loadZxingBrowser = async (): Promise<ZXingBrowserGlobal> => {
    const existing = (window as any).ZXingBrowser;
    if (existing?.BrowserMultiFormatReader) return existing as ZXingBrowserGlobal;

    const scriptSources = [
      "https://unpkg.com/@zxing/browser@0.1.5/umd/index.min.js",
      "https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/umd/index.min.js",
    ];

    let loaded = false;
    for (const src of scriptSources) {
      try {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = src;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load scanner fallback library"));
          document.head.appendChild(script);
        });
        loaded = true;
        break;
      } catch {
        // Try next source.
      }
    }

    const loadedLib = (window as any).ZXingBrowser;
    if (!loaded || !loadedLib?.BrowserMultiFormatReader) {
      throw new Error("Scanner fallback is unavailable");
    }
    return loadedLib as ZXingBrowserGlobal;
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

  const startCameraScan = async () => {
    if (!window.isSecureContext) {
      toast.error("Camera scanning requires HTTPS (or localhost). Open the site over a secure connection.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("This browser does not support camera access. Try Chrome on your phone.");
      return;
    }

    const Detector = (window as any).BarcodeDetector;

    let stream: MediaStream | null = null;
    let video: HTMLVideoElement | null = null;
    try {
      if (Detector) {
        const supported = await Detector.getSupportedFormats?.();
        const detector = new Detector({ formats: supported || ["ean_13", "ean_8", "code_128", "upc_a", "upc_e"] });
        stream = await requestRearCameraStream();
        setScanSource("native");
        setScanning(true);

        video = createHiddenScannerVideo();
        video.srcObject = stream;
        await video.play();

        let active = true;
        const startedAt = Date.now();
        const tryScan = async () => {
          if (!active) return;
          if (Date.now() - startedAt > 20000) {
            active = false;
            stream?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
            video?.remove();
            setScanning(false);
            setScanSource("");
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
              await resolveBarcode(raw);
              stream?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
              active = false;
              video?.remove();
              setScanning(false);
              setScanSource("");
              return;
            }
          }
          requestAnimationFrame(tryScan);
        };

        requestAnimationFrame(tryScan);
        return;
      }

      // Safari and other browsers fallback.
      const ZXingBrowser = await loadZxingBrowser();
      const reader = new ZXingBrowser.BrowserMultiFormatReader();
      video = createHiddenScannerVideo();

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
          reader.reset();
          setScanValue(raw);
          setScanFormat("unknown");
          await resolveBarcode(raw);
          setScanning(false);
          setScanSource("");
          video?.remove();
        }
      );

      window.setTimeout(() => {
        if (done) return;
        done = true;
        controls.stop();
        reader.reset();
        stream?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        setScanning(false);
        setScanSource("");
        video?.remove();
        toast.error("No barcode detected. Try better lighting or manual barcode entry.");
      }, 20000);
    } catch (err) {
      stream?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      video?.remove();
      setScanning(false);
      setScanSource("");
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
