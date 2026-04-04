import React from "react";
import { RefreshCw, Package, CheckCircle2, XCircle, Copy, AlertTriangle, ExternalLink } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";
import BackButton from "@/components/site/BackButton";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useEbayStatus, useEbayBulkSync, useEbayPullStock, useProducts } from "@/lib/products";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type PolicyItem = { id: string; name: string };
type PoliciesResponse = Record<string, PolicyItem[]>;

const ENV_POLICY_MAP: Record<string, string> = {
  PAYMENT: "EBAY_PAYMENT_POLICY_ID",
  RETURN_POLICY: "EBAY_RETURN_POLICY_ID",
  FULFILLMENT: "EBAY_FULFILLMENT_POLICY_ID",
};

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success("Copied to clipboard"),
    () => toast.error("Failed to copy")
  );
}

export default function AdminEbay() {
  usePageMeta({ title: "eBay Settings", description: "eBay integration setup and sync.", noindex: true });

  const { data: status, isLoading: statusLoading } = useEbayStatus();
  const { data: products = [] } = useProducts();
  const bulkSync = useEbayBulkSync();
  const pullStock = useEbayPullStock();

  const [policies, setPolicies] = React.useState<PoliciesResponse | null>(null);
  const [policiesLoading, setPoliciesLoading] = React.useState(false);
  const [policiesError, setPoliciesError] = React.useState<string | null>(null);

  const ebayProducts = products.filter((p) => p.ebayListingId);
  const syncErrors = products.filter((p) => p.ebaySyncStatus === "error");

  const loadPolicies = async () => {
    setPoliciesLoading(true);
    setPoliciesError(null);
    try {
      const res = await fetch("/api/admin/ebay/policies", { credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to load policies");
      }
      setPolicies(await res.json());
    } catch (err) {
      setPoliciesError(err instanceof Error ? err.message : "Failed to load policies");
    } finally {
      setPoliciesLoading(false);
    }
  };

  return (
    <SiteLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              eBay Settings
            </h1>
            <p className="mt-2 text-muted-foreground">
              Manage your eBay integration, policies, and product sync
            </p>
          </div>
          <BackButton fallback="/admin" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Connection Status */}
          <Card className="border-border/50 p-6">
            <h2 className="text-lg font-semibold mb-4">Connection Status</h2>
            {statusLoading ? (
              <p className="text-sm text-muted-foreground">Checking connection...</p>
            ) : status?.connected ? (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="font-medium text-emerald-700 dark:text-emerald-300">Connected</p>
                  <p className="text-sm text-muted-foreground">OAuth token is valid</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-rose-500" />
                  <div>
                    <p className="font-medium text-rose-700 dark:text-rose-300">Not Connected</p>
                    <p className="text-sm text-muted-foreground">{status?.reason}</p>
                  </div>
                </div>
                {(status?.clientIdPrefix || status?.environment) && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3 text-xs font-mono space-y-1">
                    <p className="font-semibold text-amber-700 dark:text-amber-300 font-sans text-sm">Debug Info</p>
                    <p>Environment: <strong>{status.environment}</strong></p>
                    <p>Auth URL: <strong>{status.authUrl}</strong></p>
                    <p>Client ID: <strong>{status.clientIdPrefix}</strong></p>
                    <p>Client Secret: <strong>{status.clientSecretPrefix}</strong> ({status.clientSecretLength} chars)</p>
                    <p>Refresh Token: <strong>{status.refreshTokenPrefix}</strong> ({status.refreshTokenLength} chars)</p>
                    {status.clientCredentialsTest && (
                      <p className={String(status.clientCredentialsTest).startsWith("PASS") ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}>
                        Credentials Test: <strong>{String(status.clientCredentialsTest)}</strong>
                      </p>
                    )}
                    {status.refreshTokenTest && (
                      <p className="text-rose-700 dark:text-rose-400">
                        Refresh Token Test: <strong>{String(status.refreshTokenTest)}</strong>
                      </p>
                    )}
                  </div>
                )}
                <Button
                  className="gap-2 w-full"
                  onClick={() => { window.location.href = "/api/admin/ebay/connect"; }}
                >
                  <ExternalLink className="h-4 w-4" />
                  Connect to eBay
                </Button>
                <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-2">
                  <p className="font-medium">Required environment variables:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li><code className="text-xs">EBAY_CLIENT_ID</code> — App ID from eBay Developer Portal</li>
                    <li><code className="text-xs">EBAY_CLIENT_SECRET</code> — Cert ID from eBay Developer Portal</li>
                    <li><code className="text-xs">EBAY_RUNAME</code> — RuName from eBay Developer Portal (under OAuth redirect settings)</li>
                    <li><code className="text-xs">EBAY_REFRESH_TOKEN</code> — generated via "Connect to eBay" button above</li>
                  </ul>
                </div>
              </div>
            )}
          </Card>

          {/* Sync Overview */}
          <Card className="border-border/50 p-6">
            <h2 className="text-lg font-semibold mb-4">Sync Overview</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Listed on eBay</p>
                  <p className="text-2xl font-bold tabular-nums">{ebayProducts.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sync Errors</p>
                  <p className={`text-2xl font-bold tabular-nums ${syncErrors.length > 0 ? "text-rose-600" : ""}`}>
                    {syncErrors.length}
                  </p>
                </div>
              </div>

              {syncErrors.length > 0 && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-rose-500" />
                    <span className="text-sm font-medium text-rose-700 dark:text-rose-300">Products with sync errors:</span>
                  </div>
                  <ul className="text-xs text-rose-600 dark:text-rose-400 space-y-1">
                    {syncErrors.slice(0, 5).map((p) => (
                      <li key={p.id}>{p.name}</li>
                    ))}
                    {syncErrors.length > 5 && <li>...and {syncErrors.length - 5} more</li>}
                  </ul>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={!status?.connected || bulkSync.isPending}
                  onClick={() => {
                    bulkSync.mutate(undefined, {
                      onSuccess: (d) => toast.success(`${d.synced} synced, ${d.failed} failed`),
                      onError: (err) => toast.error(err.message),
                    });
                  }}
                >
                  <RefreshCw className={`h-4 w-4 ${bulkSync.isPending ? "animate-spin" : ""}`} />
                  Sync All Products
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={!status?.connected || pullStock.isPending}
                  onClick={() => {
                    pullStock.mutate(undefined, {
                      onSuccess: () => toast.success("eBay stock pulled"),
                      onError: (err) => toast.error(err.message),
                    });
                  }}
                >
                  <Package className={`h-4 w-4 ${pullStock.isPending ? "animate-spin" : ""}`} />
                  Pull Stock from eBay
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Business Policies */}
        <Card className="border-border/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Business Policies</h2>
              <p className="text-sm text-muted-foreground">
                eBay requires payment, return, and fulfillment policies. Load them here to find the IDs for your <code className="text-xs">.env</code>.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={loadPolicies}
              disabled={!status?.connected || policiesLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${policiesLoading ? "animate-spin" : ""}`} />
              {policies ? "Refresh" : "Load Policies"}
            </Button>
          </div>

          {policiesError && (
            <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 p-3 text-sm text-rose-600 dark:text-rose-400 mb-4">
              {policiesError}
            </div>
          )}

          {policies && (
            <div className="space-y-4">
              {(["PAYMENT", "RETURN_POLICY", "FULFILLMENT"] as const).map((type) => {
                const items = policies[type] ?? [];
                const envVar = ENV_POLICY_MAP[type];
                const label =
                  type === "PAYMENT" ? "Payment Policies" :
                  type === "RETURN_POLICY" ? "Return Policies" :
                  "Fulfillment Policies";

                return (
                  <div key={type} className="rounded-lg border border-border/60 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold">{label}</h3>
                      <Badge variant="outline" className="text-xs font-mono">{envVar}</Badge>
                    </div>
                    {items.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No policies found. Create one in eBay Seller Hub first.</p>
                    ) : (
                      <div className="space-y-2">
                        {items.map((p) => (
                          <div key={p.id} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                            <div>
                              <span className="text-sm font-medium">{p.name}</span>
                              <span className="ml-2 text-xs font-mono text-muted-foreground">{p.id}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1.5 text-xs"
                              onClick={() => copyToClipboard(p.id)}
                            >
                              <Copy className="h-3 w-3" />
                              Copy ID
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="rounded-lg bg-muted/50 p-4 text-sm">
                <p className="font-medium mb-1">Next step:</p>
                <p className="text-muted-foreground">
                  Copy the policy IDs above and add them to your environment variables:
                </p>
                <pre className="mt-2 text-xs font-mono text-muted-foreground whitespace-pre-wrap">
{`EBAY_PAYMENT_POLICY_ID=<payment policy id>
EBAY_RETURN_POLICY_ID=<return policy id>
EBAY_FULFILLMENT_POLICY_ID=<fulfillment policy id>`}
                </pre>
              </div>
            </div>
          )}

          {!policies && !policiesError && (
            <p className="text-sm text-muted-foreground">
              {status?.connected
                ? "Click \"Load Policies\" to discover your eBay business policy IDs."
                : "Connect to eBay first to load policies."}
            </p>
          )}
        </Card>
      </div>
    </SiteLayout>
  );
}
