import type { ApiProduct } from "@shared/schema";
import { storage } from "./storage";

// ── Environment ──────────────────────────────────────────────────────────

const EBAY_CLIENT_ID = () => (process.env.EBAY_CLIENT_ID ?? "").trim();
const EBAY_CLIENT_SECRET = () => (process.env.EBAY_CLIENT_SECRET ?? "").trim();
const EBAY_REFRESH_TOKEN_ENV = () => (process.env.EBAY_REFRESH_TOKEN ?? "").trim();

// Check DB first (saved via OAuth flow), fall back to env var
let dbRefreshTokenCache: string | null = null;
async function getRefreshToken(): Promise<string> {
  if (dbRefreshTokenCache) return dbRefreshTokenCache;
  try {
    const dbToken = await storage.getSetting("ebay_refresh_token");
    if (dbToken) {
      dbRefreshTokenCache = dbToken;
      return dbToken;
    }
  } catch {}
  return EBAY_REFRESH_TOKEN_ENV();
}

export async function saveRefreshToken(token: string): Promise<void> {
  dbRefreshTokenCache = token;
  await storage.setSetting("ebay_refresh_token", token);
}
const EBAY_RUNAME = () => (process.env.EBAY_RUNAME ?? "").trim();
const EBAY_ENVIRONMENT = () =>
  (process.env.EBAY_ENVIRONMENT ?? "production") as "sandbox" | "production";
const EBAY_CATEGORY_ID = () => process.env.EBAY_CATEGORY_ID ?? "6028";
const EBAY_PAYMENT_POLICY_ID = () => process.env.EBAY_PAYMENT_POLICY_ID ?? "";
const EBAY_RETURN_POLICY_ID = () => process.env.EBAY_RETURN_POLICY_ID ?? "";
const EBAY_FULFILLMENT_POLICY_ID = () =>
  process.env.EBAY_FULFILLMENT_POLICY_ID ?? "";

function apiBaseUrl(): string {
  return EBAY_ENVIRONMENT() === "production"
    ? "https://api.ebay.com"
    : "https://api.sandbox.ebay.com";
}

function authBaseUrl(): string {
  return EBAY_ENVIRONMENT() === "production"
    ? "https://api.ebay.com"
    : "https://api.sandbox.ebay.com";
}

function resolvePublicBaseUrl(): string {
  const fromEnv = process.env.PUBLIC_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "http://localhost:3000";
}

export function isEbayConfigured(): boolean {
  return !!(EBAY_CLIENT_ID() && EBAY_CLIENT_SECRET() && (EBAY_REFRESH_TOKEN_ENV() || dbRefreshTokenCache));
}

export async function isEbayFullyConfigured(): Promise<boolean> {
  if (!EBAY_CLIENT_ID() || !EBAY_CLIENT_SECRET()) return false;
  const token = await getRefreshToken();
  return !!token;
}

// ── OAuth Connect Flow ──────────────────────────────────────────────────

function consentBaseUrl(): string {
  return EBAY_ENVIRONMENT() === "production"
    ? "https://auth.ebay.com"
    : "https://auth.sandbox.ebay.com";
}

export function getEbayAuthUrl(): string | null {
  const clientId = EBAY_CLIENT_ID();
  const ruName = EBAY_RUNAME();
  if (!clientId || !ruName) return null;

  const scopes = [
    "https://api.ebay.com/oauth/api_scope",
    "https://api.ebay.com/oauth/api_scope/sell.inventory",
    "https://api.ebay.com/oauth/api_scope/sell.account",
    "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
  ].join(" ");

  return `${consentBaseUrl()}/oauth2/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(ruName)}&response_type=code&scope=${encodeURIComponent(scopes)}`;
}

export async function exchangeEbayAuthCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_token_expires_in: number;
}> {
  const credentials = Buffer.from(
    `${EBAY_CLIENT_ID()}:${EBAY_CLIENT_SECRET()}`
  ).toString("base64");

  const res = await fetch(`${authBaseUrl()}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: EBAY_RUNAME(),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay token exchange failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    refresh_token_expires_in: number;
  }>;
}

// ── OAuth Token Management ───────────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getEbayAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const credentials = Buffer.from(
    `${EBAY_CLIENT_ID()}:${EBAY_CLIENT_SECRET()}`
  ).toString("base64");

  const refreshToken = await getRefreshToken();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch(`${authBaseUrl()}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay OAuth failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.token;
}

async function ebayFetch(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    retried?: boolean;
  } = {}
): Promise<Response> {
  const token = await getEbayAccessToken();
  const url = `${apiBaseUrl()}${path}`;

  const method = options.method ?? "GET";
  const headerObj: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "X-EBAY-C-MARKETPLACE-ID": "EBAY_GB",
  };
  if (options.body) {
    headerObj["Content-Type"] = "application/json";
    headerObj["Content-Language"] = "en-US";
  }

  const res = await fetch(url, {
    method,
    headers: headerObj,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // Retry once on 401 (expired token)
  if (res.status === 401 && !options.retried) {
    cachedToken = null;
    return ebayFetch(path, { ...options, retried: true });
  }

  return res;
}

// ── Image URL Resolution ─────────────────────────────────────────────────

function resolveImageUrls(product: ApiProduct): string[] {
  const baseUrl = resolvePublicBaseUrl();
  const urls: string[] = [];

  const allImages = product.images?.length
    ? product.images
    : product.image
      ? [product.image]
      : [];

  for (const img of allImages) {
    if (!img) continue;
    if (img.startsWith("http://") || img.startsWith("https://")) {
      urls.push(img);
    } else {
      urls.push(`${baseUrl}${img.startsWith("/") ? img : `/${img}`}`);
    }
  }

  return urls;
}

// ── Inventory Item (SKU) ─────────────────────────────────────────────────

function buildInventoryItemPayload(product: ApiProduct) {
  const imageUrls = resolveImageUrls(product);
  const priceGbp = (product.price / 100).toFixed(2);

  const payload: Record<string, unknown> = {
    availability: {
      shipToLocationAvailability: {
        quantity: product.quantity ?? 0,
      },
    },
    condition: "NEW",
    product: {
      title: product.name.slice(0, 80),
      description: product.description || product.name,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      aspects: {} as Record<string, string[]>,
    },
  };

  const aspects = (payload.product as Record<string, unknown>)
    .aspects as Record<string, string[]>;

  if (product.brand) {
    aspects["Brand"] = [product.brand];
  }
  if (product.partNumber) {
    (payload.product as Record<string, unknown>).mpn = product.partNumber;
    aspects["MPN"] = [product.partNumber];
  }

  // Package weight & dimensions
  if (product.shippingWeightGrams) {
    payload.packageWeightAndSize = {
      ...(payload.packageWeightAndSize as Record<string, unknown>),
      weight: {
        value: product.shippingWeightGrams,
        unit: "GRAM",
      },
    };
  }
  if (
    product.shippingLengthCm &&
    product.shippingWidthCm &&
    product.shippingHeightCm
  ) {
    payload.packageWeightAndSize = {
      ...(payload.packageWeightAndSize as Record<string, unknown>),
      dimensions: {
        length: product.shippingLengthCm,
        width: product.shippingWidthCm,
        height: product.shippingHeightCm,
        unit: "CENTIMETER",
      },
    };
  }

  return payload;
}

export async function createOrUpdateInventoryItem(
  product: ApiProduct
): Promise<void> {
  const sku = product.id;
  const payload = buildInventoryItemPayload(product);

  const res = await ebayFetch(
    `/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
    { method: "PUT", body: payload }
  );

  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`eBay createOrUpdateInventoryItem failed (${res.status}): ${text}`);
  }
}

export async function getInventoryItem(
  sku: string
): Promise<{ quantity: number } | null> {
  const res = await ebayFetch(
    `/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`
  );

  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay getInventoryItem failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    availability?: {
      shipToLocationAvailability?: { quantity?: number };
    };
  };

  return {
    quantity:
      data.availability?.shipToLocationAvailability?.quantity ?? 0,
  };
}

export async function deleteInventoryItem(sku: string): Promise<void> {
  const res = await ebayFetch(
    `/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
    { method: "DELETE" }
  );

  if (!res.ok && res.status !== 204 && res.status !== 404) {
    const text = await res.text();
    throw new Error(`eBay deleteInventoryItem failed (${res.status}): ${text}`);
  }
}

// ── Offer Management ─────────────────────────────────────────────────────

export async function createOffer(
  product: ApiProduct
): Promise<string> {
  const priceGbp = (product.price / 100).toFixed(2);

  const payload = {
    sku: product.id,
    marketplaceId: "EBAY_GB",
    format: "FIXED_PRICE",
    listingDescription: product.description || product.name,
    availableQuantity: product.quantity ?? 0,
    categoryId: EBAY_CATEGORY_ID(),
    listingPolicies: {
      paymentPolicyId: EBAY_PAYMENT_POLICY_ID(),
      returnPolicyId: EBAY_RETURN_POLICY_ID(),
      fulfillmentPolicyId: EBAY_FULFILLMENT_POLICY_ID(),
    },
    pricingSummary: {
      price: {
        value: priceGbp,
        currency: "GBP",
      },
    },
    merchantLocationKey: undefined as string | undefined,
  };

  const res = await ebayFetch("/sell/inventory/v1/offer", {
    method: "POST",
    body: payload,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay createOffer failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { offerId: string };
  return data.offerId;
}

export async function updateOffer(
  offerId: string,
  product: ApiProduct
): Promise<void> {
  const priceGbp = (product.price / 100).toFixed(2);

  const payload = {
    sku: product.id,
    marketplaceId: "EBAY_GB",
    format: "FIXED_PRICE",
    listingDescription: product.description || product.name,
    availableQuantity: product.quantity ?? 0,
    categoryId: EBAY_CATEGORY_ID(),
    listingPolicies: {
      paymentPolicyId: EBAY_PAYMENT_POLICY_ID(),
      returnPolicyId: EBAY_RETURN_POLICY_ID(),
      fulfillmentPolicyId: EBAY_FULFILLMENT_POLICY_ID(),
    },
    pricingSummary: {
      price: {
        value: priceGbp,
        currency: "GBP",
      },
    },
  };

  const res = await ebayFetch(
    `/sell/inventory/v1/offer/${encodeURIComponent(offerId)}`,
    { method: "PUT", body: payload }
  );

  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`eBay updateOffer failed (${res.status}): ${text}`);
  }
}

export async function publishOffer(
  offerId: string
): Promise<string> {
  const res = await ebayFetch(
    `/sell/inventory/v1/offer/${encodeURIComponent(offerId)}/publish`,
    { method: "POST" }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay publishOffer failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { listingId: string };
  return data.listingId;
}

// ── High-Level Sync ──────────────────────────────────────────────────────

export async function syncProductToEbay(
  product: ApiProduct
): Promise<{ listingId: string; offerId: string }> {
  // 1. Create or update inventory item
  await createOrUpdateInventoryItem(product);

  let offerId = product.ebayOfferId ?? "";
  let listingId = product.ebayListingId ?? "";

  if (offerId) {
    // Update existing offer
    await updateOffer(offerId, product);
  } else {
    // Create new offer + publish
    offerId = await createOffer(product);
    listingId = await publishOffer(offerId);
  }

  // 3. Persist eBay fields on product
  await storage.updateProduct(product.id, {
    ebayListingId: listingId || product.ebayListingId,
    ebayOfferId: offerId,
    ebaySyncedAt: new Date().toISOString(),
    ebaySyncStatus: "synced",
  } as Partial<ApiProduct>);

  return { listingId: listingId || product.ebayListingId || "", offerId };
}

export async function unsyncProductFromEbay(
  product: ApiProduct
): Promise<void> {
  // Delete inventory item (this also removes offers)
  await deleteInventoryItem(product.id);

  await storage.updateProduct(product.id, {
    ebayListingId: undefined,
    ebayOfferId: undefined,
    ebaySyncedAt: undefined,
    ebaySyncStatus: undefined,
  } as Partial<ApiProduct>);
}

export async function syncProductQuantityToEbay(
  product: ApiProduct
): Promise<void> {
  if (!product.ebayOfferId) return;
  await createOrUpdateInventoryItem(product);
  await updateOffer(product.ebayOfferId, product);
  await storage.updateProduct(product.id, {
    ebaySyncedAt: new Date().toISOString(),
    ebaySyncStatus: "synced",
  } as Partial<ApiProduct>);
}

export async function bulkSyncProducts(
  products: ApiProduct[]
): Promise<{ synced: number; failed: number; errors: string[] }> {
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const product of products) {
    try {
      await syncProductToEbay(product);
      synced++;
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${product.id}: ${msg}`);
      // Mark the product with error status
      await storage
        .updateProduct(product.id, {
          ebaySyncStatus: "error",
        } as Partial<ApiProduct>)
        .catch(() => {});
    }
  }

  return { synced, failed, errors };
}

// ── Background Stock Sync ────────────────────────────────────────────────

const STOCK_SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
let stockSyncTimer: NodeJS.Timeout | null = null;

async function pullStockFromEbay(): Promise<void> {
  if (!isEbayConfigured()) return;

  try {
    const allProducts = await storage.listProducts();
    const ebayProducts = allProducts.filter((p) => p.ebayListingId);

    for (const product of ebayProducts) {
      try {
        const ebayItem = await getInventoryItem(product.id);
        if (!ebayItem) continue;

        if (ebayItem.quantity !== product.quantity) {
          console.log(
            `[ebay-sync] Stock change for ${product.id}: local=${product.quantity} ebay=${ebayItem.quantity}`
          );
          await storage.updateProductQuantity(product.id, ebayItem.quantity);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[ebay-sync] Failed pulling stock for ${product.id}: ${msg}`);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[ebay-sync] Stock sync failed: ${msg}`);
  }
}

export { pullStockFromEbay };

export function startEbayStockSyncScheduler(): void {
  if (stockSyncTimer) return;
  if (!isEbayConfigured()) {
    console.log("[ebay-sync] eBay not configured, skipping scheduler.");
    return;
  }

  console.log("[ebay-sync] Starting stock sync scheduler (every 30 min).");
  stockSyncTimer = setInterval(() => {
    pullStockFromEbay().catch(() => {});
  }, STOCK_SYNC_INTERVAL_MS);

  // Initial pull after a brief delay
  setTimeout(() => pullStockFromEbay().catch(() => {}), 10_000);
}
