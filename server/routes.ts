import type { Express, Request, Response } from "express";
import { type Server } from "http";
import {
  barcodeLinkSchema,
  barcodeResolveSchema,
  checkoutPrepareSchema,
  createOrderSchema,
  fulfillmentScanSchema,
  insertCategorySchema,
  insertProductSchema,
  shippingRatesQuoteSchema,
  stockInSchema,
  stockOutSchema,
  type ApiOrder,
  type ApiProduct,
  type CreateOrderInput,
  type InsertCategory,
  type InsertProduct,
} from "@shared/schema";
import { storage } from "./storage";
import { prepareUploadedImage, uploadMiddleware } from "./upload";
import { requireAuth } from "./auth";
import { seedAdminIfNeeded, seedCategoriesIfNeeded } from "./seedAdmin";
import { runSeedParts } from "./seedParts";
import passport from "passport";
import {
  contactFormSchema,
  orderStatusSchema,
  sanitizeProductInput,
  sanitizeCategoryInput,
} from "./validation";
import {
  authRateLimiter,
  contactRateLimiter,
  apiRateLimiter,
  orderRateLimiter,
} from "./rateLimit";
import { stripe, STRIPE_PUBLISHABLE_KEY } from "./stripe";
import { getAIClient } from "./ai";
import { findPartsForBike } from "./bike-finder";
import { bikeFinderInputSchema } from "@shared/schema";
import { BIKE_DATA } from "@shared/bike-data";
import { generateProductSeo } from "./seo";
import {
  buildGoogleMerchantFeedXml,
  getGoogleMerchantFeedFileUrlPath,
  startGoogleMerchantFeedScheduler,
  writeGoogleMerchantFeedFile,
} from "./googleMerchantFeed";
import {
  isEbayConfigured,
  getEbayAccessToken,
  getEbayAuthUrl,
  exchangeEbayAuthCode,
  syncProductToEbay,
  unsyncProductFromEbay,
  syncProductQuantityToEbay,
  bulkSyncProducts,
  pullStockFromEbay,
  startEbayStockSyncScheduler,
} from "./ebay";
import { createInvoiceNumber, renderInvoiceHtml, renderInvoicePdfBuffer } from "./invoice";
import { sendAdminOrderAlertEmail, sendContactFormEmail, sendInvoiceEmail, sendOrderCancelledEmail, sendOrderConfirmationEmail, sendOrderDeliveredEmail, sendOrderProcessingEmail, sendOrderShippedEmail } from "./email";
import { quoteRoyalMailFlatRates } from "./shipping/royalMailManual";
import { buildPackingSlipHtml, buildParcelsForItems, dispatchAdviceNow } from "./shippingLogic";
import { z } from "zod";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function paramId(req: { params: { id?: string | string[] } }): string {
  const p = req.params.id;
  return Array.isArray(p) ? (p[0] ?? "") : (p ?? "");
}

function orderToAddressText(order: ApiOrder): string {
  return [order.addressLine1, order.addressLine2, order.city, order.county, order.postcode, order.country]
    .filter(Boolean)
    .join(", ");
}

function fullCustomerName(input: { customerFirstName?: string; customerLastName?: string; customerName?: string }): string {
  const fullName = `${input.customerFirstName ?? ""} ${input.customerLastName ?? ""}`.trim();
  return fullName || input.customerName || "";
}

function resolvePublicBaseUrl(req: { protocol: string; get(name: string): string | undefined }): string {
  const fromEnv = process.env.PUBLIC_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  if (process.env.NODE_ENV === "production") {
    return "https://smokecitysupplies.com";
  }

  const host = req.get("host") ?? "localhost:3000";
  return `${req.protocol}://${host}`;
}

async function getProductMap(): Promise<Map<string, ApiProduct>> {
  const products = await storage.listProducts();
  return new Map(products.map((p) => [p.id, p]));
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await seedAdminIfNeeded();
  await seedCategoriesIfNeeded();

  const shouldSeedPartsOnStartup =
    process.env.SEED_PARTS_ON_STARTUP === "true" || process.env.NODE_ENV !== "production";
  if (shouldSeedPartsOnStartup) {
    await runSeedParts();
  }

  startGoogleMerchantFeedScheduler();
  startEbayStockSyncScheduler();

  async function ensureInvoiceSent(order: ApiOrder): Promise<ApiOrder> {
    const invoiceNumber = order.invoiceNumber || createInvoiceNumber();
    const pdf = renderInvoicePdfBuffer({ ...order, invoiceNumber });
    let invoiceFileId = order.invoiceFileId;
    if (!invoiceFileId) {
      const savedFile = await storage.createStoredFile({
        kind: "invoice_pdf",
        filename: `${invoiceNumber}.pdf`,
        mimeType: "application/pdf",
        content: pdf,
      });
      invoiceFileId = savedFile.id;
    }
    const withInvoice =
      order.invoiceNumber === invoiceNumber
        ? order
        : ((await storage.recordOrderInvoice(order.id, {
            invoiceNumber,
            invoiceUrl: `/api/files/${invoiceFileId}`,
            invoiceFileId,
          })) ?? order);

    const html = renderInvoiceHtml({ ...withInvoice, invoiceNumber });

    if (withInvoice.customerEmail) {
      await sendInvoiceEmail({
        to: withInvoice.customerEmail,
        subject: `Invoice ${invoiceNumber} - Smoke City Supplies`,
        html,
        pdfBase64: pdf.toString("base64"),
        pdfFilename: `${invoiceNumber}.pdf`,
      });
    }

    const updated = await storage.recordOrderInvoice(withInvoice.id, {
      invoiceNumber,
      invoiceUrl: `/api/files/${invoiceFileId}`,
      invoiceFileId,
      invoiceSentAt: new Date().toISOString(),
    });

    return updated ?? withInvoice;
  }

  // Health check
  app.get("/health", (_req, res) => {
    return res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/robots.txt", (req, res) => {
    const base = resolvePublicBaseUrl(req);
    const txt = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/*
Disallow: /cart
Allow: /api/files/
Disallow: /api/

Sitemap: ${base}/sitemap.xml
`;
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.type("text/plain").send(txt);
  });

  app.get("/llms.txt", (req, res) => {
    const base = resolvePublicBaseUrl(req);
    const txt = `# Smoke City Supplies

Official website for motorcycle and scooter parts in the UK.

Key URLs:
- ${base}/
- ${base}/store
- ${base}/catalog
- ${base}/sitemap.xml
- ${base}/feeds/google-merchant.xml
- ${base}/shipping
- ${base}/returns
- ${base}/privacy
- ${base}/terms
`;
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.type("text/plain").send(txt);
  });

  app.get("/sitemap.xml", async (req, res) => {
    const base = resolvePublicBaseUrl(req);
    const now = new Date().toISOString().split("T")[0];
    const products = await storage.listProducts();

    type SitemapUrl = { loc: string; changefreq: string; priority: string; lastmod: string };
    const urls: SitemapUrl[] = [
      { loc: `${base}/`, changefreq: "weekly", priority: "1.0", lastmod: now },
      { loc: `${base}/store`, changefreq: "daily", priority: "0.9", lastmod: now },
      { loc: `${base}/catalog`, changefreq: "daily", priority: "0.8", lastmod: now },
      { loc: `${base}/contact`, changefreq: "monthly", priority: "0.5", lastmod: now },
      { loc: `${base}/shipping`, changefreq: "monthly", priority: "0.4", lastmod: now },
      { loc: `${base}/returns`, changefreq: "monthly", priority: "0.4", lastmod: now },
      { loc: `${base}/privacy`, changefreq: "yearly", priority: "0.2", lastmod: now },
      { loc: `${base}/terms`, changefreq: "yearly", priority: "0.2", lastmod: now },
      ...products.map((p) => ({
        loc: `${base}/product/${p.id}`,
        changefreq: "weekly",
        priority: "0.8",
        lastmod: now,
      })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls
  .map(
    (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.type("application/xml").send(xml);
  });

  async function sendGoogleMerchantFeed(req: Request, res: Response) {
    const base = resolvePublicBaseUrl(req);
    const products = await storage.listProducts();
    const xml = buildGoogleMerchantFeedXml(products, base);
    res.set("Cache-Control", "no-store");
    res.type("application/xml; charset=utf-8").send(xml);
  }

  app.get("/feeds/google-merchant.xml", sendGoogleMerchantFeed);
  app.get("/feeds/google-merchant", sendGoogleMerchantFeed);
  app.get("/google-merchant.xml", sendGoogleMerchantFeed);
  app.get(getGoogleMerchantFeedFileUrlPath(), sendGoogleMerchantFeed);

  // Auth
  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated?.() && req.user) {
      return res.json({ user: req.user });
    }
    return res.json({ user: null });
  });

  app.post("/api/auth/login", authRateLimiter, (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: Express.User | false) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid username or password" });
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        return res.json({ user });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session?.destroy(() => {
        res.clearCookie("connect.sid");
        return res.json({ ok: true });
      });
    });
  });

  app.post("/api/contact", contactRateLimiter, async (req, res) => {
    const parsed = contactFormSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid form data",
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const { name, email, subject, message } = parsed.data;
    const supportEmail = process.env.SUPPORT_EMAIL || "support@smokecitysupplies.com";
    try {
      await sendContactFormEmail({
        to: supportEmail,
        name,
        email,
        subject,
        message,
      });
    } catch (err) {
      console.error("[contact] send failed:", err);
      return res.status(500).json({ message: "We couldn't send your message right now. Please try again shortly." });
    }
    return res.status(201).json({ ok: true, message: "Thanks for reaching out. We'll get back to you soon." });
  });

  app.post("/api/admin/test/resend", requireAuth, apiRateLimiter, async (req, res) => {
    const schema = z.object({
      to: z.string().email().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid email", errors: parsed.error.flatten().fieldErrors });
    }

    const to = parsed.data.to || "support@smokecitysupplies.com";
    await sendInvoiceEmail({
      to,
      subject: "Smoke City Supplies - Resend Test",
      html: `<p>This is a test invoice email from Smoke City Supplies.</p><p>Sent at ${new Date().toISOString()}</p>`,
    });

    return res.json({ ok: true, to, message: "Resend test email sent" });
  });

  app.post("/api/upload", requireAuth, apiRateLimiter, uploadMiddleware.single("image"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }
    const prepared = prepareUploadedImage(req.file);
    const stored = await storage.createStoredFile({
      kind: "product_image",
      filename: prepared.filename,
      mimeType: prepared.mimeType,
      content: prepared.content,
    });
    return res.status(201).json({ url: `/api/files/${stored.id}`, fileId: stored.id });
  });

  app.get("/api/files/:id", async (req, res) => {
    const file = await storage.getStoredFile(paramId(req));
    if (!file) return res.status(404).json({ message: "File not found" });
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Content-Disposition", `inline; filename="${file.filename}"`);
    return res.send(file.content);
  });

  // IndexNow helper
  const INDEXNOW_KEY = "b805a9eb7ee2426e9fcf9040df864717";
  function pingIndexNow(req: { protocol: string; get(name: string): string | undefined }, urls: string[]) {
    const base = resolvePublicBaseUrl(req);
    const host = new URL(base).host;
    const body = {
      host,
      key: INDEXNOW_KEY,
      keyLocation: `${base}/${INDEXNOW_KEY}.txt`,
      urlList: urls.map((u) => (u.startsWith("http") ? u : `${base}${u}`)),
    };

    fetch("https://api.indexnow.org/IndexNow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    }).catch((err) => console.error("[IndexNow] ping failed:", err));
  }

  // Products
  app.get("/api/products", async (_req, res) => {
    const products = await storage.listProducts();
    return res.json(products);
  });

  app.get("/api/products/:id", async (req, res) => {
    const product = await storage.getProduct(paramId(req));
    if (!product) return res.status(404).json({ message: "Product not found" });
    return res.json(product);
  });

  app.post("/api/products", requireAuth, apiRateLimiter, async (req, res) => {
    const parsed = insertProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid product", errors: parsed.error.flatten() });
    }
    const sanitized = sanitizeProductInput(parsed.data);
    const data: InsertProduct = {
      ...parsed.data,
      ...sanitized,
      vehicle: (sanitized.vehicle ?? parsed.data.vehicle) as string,
      category: (sanitized.category || parsed.data.category) as string,
      subcategory: (sanitized.subcategory || parsed.data.subcategory) as string,
      brand: (sanitized.brand || parsed.data.brand) as string,
    };

    const seo = await generateProductSeo(data);
    const product = await storage.createProduct({ ...data, ...seo });
    writeGoogleMerchantFeedFile("create-product").catch(() => {});
    pingIndexNow(req, [`/product/${product.id}`, "/store", "/sitemap.xml"]);
    return res.status(201).json(product);
  });

  app.patch("/api/products/bulk", requireAuth, apiRateLimiter, async (req, res) => {
    const { ids, patch } = req.body as { ids: string[]; patch: Partial<ApiProduct> };
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "ids must be a non-empty array" });
    }
    if (!patch || typeof patch !== "object") {
      return res.status(400).json({ message: "patch must be an object" });
    }
    const results: ApiProduct[] = [];
    for (const id of ids) {
      const existing = await storage.getProduct(id);
      if (!existing) continue;
      if (typeof patch.quantity === "number") {
        const updated = await storage.updateProductQuantity(id, patch.quantity);
        if (updated) results.push(updated);
      } else {
        const updated = await storage.updateProduct(id, patch);
        if (updated) results.push(updated);
      }
    }
    writeGoogleMerchantFeedFile("bulk-update").catch(() => {});
    if (isEbayConfigured()) {
      const ebayLinked = results.filter((p) => p.ebayListingId);
      if (ebayLinked.length > 0) {
        bulkSyncProducts(ebayLinked).catch(() => {});
      }
    }
    return res.json({ updated: results.length, products: results });
  });

  app.patch("/api/products/:id", requireAuth, apiRateLimiter, async (req, res) => {
    const id = paramId(req);
    const existing = await storage.getProduct(id);
    if (!existing) return res.status(404).json({ message: "Product not found" });
    const patch = req.body as Partial<ApiProduct>;
    const sanitized = sanitizeProductInput(patch);
    const seo = await generateProductSeo({ ...existing, ...patch, ...sanitized } as InsertProduct);
    const updated = await storage.updateProduct(id, { ...patch, ...sanitized, ...seo });
    writeGoogleMerchantFeedFile("update-product").catch(() => {});
    if (updated?.ebayListingId && isEbayConfigured()) {
      syncProductToEbay(updated).catch(() => {});
    }
    pingIndexNow(req, [`/product/${id}`, "/store", "/sitemap.xml"]);
    return res.json(updated);
  });

  app.patch("/api/products/:id/quantity", requireAuth, apiRateLimiter, async (req, res) => {
    const id = paramId(req);
    const { quantity } = req.body as { quantity?: number };
    if (typeof quantity !== "number" || quantity < 0) {
      return res.status(400).json({ message: "Invalid quantity" });
    }
    const updated = await storage.updateProductQuantity(id, quantity);
    if (!updated) return res.status(404).json({ message: "Product not found" });
    writeGoogleMerchantFeedFile("update-quantity").catch(() => {});
    if (updated?.ebayListingId && isEbayConfigured()) {
      syncProductQuantityToEbay(updated).catch(() => {});
    }
    pingIndexNow(req, [`/product/${id}`, "/store", "/sitemap.xml"]);
    return res.json(updated);
  });

  app.delete("/api/products/:id", requireAuth, apiRateLimiter, async (req, res) => {
    const id = paramId(req);
    const existing = await storage.getProduct(id);
    if (existing?.ebayListingId && isEbayConfigured()) {
      unsyncProductFromEbay(existing).catch(() => {});
    }
    const deleted = await storage.deleteProduct(id);
    if (!deleted) return res.status(404).json({ message: "Product not found" });
    writeGoogleMerchantFeedFile("delete-product").catch(() => {});
    pingIndexNow(req, [`/product/${id}`, "/store", "/sitemap.xml"]);
    return res.status(204).send();
  });

  // ── Admin Dashboard Stats ─────────────────────────────────────────────

  app.get("/api/admin/dashboard-stats", requireAuth, async (_req, res) => {
    try {
      const products = await storage.listProducts();
      const orders = await storage.listOrders();

      const totalProducts = products.length;
      const lowStockCount = products.filter((p) => p.stock === "low").length;
      const outOfStockCount = products.filter((p) => p.stock === "out").length;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const paidOrders = orders.filter((o) => o.paymentStatus === "paid");
      const recentOrderCount = paidOrders.filter(
        (o) => o.createdAt && new Date(o.createdAt) >= sevenDaysAgo
      ).length;
      const monthOrders = paidOrders.filter(
        (o) => o.createdAt && new Date(o.createdAt) >= startOfMonth
      );
      const revenueThisMonth = monthOrders.reduce(
        (sum, o) => sum + (o.totalPence ?? 0),
        0
      ) / 100;

      const ebayListedCount = products.filter((p) => p.ebayListingId).length;
      const ebaySyncErrors = products.filter((p) => p.ebaySyncStatus === "error").length;

      return res.json({
        totalProducts,
        lowStockCount,
        outOfStockCount,
        totalOrders: paidOrders.length,
        recentOrderCount,
        revenueThisMonth,
        ebayListedCount,
        ebaySyncErrors,
      });
    } catch (err) {
      console.error("[dashboard-stats] error:", err);
      return res.status(500).json({ message: "Failed to load dashboard stats" });
    }
  });

  // ── eBay Sync Routes ──────────────────────────────────────────────────

  app.get("/api/admin/ebay/status", requireAuth, async (_req, res) => {
    const env = process.env.EBAY_ENVIRONMENT ?? "production";
    const clientId = (process.env.EBAY_CLIENT_ID ?? "").trim();
    const clientSecret = (process.env.EBAY_CLIENT_SECRET ?? "").trim();
    const refreshToken = (process.env.EBAY_REFRESH_TOKEN ?? "").trim();
    const authUrl = env === "production" ? "https://api.ebay.com" : "https://api.sandbox.ebay.com";

    const oauthConnectUrl = getEbayAuthUrl();
    const debug: Record<string, unknown> = {
      environment: env,
      clientIdPrefix: clientId.slice(0, 24) + "...",
      clientSecretPrefix: clientSecret.slice(0, 8) + "...",
      clientSecretLength: clientSecret.length,
      refreshTokenLength: refreshToken.length,
      refreshTokenPrefix: refreshToken.slice(0, 8) + "...",
      authUrl,
      oauthConnectUrl,
    };

    if (!isEbayConfigured()) {
      return res.json({ connected: false, reason: "eBay credentials not configured", ...debug });
    }

    // Step 1: Test client credentials alone (no refresh token needed)
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    try {
      const ccRes = await fetch(`${authUrl}/identity/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          scope: "https://api.ebay.com/oauth/api_scope",
        }),
      });
      if (ccRes.ok) {
        debug.clientCredentialsTest = "PASS — Client ID + Secret are valid";
      } else {
        const text = await ccRes.text();
        debug.clientCredentialsTest = `FAIL (${ccRes.status}): ${text}`;
        return res.json({ connected: false, reason: "Client ID or Secret is invalid", ...debug });
      }
    } catch (err) {
      debug.clientCredentialsTest = `ERROR: ${err instanceof Error ? err.message : String(err)}`;
    }

    // Step 2: Test refresh token
    try {
      await getEbayAccessToken();
      return res.json({ connected: true, ...debug });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      debug.refreshTokenTest = `FAIL: ${msg}`;
      return res.json({ connected: false, reason: msg, ...debug });
    }
  });

  // ── eBay OAuth Connect Flow ────────────────────────────────────────────
  // Exchange auth code for tokens (called from frontend when eBay redirects back)
  app.post("/api/admin/ebay/exchange-code", async (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: "Missing authorization code" });
    try {
      const tokens = await exchangeEbayAuthCode(code);
      return res.json({
        refresh_token: tokens.refresh_token,
        expires_in: tokens.refresh_token_expires_in,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Token exchange failed";
      return res.status(400).json({ message: msg });
    }
  });

  // Start OAuth: redirects admin to eBay consent page
  app.get("/api/admin/ebay/connect", requireAuth, (_req, res) => {
    const url = getEbayAuthUrl();
    if (!url) {
      return res.status(400).json({ message: "Set EBAY_CLIENT_ID and EBAY_RUNAME first" });
    }
    return res.redirect(url);
  });

  // OAuth callback: eBay redirects here with ?code=... or ?error=...
  app.get("/api/admin/ebay/callback", async (req, res) => {
    const error = req.query.error as string | undefined;
    if (error) {
      const desc = req.query.error_description as string || "Unknown error";
      return res.status(400).send(`<!DOCTYPE html>
<html><head><title>eBay Error</title>
<style>body{font-family:system-ui,sans-serif;max-width:700px;margin:40px auto;padding:0 20px}
.err{color:#dc2626}a{color:#2563eb}pre{background:#f3f4f6;padding:12px;border-radius:6px;overflow-x:auto}</style></head>
<body>
<h2 class="err">eBay Authorization Failed</h2>
<pre>Error: ${error}\n${desc}</pre>
<p><a href="/admin/ebay">&larr; Back to eBay Settings</a></p>
</body></html>`);
    }
    const code = req.query.code as string | undefined;
    if (!code) {
      return res.status(400).send(`<!DOCTYPE html>
<html><head><title>eBay Error</title>
<style>body{font-family:system-ui,sans-serif;max-width:700px;margin:40px auto;padding:0 20px}
.err{color:#dc2626}a{color:#2563eb}</style></head>
<body>
<h2 class="err">Missing Authorization Code</h2>
<p>eBay did not return an authorization code. Query params received:</p>
<pre>${JSON.stringify(req.query, null, 2)}</pre>
<p><a href="/admin/ebay">&larr; Back to eBay Settings</a></p>
</body></html>`);
    }
    try {
      const tokens = await exchangeEbayAuthCode(code);
      const expiryDays = Math.floor(tokens.refresh_token_expires_in / 86400);
      return res.send(`<!DOCTYPE html>
<html><head><title>eBay Connected</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{font-family:system-ui,sans-serif;max-width:700px;margin:40px auto;padding:0 20px}
textarea{width:100%;height:180px;font:12px monospace;margin:12px 0;padding:8px;border:1px solid #ccc;border-radius:6px}
.ok{color:#16a34a;font-size:1.5rem;font-weight:bold}
a{color:#2563eb}</style></head>
<body>
<p class="ok">eBay Connected Successfully!</p>
<p>Copy the refresh token below and paste it into your Render environment variable <code>EBAY_REFRESH_TOKEN</code>, then redeploy:</p>
<textarea id="tok" readonly onclick="this.select()">${tokens.refresh_token}</textarea>
<button onclick="navigator.clipboard.writeText(document.getElementById('tok').value).then(()=>this.textContent='Copied!')">Copy to Clipboard</button>
<p>This token is valid for <strong>${expiryDays} days</strong>.</p>
<p><a href="/admin/ebay">&larr; Back to eBay Settings</a></p>
</body></html>`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(400).send(`<!DOCTYPE html>
<html><head><title>eBay Error</title>
<style>body{font-family:system-ui,sans-serif;max-width:700px;margin:40px auto;padding:0 20px}
.err{color:#dc2626}a{color:#2563eb}</style></head>
<body>
<h2 class="err">eBay Connection Failed</h2>
<pre>${msg}</pre>
<p><a href="/admin/ebay">&larr; Back to eBay Settings</a></p>
</body></html>`);
    }
  });

  // Fetch eBay business policy IDs (so you can put them in .env)
  app.get("/api/admin/ebay/policies", requireAuth, async (_req, res) => {
    if (!isEbayConfigured()) {
      return res.status(400).json({ message: "eBay not configured" });
    }
    try {
      const token = await getEbayAccessToken();
      const types = ["PAYMENT", "RETURN_POLICY", "FULFILLMENT"] as const;
      const results: Record<string, Array<{ id: string; name: string }>> = {};
      for (const type of types) {
        const r = await fetch(
          `https://api.ebay.com/sell/account/v1/fulfillment_policy?marketplace_id=EBAY_GB`.replace(
            "fulfillment_policy",
            type === "PAYMENT" ? "payment_policy" : type === "RETURN_POLICY" ? "return_policy" : "fulfillment_policy"
          ),
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (r.ok) {
          const data = (await r.json()) as { [key: string]: Array<{ [key: string]: string; name: string }> };
          const key = Object.keys(data).find((k) => Array.isArray(data[k])) ?? "";
          results[type] = (data[key] || []).map((p: Record<string, string>) => ({
            id: p.paymentPolicyId || p.returnPolicyId || p.fulfillmentPolicyId || "",
            name: p.name || "",
          }));
        }
      }
      return res.json(results);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ message: msg });
    }
  });

  app.post("/api/admin/ebay/sync/:id", requireAuth, apiRateLimiter, async (req, res) => {
    if (!isEbayConfigured()) {
      return res.status(400).json({ message: "eBay not configured" });
    }
    const id = paramId(req);
    const product = await storage.getProduct(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    try {
      const result = await syncProductToEbay(product);
      return res.json({ success: true, ...result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await storage.updateProduct(id, { ebaySyncStatus: "error" } as Partial<ApiProduct>).catch(() => {});
      return res.status(500).json({ message: msg });
    }
  });

  app.post("/api/admin/ebay/sync-bulk", requireAuth, apiRateLimiter, async (req, res) => {
    if (!isEbayConfigured()) {
      return res.status(400).json({ message: "eBay not configured" });
    }
    const { ids } = req.body as { ids?: string[] };
    let products: ApiProduct[];

    if (ids && ids.length > 0) {
      const allProducts = await Promise.all(ids.map((id) => storage.getProduct(id)));
      products = allProducts.filter((p): p is ApiProduct => p !== null && p !== undefined);
    } else {
      products = await storage.listProducts();
    }

    const result = await bulkSyncProducts(products);
    return res.json(result);
  });

  app.post("/api/admin/ebay/unsync/:id", requireAuth, apiRateLimiter, async (req, res) => {
    if (!isEbayConfigured()) {
      return res.status(400).json({ message: "eBay not configured" });
    }
    const id = paramId(req);
    const product = await storage.getProduct(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    try {
      await unsyncProductFromEbay(product);
      return res.json({ success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ message: msg });
    }
  });

  app.post("/api/admin/ebay/pull-stock", requireAuth, apiRateLimiter, async (_req, res) => {
    if (!isEbayConfigured()) {
      return res.status(400).json({ message: "eBay not configured" });
    }
    try {
      await pullStockFromEbay();
      return res.json({ success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ message: msg });
    }
  });

  // ── eBay Marketplace Account Deletion (compliance) ──────────────────
  // eBay requires this endpoint to validate your app. It handles both
  // the GET challenge (verification) and POST notification (account deletion).
  const EBAY_VERIFICATION_TOKEN = process.env.EBAY_VERIFICATION_TOKEN ?? "";

  app.get("/api/ebay/account-deletion", (req, res) => {
    const challengeCode = req.query.challenge_code as string | undefined;
    if (!challengeCode) {
      return res.status(400).json({ message: "Missing challenge_code" });
    }
    // eBay expects SHA-256 hash of: challengeCode + verificationToken + endpoint
    const crypto = require("crypto") as typeof import("crypto");
    const endpoint = `${process.env.PUBLIC_BASE_URL ?? "http://localhost:3000"}/api/ebay/account-deletion`;
    const hash = crypto
      .createHash("sha256")
      .update(challengeCode + EBAY_VERIFICATION_TOKEN + endpoint)
      .digest("hex");
    return res.status(200).json({ challengeResponse: hash });
  });

  app.post("/api/ebay/account-deletion", (req, res) => {
    // Log the deletion notification — no user data to delete since we don't
    // store eBay buyer accounts, but we acknowledge receipt.
    console.log("[ebay] Marketplace account deletion notification received:", JSON.stringify(req.body));
    return res.sendStatus(200);
  });

  // Barcode + inventory admin workflows
  app.post("/api/admin/barcodes/resolve", requireAuth, apiRateLimiter, async (req, res) => {
    const parsed = barcodeResolveSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid barcode", errors: parsed.error.flatten().fieldErrors });
    }

    const resolved = await storage.resolveBarcode(parsed.data.code.trim());
    if (!resolved.product || !resolved.barcode) {
      return res.status(404).json({
        message: "Barcode not linked",
        code: parsed.data.code.trim(),
        action: "create-product",
      });
    }

    return res.json({ barcode: resolved.barcode, product: resolved.product, action: "confirm" });
  });

  app.post("/api/admin/barcodes/link", requireAuth, apiRateLimiter, async (req, res) => {
    const parsed = barcodeLinkSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid barcode link", errors: parsed.error.flatten().fieldErrors });
    }

    const product = await storage.getProduct(parsed.data.productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const barcode = await storage.linkBarcode(
      parsed.data.code.trim(),
      parsed.data.productId,
      parsed.data.format || "unknown"
    );

    return res.status(201).json({ barcode });
  });

  app.post("/api/admin/inventory/stock-in", requireAuth, apiRateLimiter, async (req, res) => {
    const parsed = stockInSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid stock-in payload", errors: parsed.error.flatten().fieldErrors });
    }

    const updated = await storage.stockInByBarcode({
      code: parsed.data.code.trim(),
      quantity: parsed.data.quantity,
      reason: parsed.data.reason,
      actor: req.user?.username || "admin",
    });

    if (!updated) {
      return res.status(404).json({ message: "Barcode not linked to a product" });
    }

    writeGoogleMerchantFeedFile("stock-in-by-barcode").catch(() => {});
    return res.json(updated);
  });

  app.post("/api/admin/inventory/stock-out", requireAuth, apiRateLimiter, async (req, res) => {
    const parsed = stockOutSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid stock-out payload", errors: parsed.error.flatten().fieldErrors });
    }

    const updated = await storage.stockOutByBarcode({
      code: parsed.data.code.trim(),
      quantity: parsed.data.quantity,
      reason: parsed.data.reason,
      actor: req.user?.username || "admin",
    });

    if (!updated) {
      return res.status(404).json({ message: "Barcode not linked to a product" });
    }

    writeGoogleMerchantFeedFile("stock-out-by-barcode").catch(() => {});
    return res.json(updated);
  });

  app.get("/api/admin/inventory/transactions", requireAuth, async (req, res) => {
    const limit = Number(req.query.limit ?? 50);
    const tx = await storage.listInventoryTransactions(Number.isFinite(limit) ? limit : 50);
    return res.json(tx);
  });

  app.post("/api/admin/orders/:id/fulfillment/scan", requireAuth, apiRateLimiter, async (req, res) => {
    const orderId = paramId(req);
    const parsed = fulfillmentScanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid fulfillment scan", errors: parsed.error.flatten().fieldErrors });
    }

    const order = await storage.getOrder(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.paymentStatus !== "paid") {
      return res.status(400).json({ message: "Order is not paid yet" });
    }

    let selectedProductId = parsed.data.productId;
    let selectedBarcodeId: string | undefined;
    let selectedProductName = "";

    if (parsed.data.code) {
      const resolved = await storage.resolveBarcode(parsed.data.code.trim());
      if (!resolved.product) {
        return res.status(404).json({ message: "Barcode not linked to a product" });
      }
      selectedProductId = resolved.product.id;
      selectedProductName = resolved.product.name;
      selectedBarcodeId = resolved.barcode?.id;
    }

    if (!selectedProductId) {
      return res.status(400).json({ message: "Scan a barcode or select a product" });
    }

    const matchingItem = order.items.find((item) => item.productId === selectedProductId);
    if (!matchingItem) {
      return res.status(400).json({ message: "Selected product does not belong to this order" });
    }

    const progressBefore = await storage.getOrderFulfillmentProgress(orderId);
    const existing = progressBefore.find((p) => p.productId === selectedProductId);
    const scannedAlready = existing?.scanned || 0;
    if (scannedAlready + parsed.data.quantity > matchingItem.quantity) {
      return res.status(400).json({
        message: "Packed quantity exceeds ordered quantity",
        productId: selectedProductId,
        ordered: matchingItem.quantity,
        alreadyPacked: scannedAlready,
      });
    }

    const packedResult = await storage.recordOrderFulfillmentScan({
      orderId,
      productId: selectedProductId,
      barcodeId: selectedBarcodeId,
      quantity: parsed.data.quantity,
      actor: req.user?.username || "admin",
    });

    return res.json({
      ok: true,
      orderId,
      scannedProduct: {
        id: selectedProductId,
        name: selectedProductName || matchingItem.productName,
      },
      scannedQty: parsed.data.quantity,
      packed: packedResult.packed,
      progress: packedResult.progress,
      note: packedResult.packed
        ? "Order fully packed. Stock was already deducted at payment confirmation."
        : "Fulfillment scan recorded. Continue scanning remaining items.",
    });
  });

  // SEO generation via AI API
  app.post("/api/generate-seo", requireAuth, apiRateLimiter, async (req, res) => {
    const { productInfo } = req.body as { productInfo?: string };
    if (!productInfo || typeof productInfo !== "string" || productInfo.trim().length < 3) {
      return res.status(400).json({ message: "Please describe the product" });
    }

    try {
      const { client, model, provider } = getAIClient();

      const completion = await client.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: `You are an SEO expert for Smoke City Supplies, a UK-based motorcycle and scooter parts shop. Generate SEO metadata for products. Respond ONLY with valid JSON in this exact format, nothing else:
{"metaTitle":"...","metaDescription":"...","metaKeywords":"..."}

Rules:
- metaTitle: max 60 characters, include product name and "Smoke City Supplies"
- metaDescription: max 160 characters, compelling description with key features and UK delivery mention
- metaKeywords: comma-separated relevant search terms (8-12 keywords)`,
          },
          { role: "user", content: `Generate SEO metadata for this product: ${productInfo.trim().slice(0, 500)}` },
        ],
        max_tokens: 1024,
        ...(provider === "nvidia" ? { temperature: 0.2, top_p: 0.7 } : {}),
      } as any);

      const content = completion.choices?.[0]?.message?.content?.trim();
      if (!content) return res.status(500).json({ message: "No response from AI model" });

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const seo = JSON.parse(jsonMatch ? jsonMatch[0] : content) as {
        metaTitle?: string;
        metaDescription?: string;
        metaKeywords?: string;
      };

      return res.json({
        metaTitle: (seo.metaTitle ?? "").slice(0, 120),
        metaDescription: (seo.metaDescription ?? "").slice(0, 320),
        metaKeywords: (seo.metaKeywords ?? "").slice(0, 500),
      });
    } catch (err) {
      console.error("[generate-seo] error:", err);
      const message = err instanceof Error ? err.message : "SEO generation failed";
      return res.status(500).json({ message });
    }
  });

  // AI product detail generation — fills description, tags, compatibility in one shot
  app.post("/api/generate-product-details", requireAuth, apiRateLimiter, async (req, res) => {
    const { name, brand, category, vehicle } = req.body as {
      name?: string;
      brand?: string;
      category?: string;
      vehicle?: string;
    };
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({ message: "Product name is required" });
    }

    try {
      const { client, model } = getAIClient();

      const completion = await client.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: `You are a product copywriter for Smoke City Supplies, a UK motorcycle and scooter parts shop run by Karl. Write in a friendly, knowledgeable tone. Respond ONLY with valid JSON in this exact format, nothing else:
{"description":"...","tags":"...","compatibility":"..."}

Rules:
- description: 2-3 sentences, practical and helpful, mention key benefits. UK English.
- tags: 4-6 comma-separated tags relevant to the product (e.g. "Popular, Fast shipping, OEM quality")
- compatibility: 3-5 compatible bike models with year ranges, comma-separated (e.g. "Honda CBR600RR (2007-2024), Yamaha R6 (2006-2020)"). If you cannot determine compatibility from the product name, return an empty string.`,
          },
          {
            role: "user",
            content: [
              `Product: ${name.trim()}`,
              brand ? `Brand: ${brand}` : "",
              category ? `Category: ${category}` : "",
              vehicle ? `Vehicle type: ${vehicle}` : "",
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const content = completion.choices?.[0]?.message?.content ?? "";
      if (!content) return res.status(500).json({ message: "No response from AI" });

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content) as {
        description?: string;
        tags?: string;
        compatibility?: string;
      };

      return res.json({
        description: (parsed.description ?? "").slice(0, 1000),
        tags: (parsed.tags ?? "").slice(0, 500),
        compatibility: (parsed.compatibility ?? "").slice(0, 500),
      });
    } catch (err) {
      console.error("[generate-product-details] error:", err);
      const message = err instanceof Error ? err.message : "Product detail generation failed";
      return res.status(500).json({ message });
    }
  });

  // Public compatibility check — customer enters bike, gets yes/no
  app.post("/api/check-compatibility", apiRateLimiter, async (req, res) => {
    const { productName, partNumber, compatibility, bike } = req.body as {
      productName?: string;
      partNumber?: string;
      compatibility?: string[];
      bike?: string;
    };
    if (!bike || typeof bike !== "string" || bike.trim().length < 3) {
      return res.status(400).json({ message: "Please enter your bike details" });
    }
    if (!productName) {
      return res.status(400).json({ message: "Missing product info" });
    }

    // If the bike is already listed in the compatibility array, skip AI
    const bikeLower = bike.trim().toLowerCase();
    if (compatibility?.some((c) => bikeLower.includes(c.toLowerCase().replace(/\s*\(.*?\)\s*/g, "").trim()))) {
      return res.json({ compatible: "yes", reason: "Your bike is listed as compatible with this part." });
    }

    try {
      const { client, model, provider } = getAIClient();

      const compatList = compatibility?.length ? compatibility.join(", ") : "none listed";
      const completion = await client.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: `You check if a motorcycle/scooter part fits a specific bike. Answer ONLY with JSON: {"compatible":"yes"|"no","reason":"one sentence"}. Never use "likely" — commit to yes or no. Be concise. Use max 1 sentence for reason.`,
          },
          {
            role: "user",
            content: `Part: ${productName}${partNumber ? ` (${partNumber})` : ""}\nKnown compatible bikes: ${compatList}\nCustomer's bike: ${bike.trim()}\n\nDoes this part fit?`,
          },
        ],
        max_tokens: 100,
        temperature: 0,
        ...(provider === "nvidia"
          ? { top_p: 0.7 }
          : { web_search_options: { search_context_size: "low" } }),
      } as any);

      const content = completion.choices?.[0]?.message?.content?.trim();
      if (!content) return res.status(500).json({ message: "No response" });

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const result = JSON.parse(jsonMatch ? jsonMatch[0] : content) as { compatible?: string; reason?: string };

      // Normalise — treat "likely" / anything non-"no" as "yes"
      const raw = (result.compatible ?? "").toLowerCase();
      const compatible = raw === "no" ? "no" : "yes";
      return res.json({
        compatible,
        reason: result.reason ?? "",
      });
    } catch (err) {
      console.error("[check-compatibility] error:", err);
      return res.status(500).json({ message: "Compatibility check failed" });
    }
  });

  // Combined AI content generation (description, features, compatibility, SEO)
  app.post("/api/generate-product-content", requireAuth, apiRateLimiter, async (req, res) => {
    const { productInfo } = req.body as { productInfo?: string };
    if (!productInfo || typeof productInfo !== "string" || productInfo.trim().length < 3) {
      return res.status(400).json({ message: "Please describe the product" });
    }

    try {
      const { client, model, provider } = getAIClient();

      const completion = await client.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: `You are a product content expert for Smoke City Supplies, a UK-based motorcycle and scooter parts shop, with web search access.
Search for actual product information and compatibility data for this specific part.
Generate comprehensive product content. Respond ONLY with valid JSON in this exact format, nothing else:
{"description":"...","features":["...","..."],"compatibility":"Model1 (2018-2024), Model2 (2020-2025)","metaTitle":"...","metaDescription":"...","metaKeywords":"..."}

Rules:
- description: 2-3 sentences, clear and informative, mention key benefits
- features: 3-6 bullet points highlighting key product features
- compatibility: First identify the part number and OEM cross-references. Then search Wemoto, CMSNL, Larsson's, manufacturer OEM fiche, BikeBandit, Fowlers, and the aftermarket manufacturer's own fitment guide. ONLY include models you found listed as compatible in at least one real source — you must be 90%+ confident the part fits. Do NOT guess based on similar engines or shared platforms. If the same model appears with minor variants (BHP, sub-cc), list ONCE with the widest year range. Different generations stay separate. Format: "Manufacturer Model (StartYear-EndYear)". Do NOT limit results — list all verified models.
- metaTitle: max 60 characters, include product name and "Smoke City Supplies"
- metaDescription: max 160 characters, compelling description with UK delivery mention
- metaKeywords: comma-separated relevant search terms (8-12 keywords)`,
          },
          { role: "user", content: `Search for real product data and generate content for: ${productInfo.trim().slice(0, 500)}\n\nFor compatibility: identify the part number and OEM cross-references first, then search each source.` },
        ],
        max_tokens: 8192,
        temperature: 0.1,
        ...(provider === "nvidia"
          ? { top_p: 0.7 }
          : { web_search_options: { search_context_size: "high" } }),
      } as any);

      const content = completion.choices?.[0]?.message?.content?.trim();
      if (!content) return res.status(500).json({ message: "No response from AI model" });

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const result = JSON.parse(jsonMatch ? jsonMatch[0] : content) as {
        description?: string;
        features?: string[];
        compatibility?: string;
        metaTitle?: string;
        metaDescription?: string;
        metaKeywords?: string;
      };

      return res.json({
        description: (result.description ?? "").slice(0, 2000),
        features: Array.isArray(result.features) ? result.features.slice(0, 10) : [],
        compatibility: (result.compatibility ?? "").slice(0, 10000),
        metaTitle: (result.metaTitle ?? "").slice(0, 120),
        metaDescription: (result.metaDescription ?? "").slice(0, 320),
        metaKeywords: (result.metaKeywords ?? "").slice(0, 500),
      });
    } catch (err) {
      console.error("[generate-product-content] error:", err);
      const message = err instanceof Error ? err.message : "Content generation failed";
      return res.status(500).json({ message });
    }
  });

  // Stripe config endpoint
  app.get("/api/stripe/config", (_req, res) => {
    return res.json({ publishableKey: STRIPE_PUBLISHABLE_KEY });
  });

  app.get("/api/shipping/rates", (_req, res) => {
    return res.status(405).json({
      message: "Use POST /api/shipping/rates with cart items and delivery details to fetch live shipping options.",
    });
  });

  app.post("/api/shipping/rates", orderRateLimiter, async (req, res) => {
    const parsed = shippingRatesQuoteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid shipping quote payload", errors: parsed.error.flatten().fieldErrors });
    }
    const customerName = parsed.data.customerName.trim();
    const customerEmail = parsed.data.customerEmail.trim();
    const addressLine1 = parsed.data.addressLine1.trim();
    const city = parsed.data.city.trim();
    const postcode = parsed.data.postcode.trim().toUpperCase();

    if (!customerName || !customerEmail || !addressLine1 || !city || !postcode) {
      return res.status(400).json({
        message: "Enter delivery name, email, address line 1, city, and postcode before requesting shipping options.",
      });
    }

    const productMap = await getProductMap();
    const parcels = buildParcelsForItems(productMap, parsed.data.items);
    const dispatchInfo = dispatchAdviceNow();

    const quoteInput = {
      name: customerName,
      email: customerEmail,
      addressLine1,
      addressLine2: parsed.data.addressLine2,
      city,
      county: parsed.data.county,
      postcode,
      country: parsed.data.country || "GB",
      parcels,
    };

    let rates: import("./shipping/royalMailManual").ShippingQuote[] = [];
    try {
      rates = quoteRoyalMailFlatRates(quoteInput);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to quote shipping";
      return res.status(400).json({ message });
    }

    if (!rates.length) {
      return res.status(400).json({ message: "No shipping options available. Please check your address and try again." });
    }

    return res.json({
      rates: rates.map((rate) => ({
        ...rate,
        nextDayEligibleNow: Boolean(rate.estimatedDays === 1 && dispatchInfo.dispatchAdvice.includes("before 6:00 PM")),
      })),
      dispatchAdvice: dispatchInfo.dispatchAdvice,
      dispatchCutoffLocal: dispatchInfo.cutoffLocal,
      expectedShipDate: dispatchInfo.expectedShipDate,
    });
  });

  // New checkout flow: create order + payment intent together.
  app.post("/api/checkout/prepare", orderRateLimiter, async (req, res) => {
    const parsed = checkoutPrepareSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid checkout payload", errors: parsed.error.flatten().fieldErrors });
    }

    const productMap = await getProductMap();

    // Validate stock availability and re-verify prices from DB
    const stockErrors: string[] = [];
    for (const item of parsed.data.items) {
      const dbProduct = productMap.get(item.productId);
      if (!dbProduct) {
        stockErrors.push(`Product "${item.productName}" is no longer available.`);
        continue;
      }
      if (dbProduct.quantity < item.quantity) {
        stockErrors.push(
          dbProduct.quantity === 0
            ? `"${dbProduct.name}" is out of stock.`
            : `Only ${dbProduct.quantity} of "${dbProduct.name}" available (you requested ${item.quantity}).`
        );
      }
      if (Math.round(dbProduct.price * 100) !== Math.round(item.priceEach * 100)) {
        stockErrors.push(
          `Price for "${dbProduct.name}" has changed to £${dbProduct.price.toFixed(2)}. Please refresh your cart.`
        );
      }
    }
    if (stockErrors.length > 0) {
      return res.status(409).json({ message: "Some items are unavailable", stockErrors });
    }

    const subtotalPence = Math.round(
      parsed.data.items.reduce((sum, item) => {
        const dbProduct = productMap.get(item.productId)!;
        return sum + dbProduct.price * item.quantity * 100;
      }, 0)
    );
    const parcels = buildParcelsForItems(productMap, parsed.data.items);
    const dispatchInfo = dispatchAdviceNow();

    let selectedShippingAmountPence = parsed.data.shippingAmountPence;
    let selectedShippingProvider = parsed.data.shippingProvider;
    let selectedShippingServiceLevel = parsed.data.shippingServiceLevel;
    let selectedShippingEstimatedDays = parsed.data.shippingEstimatedDays;

    const checkoutQuoteInput = {
      name: fullCustomerName(parsed.data),
      email: parsed.data.customerEmail,
      addressLine1: parsed.data.addressLine1,
      addressLine2: parsed.data.addressLine2,
      city: parsed.data.city,
      county: parsed.data.county,
      postcode: parsed.data.postcode,
      country: parsed.data.country || "GB",
      parcels,
    };

    let liveRates: import("./shipping/royalMailManual").ShippingQuote[] = [];
    try {
      liveRates = quoteRoyalMailFlatRates(checkoutQuoteInput);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to quote shipping";
      return res.status(400).json({ message });
    }

    if (!liveRates.length) {
      return res.status(400).json({ message: "No shipping options available for this address. Please check your details." });
    }
    const selectedRate =
      liveRates.find((rate) => rate.rateId === parsed.data.shippingRateId) ??
      liveRates.find(
        (rate) =>
          rate.provider.toLowerCase() === parsed.data.shippingProvider.toLowerCase() &&
          rate.serviceName.toLowerCase() === parsed.data.shippingServiceLevel.toLowerCase()
      );
    if (!selectedRate) {
      return res.status(400).json({ message: "Selected shipping rate is no longer available. Please refresh shipping options." });
    }
    selectedShippingAmountPence = selectedRate.amountPence;
    selectedShippingProvider = selectedRate.provider;
    selectedShippingServiceLevel = selectedRate.serviceName;
    selectedShippingEstimatedDays = selectedRate.estimatedDays;

    const amountPence = subtotalPence + selectedShippingAmountPence;

    if (amountPence <= 0) {
      return res.status(400).json({ message: "Invalid order amount" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountPence,
      currency: "gbp",
      automatic_payment_methods: { enabled: true },
      metadata: {
        customerEmail: parsed.data.customerEmail,
        customerName: fullCustomerName(parsed.data),
      },
    });

    const order = await storage.createOrder({
      ...parsed.data,
      customerName: fullCustomerName(parsed.data),
      stripePaymentIntentId: paymentIntent.id,
      paymentStatus: "awaiting_payment",
      subtotalPence,
      shippingAmountPence: selectedShippingAmountPence,
      shippingProvider: selectedShippingProvider,
      shippingServiceLevel: selectedShippingServiceLevel,
      shippingEstimatedDays: selectedShippingEstimatedDays,
      dispatchAdvice: dispatchInfo.dispatchAdvice,
      dispatchCutoffLocal: dispatchInfo.cutoffLocal,
      expectedShipDate: dispatchInfo.expectedShipDate,
    });

    await stripe.paymentIntents.update(paymentIntent.id, {
      metadata: {
        ...paymentIntent.metadata,
        orderId: order.id,
        shippingRateId: parsed.data.shippingRateId,
        shippingServiceLevel: selectedShippingServiceLevel,
      },
    });

    return res.json({
      orderId: order.id,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amountPence,
      subtotalPence,
      shippingAmountPence: selectedShippingAmountPence,
      shippingServiceLevel: selectedShippingServiceLevel,
      dispatchAdvice: dispatchInfo.dispatchAdvice,
      dispatchCutoffLocal: dispatchInfo.cutoffLocal,
      expectedShipDate: dispatchInfo.expectedShipDate,
    });
  });

  // Legacy endpoint kept for compatibility with older clients.
  app.post("/api/stripe/create-payment-intent", orderRateLimiter, async (req, res) => {
    try {
      const { amount, customerEmail, customerName } = req.body;

      if (!amount || typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: "gbp",
        automatic_payment_methods: { enabled: true },
        metadata: {
          customerEmail: customerEmail || "",
          customerName: customerName || "",
        },
      });

      return res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
    } catch (err) {
      console.error("Stripe payment intent error:", err);
      return res.status(500).json({ message: "Payment initialization failed" });
    }
  });

  app.post("/api/stripe/webhook", async (req, res) => {
    const signature = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature || typeof signature !== "string" || !webhookSecret) {
      return res.status(400).send("Missing webhook signature or secret");
    }

    try {
      const rawBody = req.rawBody as Buffer | undefined;
      if (!rawBody) return res.status(400).send("Missing raw body");

      const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

      if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object;
        const order = await storage.markOrderPaidByPaymentIntent(paymentIntent.id);
        if (order) {
          try {
            const withInvoice = await ensureInvoiceSent(order);
            if (withInvoice.customerEmail && !withInvoice.customerOrderEmailSentAt) {
              await sendOrderConfirmationEmail({
                to: withInvoice.customerEmail,
                orderId: withInvoice.id,
                customerName: withInvoice.customerName,
                totalPence: withInvoice.totalPence,
                subtotalPence: withInvoice.subtotalPence,
                shippingAmountPence: withInvoice.shippingAmountPence,
                shippingServiceLevel: withInvoice.shippingServiceLevel,
                dispatchAdvice: withInvoice.dispatchAdvice,
                items: withInvoice.items,
              });
            }
            const adminEmail = process.env.ADMIN_ORDER_ALERT_EMAIL || "support@smokecitysupplies.com";
            if (!withInvoice.adminAlertEmailSentAt) {
              await sendAdminOrderAlertEmail({
                to: adminEmail,
                orderId: withInvoice.id,
                customerName: withInvoice.customerName,
                customerEmail: withInvoice.customerEmail,
                totalPence: withInvoice.totalPence,
                items: withInvoice.items,
              });
            }
            await storage.recordOrderEmailEvents(withInvoice.id, {
              customerOrderEmailSentAt: withInvoice.customerOrderEmailSentAt ?? (withInvoice.customerEmail ? new Date().toISOString() : undefined),
              adminAlertEmailSentAt: withInvoice.adminAlertEmailSentAt ?? new Date().toISOString(),
            });
          } catch (invoiceErr) {
            console.error("[order confirmation] send failed:", invoiceErr);
          }
        }
      }

      if (event.type === "payment_intent.payment_failed") {
        const paymentIntent = event.data.object;
        await storage.markOrderPaymentFailedByPaymentIntent(paymentIntent.id);
      }

      return res.json({ received: true });
    } catch (err) {
      console.error("[stripe webhook] error:", err);
      return res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : "unknown"}`);
    }
  });

  // Orders
  app.post("/api/orders", orderRateLimiter, async (req, res) => {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid order", errors: parsed.error.flatten() });
    }
    const input: CreateOrderInput = parsed.data;
    const order = await storage.createOrder(input);
    return res.status(201).json(order);
  });

  app.get("/api/orders", requireAuth, async (_req, res) => {
    const orders = await storage.listOrders();
    return res.json(orders);
  });

  app.get("/api/orders/:id", requireAuth, async (req, res) => {
    const order = await storage.getOrder(paramId(req));
    if (!order) return res.status(404).json({ message: "Order not found" });
    return res.json(order);
  });

  app.patch("/api/orders/:id", requireAuth, apiRateLimiter, async (req, res) => {
    const id = paramId(req);
    const parsed = orderStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid order status",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    // Fetch order before updating so we can detect status changes
    const before = await storage.getOrder(id);
    if (!before) return res.status(404).json({ message: "Order not found" });

    const newStatus = parsed.data.status;
    const updated = await storage.updateOrderStatus(id, newStatus);
    if (!updated) return res.status(404).json({ message: "Order not found" });

    // Send status email for every status transition
    console.log("[order status] change:", { orderId: id, from: before.status, to: newStatus, customerEmail: updated.customerEmail ?? "(none)" });
    if (before.status !== newStatus && updated.customerEmail) {
      console.log("[order status] sending email for:", newStatus, "to:", updated.customerEmail);
      try {
        switch (newStatus) {
          case "processing":
            await sendOrderProcessingEmail({
              to: updated.customerEmail,
              orderId: updated.id,
              customerName: updated.customerName,
              items: updated.items,
            });
            break;
          case "shipped":
            await sendOrderShippedEmail({
              to: updated.customerEmail,
              orderId: updated.id,
              customerName: updated.customerName,
              trackingNumber: updated.trackingNumber,
              shippingLabelUrl: updated.shippingLabelUrl,
              shippingServiceLevel: updated.shippingServiceLevel,
              items: updated.items,
            });
            await storage.recordOrderEmailEvents(updated.id, { customerShippedEmailSentAt: new Date().toISOString() });
            break;
          case "delivered":
            await sendOrderDeliveredEmail({
              to: updated.customerEmail,
              orderId: updated.id,
              customerName: updated.customerName,
              items: updated.items,
            });
            break;
          case "cancelled":
            await sendOrderCancelledEmail({
              to: updated.customerEmail,
              orderId: updated.id,
              customerName: updated.customerName,
              totalPence: updated.totalPence,
              items: updated.items,
            });
            break;
          default:
            console.log("[order status] no email template for status:", newStatus);
            break;
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[order ${newStatus} email] failed:`, errMsg);
        return res.json({ ...updated, _emailError: errMsg });
      }
    } else {
      console.log("[order status] skipping email:", before.status === newStatus ? "status unchanged" : "no customer email");
    }

    return res.json(updated);
  });

  app.post("/api/admin/orders/:id/refund", requireAuth, apiRateLimiter, async (req, res) => {
    const orderId = paramId(req);
    const order = await storage.getOrder(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.paymentStatus !== "paid") {
      return res.status(400).json({ message: `Cannot refund order with payment status "${order.paymentStatus}"` });
    }

    if (!order.stripePaymentIntentId) {
      return res.status(400).json({ message: "Order has no Stripe payment intent — cannot process refund" });
    }

    try {
      const refund = await stripe.refunds.create({
        payment_intent: order.stripePaymentIntentId,
      });

      const updated = await storage.markOrderRefunded(orderId);

      // Send cancellation/refund email if customer has email
      if (updated?.customerEmail) {
        try {
          await sendOrderCancelledEmail({
            to: updated.customerEmail,
            orderId: updated.id,
            customerName: updated.customerName,
            totalPence: updated.totalPence,
            items: updated.items,
          });
        } catch (emailErr) {
          console.error("[refund email] failed:", emailErr);
        }
      }

      return res.json({
        ok: true,
        refundId: refund.id,
        refundStatus: refund.status,
        amountRefunded: refund.amount,
        order: updated,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Refund failed";
      console.error("[refund] Stripe error:", message);
      return res.status(500).json({ message: `Refund failed: ${message}` });
    }
  });

  app.get("/api/admin/orders/:id/invoice.pdf", requireAuth, async (req, res) => {
    const order = await storage.getOrder(paramId(req));
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.invoiceFileId) {
      const existing = await storage.getStoredFile(order.invoiceFileId);
      if (existing) {
        res.setHeader("Content-Type", existing.mimeType);
        res.setHeader("Content-Disposition", `inline; filename="${existing.filename}"`);
        return res.send(existing.content);
      }
    }

    const invoiceNumber = order.invoiceNumber || createInvoiceNumber();
    const pdf = renderInvoicePdfBuffer({ ...order, invoiceNumber });
    const savedFile = await storage.createStoredFile({
      kind: "invoice_pdf",
      filename: `${invoiceNumber}.pdf`,
      mimeType: "application/pdf",
      content: pdf,
    });
    await storage.recordOrderInvoice(order.id, {
      invoiceNumber,
      invoiceUrl: `/api/files/${savedFile.id}`,
      invoiceFileId: savedFile.id,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=\"${invoiceNumber}.pdf\"`);
    return res.send(pdf);
  });

  app.post("/api/admin/orders/:id/invoice/resend", requireAuth, apiRateLimiter, async (req, res) => {
    const order = await storage.getOrder(paramId(req));
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (!order.customerEmail) return res.status(400).json({ message: "Order has no customer email" });
    if (order.paymentStatus !== "paid") return res.status(400).json({ message: "Invoice can only be sent for paid orders" });

    const updated = await ensureInvoiceSent(order);
    return res.json({ ok: true, order: updated });
  });

  app.get("/api/admin/orders/:id/packing-slip", requireAuth, async (req, res) => {
    const order = await storage.getOrder(paramId(req));
    if (!order) return res.status(404).json({ message: "Order not found" });
    const html = buildPackingSlipHtml(order);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(html);
  });

  // Bike Finder
  app.post("/api/bike-finder", apiRateLimiter, async (req, res) => {
    const parsed = bikeFinderInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid bike input", errors: parsed.error.flatten().fieldErrors });
    }
    try {
      const result = await findPartsForBike(parsed.data);
      return res.json(result);
    } catch (err: any) {
      console.error("[bike-finder] error:", err?.message || err, err?.stack);
      return res.status(500).json({ message: "We're having trouble right now. Please try again in a moment." });
    }
  });

  app.post("/api/admin/bike-finder/clear-cache", requireAuth, async (_req, res) => {
    await storage.clearBikeCompatibilityCache();
    return res.json({ success: true });
  });

  app.get("/api/bike-data", (_req, res) => {
    return res.json(BIKE_DATA);
  });

  // Categories
  app.get("/api/categories", async (_req, res) => {
    const categories = await storage.listCategories();
    return res.json(categories);
  });

  app.get("/api/categories/:id", requireAuth, async (req, res) => {
    const category = await storage.getCategory(paramId(req));
    if (!category) return res.status(404).json({ message: "Category not found" });
    return res.json(category);
  });

  app.post("/api/categories", requireAuth, apiRateLimiter, async (req, res) => {
    const parsed = insertCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid category", errors: parsed.error.flatten() });
    }
    const sanitized = sanitizeCategoryInput(parsed.data);
    const category = await storage.createCategory({ ...parsed.data, ...sanitized });
    return res.status(201).json(category);
  });

  app.patch("/api/categories/:id", requireAuth, apiRateLimiter, async (req, res) => {
    const id = paramId(req);
    const existing = await storage.getCategory(id);
    if (!existing) return res.status(404).json({ message: "Category not found" });
    const patch = req.body as Partial<InsertCategory>;
    const sanitized = sanitizeCategoryInput(patch);
    const updated = await storage.updateCategory(id, { ...patch, ...sanitized });
    return res.json(updated);
  });

  app.delete("/api/categories/:id", requireAuth, apiRateLimiter, async (req, res) => {
    const deleted = await storage.deleteCategory(paramId(req));
    if (!deleted) return res.status(404).json({ message: "Category not found" });
    return res.status(204).send();
  });

  return httpServer;
}
