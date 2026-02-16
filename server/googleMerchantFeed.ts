import { writeFile } from "fs/promises";
import path from "path";
import type { ApiProduct } from "@shared/schema";
import { storage } from "./storage";
import { UPLOADS_DIR } from "./upload";

const FEED_FILENAME = "google-merchant.xml";
const FEED_PATH = path.join(UPLOADS_DIR, FEED_FILENAME);
const DAY_MS = 24 * 60 * 60 * 1000;

let feedScheduler: NodeJS.Timeout | null = null;
let writeInProgress = false;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function absoluteUrl(baseUrl: string, pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return pathOrUrl;
  const p = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${baseUrl}${p}`;
}

function isLikelyImageUrl(value: string): boolean {
  if (!value) return false;
  const lower = value.toLowerCase();
  if (lower.includes("/api/files/")) return true;
  return [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tif", ".tiff", ".avif"].some((ext) =>
    lower.includes(ext)
  );
}

function resolveImageLink(baseUrl: string, productImage: string): string {
  const fallback = absoluteUrl(baseUrl, "/opengraph.jpg");
  const trimmed = productImage.trim();
  if (!trimmed) return fallback;
  const resolved = absoluteUrl(baseUrl, trimmed);
  if (!isLikelyImageUrl(resolved)) return fallback;
  return resolved;
}

function availability(p: ApiProduct): "in_stock" | "out_of_stock" {
  if (p.quantity <= 0 || p.stock === "out") return "out_of_stock";
  return "in_stock";
}

function resolveBaseUrl(): string {
  const fromEnv = process.env.PUBLIC_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const defaultPort = process.env.REPL_ID ? "5000" : "3000";
  const port = process.env.PORT || defaultPort;
  return `http://localhost:${port}`;
}

export function buildGoogleMerchantFeedXml(products: ApiProduct[], baseUrl: string): string {
  const base = baseUrl.replace(/\/$/, "");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Smoke City Supplies Product Feed</title>
    <link>${escapeXml(base)}</link>
    <description>Auto-generated product feed for Google Merchant Center.</description>
${products
  .map((p) => {
    const title = p.metaTitle?.trim() || p.name;
    const description = p.metaDescription?.trim() || p.description;
    const imageLink = resolveImageLink(base, p.image);
    const link = `${base}/product/${p.id}`;
    const brand = p.brand?.trim() || "Smoke City Supplies";
    const productType = [p.category, p.subcategory].filter(Boolean).join(" > ");
    const keywords = p.metaKeywords?.trim() || p.tags.join(", ");
    return `    <item>
      <g:id>${escapeXml(p.id)}</g:id>
      <g:title>${escapeXml(title)}</g:title>
      <g:description>${escapeXml(description)}</g:description>
      <g:link>${escapeXml(link)}</g:link>
      <g:image_link>${escapeXml(imageLink)}</g:image_link>
      <g:availability>${availability(p)}</g:availability>
      <g:condition>new</g:condition>
      <g:price>${p.price.toFixed(2)} GBP</g:price>
      <g:brand>${escapeXml(brand)}</g:brand>
      <g:mpn>${escapeXml(p.partNumber?.trim() || p.id)}</g:mpn>
      <g:product_type>${escapeXml(productType || p.category)}</g:product_type>
      <g:custom_label_0>${escapeXml(p.vehicle)}</g:custom_label_0>
      <g:custom_label_1>${escapeXml(keywords)}</g:custom_label_1>
    </item>`;
  })
  .join("\n")}
  </channel>
</rss>`;
}

export async function writeGoogleMerchantFeedFile(reason = "manual"): Promise<void> {
  if (writeInProgress) return;
  writeInProgress = true;

  try {
    const products = await storage.listProducts();
    const xml = buildGoogleMerchantFeedXml(products, resolveBaseUrl());
    await writeFile(FEED_PATH, xml, "utf8");
    console.log(`[merchant-feed] Wrote ${products.length} product(s) to ${FEED_PATH} (${reason}).`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[merchant-feed] Failed writing ${FEED_PATH}: ${msg}`);
  } finally {
    writeInProgress = false;
  }
}

export function startGoogleMerchantFeedScheduler(): void {
  if (feedScheduler) return;

  feedScheduler = setInterval(() => {
    writeGoogleMerchantFeedFile("daily-schedule").catch(() => {});
  }, DAY_MS);

  writeGoogleMerchantFeedFile("startup").catch(() => {});
}

export function getGoogleMerchantFeedFileUrlPath(): string {
  return `/uploads/${FEED_FILENAME}`;
}
