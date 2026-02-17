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
import OpenAI from "openai";
import {
  buildGoogleMerchantFeedXml,
  getGoogleMerchantFeedFileUrlPath,
  startGoogleMerchantFeedScheduler,
  writeGoogleMerchantFeedFile,
} from "./googleMerchantFeed";
import { createInvoiceNumber, renderInvoiceHtml, renderInvoicePdfBuffer } from "./invoice";
import { sendAdminOrderAlertEmail, sendContactFormEmail, sendInvoiceEmail, sendOrderConfirmationEmail, sendOrderShippedEmail } from "./email";
import { createRoyalMailManualLabel, getRoyalMailManualStatus, quoteRoyalMailFlatRates } from "./shipping/royalMailManual";
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
    const base = `${req.protocol}://${req.get("host") ?? "localhost"}`;
    const txt = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/*
Disallow: /cart
Disallow: /api/*

Sitemap: ${base}/sitemap.xml
`;
    res.type("text/plain").send(txt);
  });

  app.get("/sitemap.xml", async (req, res) => {
    const base = `${req.protocol}://${req.get("host") ?? "localhost"}`;
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

    res.type("application/xml").send(xml);
  });

  async function sendGoogleMerchantFeed(req: Request, res: Response) {
    const base = `${req.protocol}://${req.get("host") ?? "localhost"}`;
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

  app.post("/api/admin/test/shipping", requireAuth, apiRateLimiter, async (req, res) => {
    const schema = z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      addressLine1: z.string().min(1).optional(),
      addressLine2: z.string().optional(),
      city: z.string().min(1).optional(),
      county: z.string().optional(),
      postcode: z.string().min(1).optional(),
      country: z.string().default("GB").optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid shipping test payload", errors: parsed.error.flatten().fieldErrors });
    }

    const testInput = {
      name: parsed.data.name || "Smoke City Supplies Test Recipient",
      email: parsed.data.email || process.env.INVOICE_FROM_EMAIL || "support@smokecitysupplies.com",
      addressLine1: parsed.data.addressLine1 || process.env.SHIP_FROM_ADDRESS_LINE1 || "1 Test Street",
      addressLine2: parsed.data.addressLine2 || "",
      city: parsed.data.city || process.env.SHIP_FROM_CITY || "Manchester",
      county: parsed.data.county || "",
      postcode: parsed.data.postcode || process.env.SHIP_FROM_POSTCODE || "M1 1AA",
      country: parsed.data.country || process.env.SHIP_FROM_COUNTRY || "GB",
    };

    const parcels = [{ lengthCm: 20, widthCm: 15, heightCm: 10, weightGrams: 1000 }];
    const status = getRoyalMailManualStatus();
    if (!status.configured) {
      return res.status(400).json({ message: "Royal Mail manual shipping is not configured", status });
    }
    let rates;
    try {
      rates = quoteRoyalMailFlatRates({
        ...testInput,
        parcels,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Shipping test failed";
      return res.status(400).json({ message, status });
    }
    if (!rates.length) {
      return res.status(400).json({ message: "No Royal Mail rates available for test payload", status });
    }
    const chosen = rates[0];
    const label = createRoyalMailManualLabel({
      ...testInput,
      parcels,
      selectedRateId: chosen.rateId,
      selectedServiceCode: chosen.serviceCode,
      selectedServiceName: chosen.serviceName,
    });
    return res.json({ ok: true, status, rates, chosenRate: chosen, label });
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
    const host = req.get("host") ?? "localhost";
    const base = `${req.protocol}://${host}`;
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
    };

    const product = await storage.createProduct(data);
    writeGoogleMerchantFeedFile("create-product").catch(() => {});
    pingIndexNow(req, [`/product/${product.id}`, "/store", "/sitemap.xml"]);
    return res.status(201).json(product);
  });

  app.patch("/api/products/:id", requireAuth, apiRateLimiter, async (req, res) => {
    const id = paramId(req);
    const existing = await storage.getProduct(id);
    if (!existing) return res.status(404).json({ message: "Product not found" });
    const patch = req.body as Partial<ApiProduct>;
    const sanitized = sanitizeProductInput(patch);
    const updated = await storage.updateProduct(id, { ...patch, ...sanitized });
    writeGoogleMerchantFeedFile("update-product").catch(() => {});
    pingIndexNow(req, [`/product/${id}`]);
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
    return res.json(updated);
  });

  app.delete("/api/products/:id", requireAuth, apiRateLimiter, async (req, res) => {
    const deleted = await storage.deleteProduct(paramId(req));
    if (!deleted) return res.status(404).json({ message: "Product not found" });
    writeGoogleMerchantFeedFile("delete-product").catch(() => {});
    return res.status(204).send();
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

  // SEO generation via NVIDIA API
  app.post("/api/generate-seo", requireAuth, apiRateLimiter, async (req, res) => {
    const { productInfo } = req.body as { productInfo?: string };
    if (!productInfo || typeof productInfo !== "string" || productInfo.trim().length < 3) {
      return res.status(400).json({ message: "Please describe the product" });
    }

    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "NVIDIA API key not configured" });
    }

    const model = process.env.NVIDIA_SEO_MODEL || "deepseek-ai/deepseek-v3.1";

    try {
      const client = new OpenAI({ baseURL: "https://integrate.api.nvidia.com/v1", apiKey });

      const completion = await client.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: `You are an SEO expert for Smoke City Supplies, a UK-based motorcycle, bike, and scooter parts shop. Generate SEO metadata for products. Respond ONLY with valid JSON in this exact format, nothing else:
{"metaTitle":"...","metaDescription":"...","metaKeywords":"..."}

Rules:
- metaTitle: max 60 characters, include product name and "Smoke City Supplies"
- metaDescription: max 160 characters, compelling description with key features and UK delivery mention
- metaKeywords: comma-separated relevant search terms (8-12 keywords)`,
          },
          { role: "user", content: `Generate SEO metadata for this product: ${productInfo.trim().slice(0, 500)}` },
        ],
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 1024,
      });

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

  // Stripe config endpoint
  app.get("/api/stripe/config", (_req, res) => {
    return res.json({ publishableKey: STRIPE_PUBLISHABLE_KEY });
  });

  app.post("/api/shipping/rates", orderRateLimiter, async (req, res) => {
    const parsed = shippingRatesQuoteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid shipping quote payload", errors: parsed.error.flatten().fieldErrors });
    }

    const productMap = await getProductMap();
    const parcels = buildParcelsForItems(productMap, parsed.data.items);
    const dispatchInfo = dispatchAdviceNow();

    let rates;
    try {
      rates = quoteRoyalMailFlatRates({
        name: parsed.data.customerName || undefined,
        email: parsed.data.customerEmail,
        addressLine1: parsed.data.addressLine1 || undefined,
        addressLine2: parsed.data.addressLine2,
        city: parsed.data.city || undefined,
        county: parsed.data.county,
        postcode: parsed.data.postcode || undefined,
        country: parsed.data.country || "GB",
        parcels,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to quote shipping";
      return res.status(400).json({ message });
    }

    if (!rates.length) {
      return res.status(400).json({ message: "No shipping options available." });
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

    let liveRates;
    try {
      liveRates = quoteRoyalMailFlatRates({
        name: parsed.data.customerName,
        email: parsed.data.customerEmail,
        addressLine1: parsed.data.addressLine1,
        addressLine2: parsed.data.addressLine2,
        city: parsed.data.city,
        county: parsed.data.county,
        postcode: parsed.data.postcode,
        country: parsed.data.country || "GB",
        parcels,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to quote shipping";
      return res.status(400).json({ message });
    }

    if (!liveRates.length) {
      return res.status(400).json({ message: "No shipping options available for this address." });
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
        customerName: parsed.data.customerName,
      },
    });

    const order = await storage.createOrder({
      ...parsed.data,
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
                totalPence: withInvoice.totalPence,
                shippingServiceLevel: withInvoice.shippingServiceLevel,
                dispatchAdvice: withInvoice.dispatchAdvice,
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
    const updated = await storage.updateOrderStatus(id, parsed.data.status);
    if (!updated) return res.status(404).json({ message: "Order not found" });
    if (parsed.data.status === "shipped" && updated.customerEmail && !updated.customerShippedEmailSentAt) {
      try {
        await sendOrderShippedEmail({
          to: updated.customerEmail,
          orderId: updated.id,
          trackingNumber: updated.trackingNumber,
          shippingLabelUrl: updated.shippingLabelUrl,
        });
        await storage.recordOrderEmailEvents(updated.id, { customerShippedEmailSentAt: new Date().toISOString() });
      } catch (err) {
        console.error("[order shipped email] failed:", err);
      }
    }
    return res.json(updated);
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

  app.post("/api/admin/orders/:id/shipping-label", requireAuth, apiRateLimiter, async (req, res) => {
    const orderId = paramId(req);
    const order = await storage.getOrder(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.paymentStatus !== "paid") {
      return res.status(400).json({ message: "Shipping labels can only be generated for paid orders" });
    }

    if (order.status !== "processing") {
      return res.status(400).json({ message: "Order status must be processing before creating a label" });
    }

    const labelPayloadSchema = z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      addressLine1: z.string().min(1).optional(),
      addressLine2: z.string().optional(),
      city: z.string().min(1).optional(),
      county: z.string().optional(),
      postcode: z.string().min(1).optional(),
      country: z.string().min(2).max(2).optional(),
      selectedRateId: z.string().min(1).optional(),
      selectedServiceCode: z.string().min(1).optional(),
    });
    const parsedPayload = labelPayloadSchema.safeParse(req.body ?? {});
    if (!parsedPayload.success) {
      return res.status(400).json({
        message: "Invalid shipping label details",
        errors: parsedPayload.error.flatten().fieldErrors,
      });
    }

    const shippingInput = {
      name: parsedPayload.data.name || order.customerName || "",
      email: parsedPayload.data.email || order.customerEmail,
      addressLine1: parsedPayload.data.addressLine1 || order.addressLine1 || "",
      addressLine2: parsedPayload.data.addressLine2 || order.addressLine2,
      city: parsedPayload.data.city || order.city || "",
      county: parsedPayload.data.county || order.county,
      postcode: parsedPayload.data.postcode || order.postcode || "",
      country: (parsedPayload.data.country || order.country || "GB").toUpperCase(),
      selectedRateId: parsedPayload.data.selectedRateId || order.shippingRateId || "",
      selectedServiceCode:
        parsedPayload.data.selectedServiceCode || order.shippingRateId || order.shippingServiceLevel || "",
    };

    const missingFields = [
      !shippingInput.name ? "name" : "",
      !shippingInput.addressLine1 ? "addressLine1" : "",
      !shippingInput.city ? "city" : "",
      !shippingInput.postcode ? "postcode" : "",
      !shippingInput.country ? "country" : "",
      !shippingInput.selectedRateId ? "selectedRateId" : "",
    ].filter(Boolean);
    if (missingFields.length) {
      return res.status(400).json({
        message: "Missing required shipping details before preparing Royal Mail label",
        missingFields,
      });
    }

    const productMap = await getProductMap();
    const parcels = buildParcelsForItems(productMap, order.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      priceEach: item.priceEach,
    })));

    let label;
    try {
      label = createRoyalMailManualLabel({
        name: shippingInput.name,
        email: shippingInput.email,
        addressLine1: shippingInput.addressLine1,
        addressLine2: shippingInput.addressLine2,
        city: shippingInput.city,
        county: shippingInput.county,
        postcode: shippingInput.postcode,
        country: shippingInput.country,
        parcels,
        selectedRateId: shippingInput.selectedRateId,
        selectedServiceCode: shippingInput.selectedServiceCode,
        selectedServiceName: order.shippingServiceLevel || undefined,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Shipping label generation failed";
      return res.status(400).json({ message });
    }

    const shippingLabelUrl = label.labelUrl || "";
    const shippingLabelFileId: string | undefined = undefined;

    if (!shippingLabelUrl) {
      return res.status(500).json({ message: "Shipping provider did not return a usable label" });
    }

    const updated = await storage.recordShippingLabel(order.id, {
      shippingLabelProvider: label.provider,
      shippingLabelId: label.labelId,
      shippingLabelUrl,
      shippingLabelFileId,
      trackingNumber: label.trackingNumber,
      labelCreatedAt: new Date().toISOString(),
    });

    return res.json({
      ok: true,
      order: updated,
      shippingLabelUrl,
      trackingNumber: label.trackingNumber,
      manualRoyalMailUrl: label.labelUrl,
      selectedService: label.serviceName,
      shippingAddress: orderToAddressText(order),
    });
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
