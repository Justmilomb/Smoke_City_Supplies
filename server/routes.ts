import type { Express } from "express";
import { type Server } from "http";
import {
  createOrderSchema,
  insertCategorySchema,
  insertProductSchema,
  type ApiProduct,
  type CreateOrderInput,
  type InsertCategory,
  type InsertProduct,
} from "@shared/schema";
import { storage } from "./storage";
import { uploadMiddleware } from "./upload";
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
  getGoogleMerchantStatus,
  runGoogleMerchantSync,
  startGoogleMerchantSyncScheduler,
} from "./googleMerchant";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await seedAdminIfNeeded();
  await seedCategoriesIfNeeded();
  const shouldSeedPartsOnStartup =
    process.env.SEED_PARTS_ON_STARTUP === "true" || process.env.NODE_ENV !== "production";
  if (shouldSeedPartsOnStartup) {
    await runSeedParts();
  }

  startGoogleMerchantSyncScheduler();

  // Health check (for Render monitoring)
  app.get("/health", (_req, res) => {
    return res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  function escapeXml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }

  // Dynamic robots.txt (overrides static file — uses correct absolute sitemap URL)
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

  // Sitemap (SEO — Google + Bing compatible)
  app.get("/sitemap.xml", async (req, res) => {
    const base = `${req.protocol}://${req.get("host") ?? "localhost"}`;
    const now = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
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
${urls.map((u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;
    res.type("application/xml").send(xml);
  });

  // Auth (public)
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

  // Google Merchant API integration (admin only)
  app.get("/api/integrations/google-merchant/status", requireAuth, (_req, res) => {
    return res.json(getGoogleMerchantStatus());
  });

  app.post("/api/integrations/google-merchant/sync", requireAuth, apiRateLimiter, async (_req, res) => {
    const result = await runGoogleMerchantSync("manual");
    return res.status(result.ok ? 200 : 500).json(result);
  });

  // Contact form (public) - with rate limiting and validation
  app.post("/api/contact", contactRateLimiter, (req, res) => {
    const parsed = contactFormSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid form data",
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const { name, email, subject, message } = parsed.data;
    console.log("[contact]", { name, email, subject: subject ?? "(no subject)", message });
    return res.status(201).json({ ok: true, message: "Thanks for reaching out. We'll get back to you soon." });
  });

  // Image upload (camera or file) – admin only
  app.post("/api/upload", requireAuth, apiRateLimiter, uploadMiddleware.single("image"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }
    const url = `/uploads/${req.file.filename}`;
    return res.status(201).json({ url });
  });

  // IndexNow — notify search engines (Bing, Yandex, etc.) of URL changes
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

  function paramId(req: { params: { id?: string | string[] } }): string {
    const p = req.params.id;
    return Array.isArray(p) ? (p[0] ?? "") : (p ?? "");
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
    return res.json(updated);
  });

  app.delete("/api/products/:id", requireAuth, apiRateLimiter, async (req, res) => {
    const deleted = await storage.deleteProduct(paramId(req));
    if (!deleted) return res.status(404).json({ message: "Product not found" });
    return res.status(204).send();
  });

  // SEO generation via NVIDIA API (admin only)
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
      const client = new OpenAI({
        baseURL: "https://integrate.api.nvidia.com/v1",
        apiKey,
      });

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
          {
            role: "user",
            content: `Generate SEO metadata for this product: ${productInfo.trim().slice(0, 500)}`,
          },
        ],
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 1024,
      });

      const content = completion.choices?.[0]?.message?.content?.trim();
      if (!content) {
        return res.status(500).json({ message: "No response from AI model" });
      }

      // Extract JSON from the response (handle possible markdown wrapping)
      let jsonStr = content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      const seo = JSON.parse(jsonStr) as {
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

  // Stripe config endpoint (public)
  app.get("/api/stripe/config", (_req, res) => {
    return res.json({ publishableKey: STRIPE_PUBLISHABLE_KEY });
  });

  // Create payment intent for checkout
  app.post("/api/stripe/create-payment-intent", orderRateLimiter, async (req, res) => {
    try {
      const { amount, customerEmail, customerName } = req.body;

      if (!amount || typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      // Create payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to pence
        currency: "gbp",
        automatic_payment_methods: { enabled: true },
        metadata: {
          customerEmail: customerEmail || "",
          customerName: customerName || "",
        },
      });

      return res.json({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
      console.error("Stripe payment intent error:", err);
      return res.status(500).json({ message: "Payment initialization failed" });
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
    return res.json(updated);
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
      return res
        .status(400)
        .json({ message: "Invalid category", errors: parsed.error.flatten() });
    }
    // Sanitize inputs
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
