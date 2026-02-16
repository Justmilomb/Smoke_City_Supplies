import type { ApiProduct } from "@shared/schema";
import { createSign } from "crypto";
import { storage } from "./storage";

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_MERCHANT_SCOPE = "https://www.googleapis.com/auth/content";
const GOOGLE_MERCHANT_API_BASE = "https://merchantapi.googleapis.com/products/v1";

type MerchantConfig = {
  enabled: boolean;
  accountId: string;
  dataSourceName: string;
  contentLanguage: string;
  feedLabel: string;
  currencyCode: string;
  baseUrl: string;
  intervalMinutes: number;
  serviceAccountEmail: string;
  serviceAccountPrivateKey: string;
};

type SyncState = {
  schedulerEnabled: boolean;
  schedulerStarted: boolean;
  intervalMinutes: number;
  runInProgress: boolean;
  runCount: number;
  lastStartedAt?: string;
  lastFinishedAt?: string;
  lastSuccessAt?: string;
  lastError?: string;
  lastSyncedCount?: number;
  configErrors: string[];
};

type OAuthTokenCache = {
  accessToken: string;
  expiresAtMs: number;
};

let schedulerHandle: NodeJS.Timeout | null = null;
let tokenCache: OAuthTokenCache | null = null;
const syncState: SyncState = {
  schedulerEnabled: false,
  schedulerStarted: false,
  intervalMinutes: 15,
  runInProgress: false,
  runCount: 0,
  configErrors: [],
};

function parseConfig(): MerchantConfig {
  const enabled = process.env.GOOGLE_MERCHANT_SYNC_ENABLED === "true";
  const accountId = (process.env.GOOGLE_MERCHANT_ACCOUNT_ID ?? "").trim();
  const dsNameRaw = (process.env.GOOGLE_MERCHANT_DATASOURCE_NAME ?? "").trim();
  const dsIdRaw = (process.env.GOOGLE_MERCHANT_DATASOURCE_ID ?? "").trim();
  const dataSourceName = dsNameRaw || (dsIdRaw ? `accounts/${accountId}/dataSources/${dsIdRaw}` : "");
  const serviceAccountEmail = (process.env.GOOGLE_MERCHANT_SERVICE_ACCOUNT_EMAIL ?? "").trim();
  const serviceAccountPrivateKey = (process.env.GOOGLE_MERCHANT_SERVICE_ACCOUNT_PRIVATE_KEY ?? "")
    .replace(/\\n/g, "\n")
    .trim();
  const contentLanguage = (process.env.GOOGLE_MERCHANT_CONTENT_LANGUAGE ?? "en").trim();
  const feedLabel = (process.env.GOOGLE_MERCHANT_FEED_LABEL ?? "GB").trim();
  const currencyCode = (process.env.GOOGLE_MERCHANT_CURRENCY_CODE ?? "GBP").trim().toUpperCase();
  const baseUrl = (process.env.PUBLIC_BASE_URL ?? "http://localhost:3000").trim().replace(/\/$/, "");
  const intervalMinutes = Math.max(
    1,
    Number.parseInt(process.env.GOOGLE_MERCHANT_SYNC_INTERVAL_MINUTES ?? "15", 10) || 15
  );

  return {
    enabled,
    accountId,
    dataSourceName,
    contentLanguage,
    feedLabel,
    currencyCode,
    baseUrl,
    intervalMinutes,
    serviceAccountEmail,
    serviceAccountPrivateKey,
  };
}

function getConfigErrors(config: MerchantConfig): string[] {
  const errors: string[] = [];
  if (!config.accountId) errors.push("GOOGLE_MERCHANT_ACCOUNT_ID is required");
  if (!config.dataSourceName) {
    errors.push("GOOGLE_MERCHANT_DATASOURCE_NAME (or GOOGLE_MERCHANT_DATASOURCE_ID) is required");
  }
  if (!config.serviceAccountEmail) errors.push("GOOGLE_MERCHANT_SERVICE_ACCOUNT_EMAIL is required");
  if (!config.serviceAccountPrivateKey) {
    errors.push("GOOGLE_MERCHANT_SERVICE_ACCOUNT_PRIVATE_KEY is required");
  }
  if (!config.baseUrl.startsWith("http://") && !config.baseUrl.startsWith("https://")) {
    errors.push("PUBLIC_BASE_URL must start with http:// or https://");
  }
  return errors;
}

function mapAvailability(product: ApiProduct): string {
  if (product.quantity <= 0 || product.stock === "out") return "OUT_OF_STOCK";
  return "IN_STOCK";
}

function absoluteUrl(baseUrl: string, urlPath: string): string {
  if (urlPath.startsWith("http://") || urlPath.startsWith("https://")) return urlPath;
  const normalized = urlPath.startsWith("/") ? urlPath : `/${urlPath}`;
  return `${baseUrl}${normalized}`;
}

function toProductInput(product: ApiProduct, config: MerchantConfig): Record<string, unknown> {
  const amountMicros = Math.round(product.price * 1_000_000);
  const productAttributes: Record<string, unknown> = {
    title: product.name,
    description: product.description,
    link: `${config.baseUrl}/product/${product.id}`,
    imageLink: absoluteUrl(config.baseUrl, product.image),
    availability: mapAvailability(product),
    condition: "NEW",
    price: {
      amountMicros: amountMicros.toString(),
      currencyCode: config.currencyCode,
    },
    brand: product.brand || "Smoke City Supplies",
    mpn: product.partNumber || product.id,
  };

  if (!product.brand && !product.partNumber) {
    productAttributes.identifierExists = false;
  }

  return {
    offerId: product.id,
    contentLanguage: config.contentLanguage,
    feedLabel: config.feedLabel,
    attributes: productAttributes,
  };
}

function base64UrlEncode(value: string | Buffer): string {
  const buffer = typeof value === "string" ? Buffer.from(value, "utf8") : value;
  return buffer.toString("base64url");
}

function buildJwt(config: MerchantConfig): string {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: config.serviceAccountEmail,
    scope: GOOGLE_MERCHANT_SCOPE,
    aud: GOOGLE_TOKEN_ENDPOINT,
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsigned = `${encodedHeader}.${encodedPayload}`;

  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(config.serviceAccountPrivateKey);
  return `${unsigned}.${base64UrlEncode(signature)}`;
}

async function getAccessToken(config: MerchantConfig): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAtMs - 60_000) {
    return tokenCache.accessToken;
  }

  const assertion = buildJwt(config);
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`Token request failed (${response.status}): ${txt.slice(0, 500)}`);
  }

  const payload = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!payload.access_token || !payload.expires_in) {
    throw new Error("Token response missing access_token/expires_in");
  }

  tokenCache = {
    accessToken: payload.access_token,
    expiresAtMs: Date.now() + payload.expires_in * 1000,
  };
  return payload.access_token;
}

async function insertOrUpdateProductInput(
  config: MerchantConfig,
  accessToken: string,
  product: ApiProduct
): Promise<void> {
  const endpoint = `${GOOGLE_MERCHANT_API_BASE}/accounts/${config.accountId}/productInputs:insert?dataSource=${encodeURIComponent(config.dataSourceName)}`;
  const body = toProductInput(product, config);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`Sync failed for ${product.id} (${response.status}): ${txt.slice(0, 700)}`);
  }
}

export function getGoogleMerchantStatus(): SyncState {
  const config = parseConfig();
  const configErrors = getConfigErrors(config);
  syncState.schedulerEnabled = config.enabled;
  syncState.intervalMinutes = config.intervalMinutes;
  syncState.configErrors = configErrors;
  return { ...syncState };
}

export async function runGoogleMerchantSync(reason: string): Promise<{
  ok: boolean;
  reason: string;
  syncedCount: number;
  failedCount: number;
  errors: string[];
}> {
  const config = parseConfig();
  const configErrors = getConfigErrors(config);
  syncState.schedulerEnabled = config.enabled;
  syncState.intervalMinutes = config.intervalMinutes;
  syncState.configErrors = configErrors;

  if (syncState.runInProgress) {
    return { ok: false, reason, syncedCount: 0, failedCount: 0, errors: ["Sync already in progress"] };
  }

  if (!config.enabled && reason !== "manual") {
    return { ok: false, reason, syncedCount: 0, failedCount: 0, errors: ["Scheduler disabled"] };
  }

  if (configErrors.length > 0) {
    syncState.lastError = configErrors.join("; ");
    return { ok: false, reason, syncedCount: 0, failedCount: 0, errors: configErrors };
  }

  syncState.runInProgress = true;
  syncState.runCount += 1;
  syncState.lastStartedAt = new Date().toISOString();
  const errors: string[] = [];
  let syncedCount = 0;

  try {
    const products = await storage.listProducts();
    const accessToken = await getAccessToken(config);

    for (const product of products) {
      try {
        await insertOrUpdateProductInput(config, accessToken, product);
        syncedCount += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown product sync error";
        errors.push(message);
      }
    }

    if (errors.length === 0) {
      syncState.lastSuccessAt = new Date().toISOString();
      syncState.lastError = undefined;
    } else {
      syncState.lastError = `${errors.length} product(s) failed during sync`;
    }

    return {
      ok: errors.length === 0,
      reason,
      syncedCount,
      failedCount: errors.length,
      errors,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown sync error";
    syncState.lastError = message;
    return { ok: false, reason, syncedCount, failedCount: 0, errors: [message] };
  } finally {
    syncState.runInProgress = false;
    syncState.lastSyncedCount = syncedCount;
    syncState.lastFinishedAt = new Date().toISOString();
  }
}

export function startGoogleMerchantSyncScheduler(): void {
  if (schedulerHandle) return;

  const config = parseConfig();
  const configErrors = getConfigErrors(config);
  syncState.schedulerEnabled = config.enabled;
  syncState.intervalMinutes = config.intervalMinutes;
  syncState.configErrors = configErrors;

  if (!config.enabled) {
    console.log("[google-merchant] Scheduler disabled (GOOGLE_MERCHANT_SYNC_ENABLED !== true).");
    return;
  }

  if (configErrors.length > 0) {
    console.warn("[google-merchant] Scheduler not started due to config errors:", configErrors.join("; "));
    return;
  }

  const intervalMs = config.intervalMinutes * 60 * 1000;
  schedulerHandle = setInterval(() => {
    runGoogleMerchantSync("scheduled").catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      syncState.lastError = message;
      console.error("[google-merchant] Scheduled sync crashed:", message);
    });
  }, intervalMs);

  syncState.schedulerStarted = true;
  console.log(`[google-merchant] Scheduler started. Sync interval: ${config.intervalMinutes} minute(s).`);

  runGoogleMerchantSync("startup").catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    syncState.lastError = message;
    console.error("[google-merchant] Startup sync failed:", message);
  });
}
