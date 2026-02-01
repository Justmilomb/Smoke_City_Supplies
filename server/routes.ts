import type { Express } from "express";
import { type Server } from "http";
import {
  createOrderSchema,
  createOrderWithPaymentIntentSchema,
  createOrderWithSessionSchema,
  insertCategorySchema,
  insertProductSchema,
  type ApiProduct,
  type CreateOrderInput,
  type InsertCategory,
  type InsertProduct,
} from "@shared/schema";

const updateProductSchema = insertProductSchema.partial();

const createPaymentIntentSchema = createOrderSchema.pick({
  items: true,
  customerEmail: true,
  customerName: true,
});
import multer from "multer";
import { storage } from "./storage";
import { stripe } from "./stripe";
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await seedAdminIfNeeded();
  await seedCategoriesIfNeeded();
  await runSeedParts();

  // Health check (for Render monitoring)
  app.get("/health", (_req, res) => {
    return res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  function escapeXml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }

  // Sitemap (SEO)
  app.get("/sitemap.xml", async (req, res) => {
    const base = `${req.protocol}://${req.get("host") ?? "localhost"}`;
    const products = await storage.listProducts();
    const urls = [
      { loc: `${base}/`, changefreq: "weekly" as const, priority: "1.0" },
      { loc: `${base}/store`, changefreq: "daily" as const, priority: "0.9" },
      { loc: `${base}/contact`, changefreq: "monthly" as const, priority: "0.5" },
      { loc: `${base}/shipping`, changefreq: "monthly" as const, priority: "0.5" },
      { loc: `${base}/returns`, changefreq: "monthly" as const, priority: "0.5" },
      ...products.map((p) => ({ loc: `${base}/product/${p.id}`, changefreq: "weekly" as const, priority: "0.8" })),
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${escapeXml(u.loc)}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join("\n")}
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

  // Image upload (camera or file) – admin only; stored in DB as base64 for persistence on Render
  app.post("/api/upload", requireAuth, apiRateLimiter, (req, res, next) => {
    uploadMiddleware.single("image")(req, res, (err: unknown) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ message: "File too large (max 10MB)" });
          }
          return res.status(400).json({ message: err.message });
        }
        return res.status(400).json({ message: err instanceof Error ? err.message : "Upload failed" });
      }
      next();
    });
  }, async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }
    const { buffer, mimetype } = req.file;
    const base64 = buffer.toString("base64");
    const data = `data:${mimetype};base64,${base64}`;
    const id = await storage.createImage(data, mimetype);
    return res.status(201).json({ url: `/api/images/${id}` });
  });

  function paramId(req: { params: { id?: string | string[] } }): string {
    const p = req.params.id;
    return Array.isArray(p) ? (p[0] ?? "") : (p ?? "");
  }

  // Image serving (from DB) and deletion
  app.get("/api/images/:id", async (req, res) => {
    const image = await storage.getImage(paramId(req));
    if (!image) return res.status(404).send("Not found");
    const base64Data = image.data.includes(",") ? image.data.split(",")[1] : image.data;
    const buffer = Buffer.from(base64Data ?? "", "base64");
    res.type(image.mimeType).send(buffer);
  });

  app.delete("/api/images/:id", requireAuth, apiRateLimiter, async (req, res) => {
    const deleted = await storage.deleteImage(paramId(req));
    if (!deleted) return res.status(404).json({ message: "Image not found" });
    return res.status(204).send();
  });

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
    return res.status(201).json(product);
  });

  app.patch("/api/products/:id", requireAuth, apiRateLimiter, async (req, res) => {
    const id = paramId(req);
    const existing = await storage.getProduct(id);
    if (!existing) return res.status(404).json({ message: "Product not found" });
    const parsed = updateProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid product data", errors: parsed.error.flatten() });
    }
    const sanitized = sanitizeProductInput(parsed.data);
    const updated = await storage.updateProduct(id, { ...parsed.data, ...sanitized });
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

  // Create PaymentIntent for on-site checkout (Stripe API, your design)
  app.post("/api/create-payment-intent", orderRateLimiter, async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ message: "Stripe is not configured" });
    }
    const parsed = createPaymentIntentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid checkout data", errors: parsed.error.flatten() });
    }
    const { items, customerEmail, customerName } = parsed.data;
    if (!items.length) {
      return res.status(400).json({ message: "Cart is empty" });
    }
    const totalPence = Math.round(
      items.reduce((sum, i) => sum + i.priceEach * i.quantity * 100, 0)
    );
    if (totalPence < 50) {
      return res.status(400).json({ message: "Minimum order is £0.50" });
    }
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalPence,
        currency: "gbp",
        automatic_payment_methods: { enabled: true },
        metadata: {
          itemCount: String(items.length),
        },
      });
      await storage.createPendingPayment({
        paymentIntentId: paymentIntent.id,
        items,
        totalPence,
        customerEmail: customerEmail ?? undefined,
        customerName: customerName ?? undefined,
      });
      return res.status(201).json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (err) {
      console.error("[create-payment-intent]", err);
      return res.status(500).json({ message: "Could not create payment" });
    }
  });

  // Orders (create with items, or with paymentIntentId/sessionId after payment)
  app.post("/api/orders", orderRateLimiter, async (req, res) => {
    const withPaymentIntent = createOrderWithPaymentIntentSchema.safeParse(req.body);
    if (withPaymentIntent.success) {
      const { paymentIntentId } = withPaymentIntent.data;
      if (!stripe) {
        return res.status(503).json({ message: "Stripe is not configured" });
      }
      try {
        const existing = await storage.getOrderByStripePaymentIntentId(paymentIntentId);
        if (existing) {
          return res.status(201).json(existing);
        }
        const pending = await storage.getPendingPayment(paymentIntentId);
        if (!pending) {
          return res.status(400).json({ message: "Invalid or expired payment" });
        }
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (pi.status !== "succeeded") {
          return res.status(400).json({ message: "Payment not completed" });
        }
        const input: CreateOrderInput = {
          items: pending.items,
          customerEmail: pending.customerEmail,
          customerName: pending.customerName,
          stripePaymentIntentId: paymentIntentId,
          paymentStatus: "paid",
        };
        const order = await storage.createOrder(input);
        await storage.deletePendingPayment(paymentIntentId);
        return res.status(201).json(order);
      } catch (err) {
        console.error("[orders from payment intent]", err);
        return res.status(400).json({ message: "Invalid or already used payment" });
      }
    }

    const withSession = createOrderWithSessionSchema.safeParse(req.body);
    if (withSession.success) {
      const { sessionId } = withSession.data;
      if (!stripe) {
        return res.status(503).json({ message: "Stripe is not configured" });
      }
      try {
        const existing = await storage.getOrderByStripeSessionId(sessionId);
        if (existing) {
          return res.status(201).json(existing);
        }
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ["line_items", "line_items.data.price.product"],
        });
        if (session.payment_status !== "paid") {
          return res.status(400).json({ message: "Payment not completed" });
        }
        const lineItems = session.line_items?.data ?? [];
        const items = lineItems
          .filter((li) => li.price && li.quantity != null)
          .map((li) => {
            const product = li.price?.product;
            const meta = product && typeof product === "object" && "metadata" in product
              ? (product as { metadata?: { productId?: string } }).metadata
              : undefined;
            const productId = meta?.productId ?? (typeof product === "string" ? product : "") ?? "";
            return {
              productId,
              productName: li.description ?? "Item",
              quantity: li.quantity ?? 1,
              priceEach: (li.price?.unit_amount ?? 0) / 100,
            };
          })
          .filter((i) => i.productId.length > 0);
        if (items.length === 0) {
          return res.status(400).json({ message: "No line items in session" });
        }
        const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
        const input: CreateOrderInput = {
          items,
          customerEmail: session.customer_email ?? session.customer_details?.email ?? undefined,
          customerName: session.customer_details?.name ?? undefined,
          stripeSessionId: session.id,
          stripePaymentIntentId: paymentIntentId ?? undefined,
          paymentStatus: "paid",
        };
        const order = await storage.createOrder(input);
        return res.status(201).json(order);
      } catch (err) {
        console.error("[orders from session]", err);
        return res.status(400).json({ message: "Invalid or already used session" });
      }
    }

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
