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

  // Health check (for Render monitoring)
  app.get("/health", (_req, res) => {
    return res.json({ status: "ok", timestamp: new Date().toISOString() });
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

  // Image upload (camera or file) – admin only
  app.post("/api/upload", requireAuth, apiRateLimiter, uploadMiddleware.single("image"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }
    const url = `/uploads/${req.file.filename}`;
    return res.status(201).json({ url });
  });

  // Products
  app.get("/api/products", async (_req, res) => {
    const products = await storage.listProducts();
    return res.json(products);
  });

  app.get("/api/products/:id", async (req, res) => {
    const product = await storage.getProduct(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    return res.json(product);
  });

  app.post("/api/products", requireAuth, apiRateLimiter, async (req, res) => {
    const parsed = insertProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid product", errors: parsed.error.flatten() });
    }
    // Sanitize text inputs
    const sanitized = sanitizeProductInput(parsed.data);
    const product = await storage.createProduct({ ...parsed.data, ...sanitized });
    return res.status(201).json(product);
  });

  app.patch("/api/products/:id", requireAuth, apiRateLimiter, async (req, res) => {
    const existing = await storage.getProduct(req.params.id);
    if (!existing) return res.status(404).json({ message: "Product not found" });
    const patch = req.body as Partial<ApiProduct>;
    // Sanitize text inputs in patch
    const sanitized = sanitizeProductInput(patch);
    const updated = await storage.updateProduct(req.params.id, { ...patch, ...sanitized });
    return res.json(updated);
  });

  app.patch("/api/products/:id/quantity", requireAuth, apiRateLimiter, async (req, res) => {
    const { quantity } = req.body as { quantity?: number };
    if (typeof quantity !== "number" || quantity < 0) {
      return res.status(400).json({ message: "Invalid quantity" });
    }
    const updated = await storage.updateProductQuantity(req.params.id, quantity);
    if (!updated) return res.status(404).json({ message: "Product not found" });
    return res.json(updated);
  });

  app.delete("/api/products/:id", requireAuth, apiRateLimiter, async (req, res) => {
    const deleted = await storage.deleteProduct(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Product not found" });
    return res.status(204).send();
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
    const order = await storage.getOrder(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    return res.json(order);
  });

  app.patch("/api/orders/:id", requireAuth, apiRateLimiter, async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
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
    const category = await storage.getCategory(req.params.id);
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
    const existing = await storage.getCategory(req.params.id);
    if (!existing) return res.status(404).json({ message: "Category not found" });
    const patch = req.body as Partial<InsertCategory>;
    // Sanitize inputs
    const sanitized = sanitizeCategoryInput(patch);
    const updated = await storage.updateCategory(req.params.id, { ...patch, ...sanitized });
    return res.json(updated);
  });

  app.delete("/api/categories/:id", requireAuth, apiRateLimiter, async (req, res) => {
    const deleted = await storage.deleteCategory(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Category not found" });
    return res.status(204).send();
  });

  return httpServer;
}
