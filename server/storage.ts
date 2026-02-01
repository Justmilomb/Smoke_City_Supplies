import type {
  ApiOrder,
  ApiOrderItem,
  ApiProduct,
  Category,
  CreateOrderInput,
  InsertCategory,
  InsertProduct,
  InsertUser,
  User,
} from "@shared/schema";
import {
  categories as categoriesTable,
  createOrderSchema,
  images as imagesTable,
  orderItems,
  orders,
  pendingPayments as pendingPaymentsTable,
  products,
  users,
} from "@shared/schema";
import { desc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "./db";
import { seedProducts } from "./seed";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  listProducts(): Promise<ApiProduct[]>;
  getProduct(id: string): Promise<ApiProduct | undefined>;
  createProduct(input: InsertProduct): Promise<ApiProduct>;
  updateProduct(id: string, patch: Partial<ApiProduct>): Promise<ApiProduct | undefined>;
  deleteProduct(id: string): Promise<boolean>;
  updateProductQuantity(id: string, quantity: number): Promise<ApiProduct | undefined>;

  createOrder(input: CreateOrderInput): Promise<ApiOrder>;
  listOrders(): Promise<ApiOrder[]>;
  getOrder(id: string): Promise<ApiOrder | undefined>;
  getOrderByStripeSessionId(sessionId: string): Promise<ApiOrder | undefined>;
  getOrderByStripePaymentIntentId(paymentIntentId: string): Promise<ApiOrder | undefined>;
  updateOrderStatus(id: string, status: string): Promise<ApiOrder | undefined>;

  listCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(input: InsertCategory): Promise<Category>;
  updateCategory(id: string, patch: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;

  createImage(data: string, mimeType: string): Promise<string>;
  getImage(id: string): Promise<{ data: string; mimeType: string } | undefined>;
  deleteImage(id: string): Promise<boolean>;

  createPendingPayment(data: { paymentIntentId: string; items: { productId: string; productName: string; quantity: number; priceEach: number }[]; totalPence: number; customerEmail?: string; customerName?: string }): Promise<void>;
  getPendingPayment(paymentIntentId: string): Promise<{ items: { productId: string; productName: string; quantity: number; priceEach: number }[]; totalPence: number; customerEmail?: string; customerName?: string } | undefined>;
  deletePendingPayment(paymentIntentId: string): Promise<boolean>;
}

function rowToApiProduct(row: typeof products.$inferSelect): ApiProduct {
  return {
    id: row.id,
    name: row.name,
    partNumber: row.partNumber ?? undefined,
    vehicle: row.vehicle,
    category: row.category,
    subcategory: row.subcategory ?? undefined,
    brand: row.brand ?? undefined,
    price: row.price / 100,
    rating: row.rating / 10,
    reviewCount: row.reviewCount,
    stock: row.stock,
    quantity: row.quantity,
    deliveryEta: row.deliveryEta,
    compatibility: row.compatibility,
    tags: row.tags,
    image: row.image,
    description: row.description,
    specs: row.specs,
    features: row.features ?? undefined,
  };
}

function stockFromQuantity(quantity: number): "in-stock" | "low" | "out" {
  if (quantity <= 0) return "out";
  if (quantity <= 5) return "low";
  return "in-stock";
}

export class DbStorage implements IStorage {
  private getDb() {
    if (!db) throw new Error("Database not initialized");
    return db;
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this.getDb().select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await this.getDb().select().from(users).where(eq(users.username, username)).limit(1);
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const [user] = await this.getDb().insert(users).values({ ...insertUser, id }).returning();
    if (!user) throw new Error("Failed to create user");
    return user;
  }

  async listProducts(): Promise<ApiProduct[]> {
    const rows = await this.getDb().select().from(products);
    return rows.map(rowToApiProduct);
  }

  async getProduct(id: string): Promise<ApiProduct | undefined> {
    const [row] = await this.getDb().select().from(products).where(eq(products.id, id)).limit(1);
    return row ? rowToApiProduct(row) : undefined;
  }

  async createProduct(input: InsertProduct): Promise<ApiProduct> {
    const id = `p_${Date.now().toString(36)}`;
    const [row] = await this.getDb()
      .insert(products)
      .values({
        id,
        name: input.name,
        partNumber: input.partNumber ?? null,
        vehicle: input.vehicle,
        category: input.category,
        subcategory: input.subcategory ?? null,
        brand: input.brand ?? null,
        price: Math.round(input.price * 100),
        rating: Math.round(input.rating * 10),
        reviewCount: input.reviewCount,
        stock: input.stock,
        quantity: input.quantity ?? 0,
        deliveryEta: input.deliveryEta,
        compatibility: input.compatibility,
        tags: input.tags,
        image: input.image,
        description: input.description,
        specs: input.specs,
        features: input.features ?? null,
      })
      .returning();
    if (!row) throw new Error("Failed to create product");
    return rowToApiProduct(row);
  }

  async updateProduct(id: string, patch: Partial<ApiProduct>): Promise<ApiProduct | undefined> {
    const existing = await this.getProduct(id);
    if (!existing) return undefined;

    const dbPatch: Record<string, unknown> = { ...patch };
    if (patch.price !== undefined) dbPatch.price = Math.round(patch.price * 100);
    if (patch.rating !== undefined) dbPatch.rating = Math.round(patch.rating * 10);

    const [row] = await this.getDb().update(products).set(dbPatch).where(eq(products.id, id)).returning();
    return row ? rowToApiProduct(row) : undefined;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const existing = await this.getProduct(id);
    if (!existing) return false;
    await this.getDb().delete(products).where(eq(products.id, id));
    return true;
  }

  async updateProductQuantity(id: string, quantity: number): Promise<ApiProduct | undefined> {
    const stock = stockFromQuantity(quantity);
    const [row] = await this.getDb()
      .update(products)
      .set({ quantity, stock })
      .where(eq(products.id, id))
      .returning();
    return row ? rowToApiProduct(row) : undefined;
  }

  async createOrder(input: CreateOrderInput): Promise<ApiOrder> {
    const parsed = createOrderSchema.safeParse(input);
    if (!parsed.success) throw new Error("Invalid order");
    const { items, customerEmail, customerName, stripeSessionId, stripePaymentIntentId, paymentStatus } = parsed.data;

    const orderId = randomUUID();
    const now = new Date().toISOString();
    const totalPence = Math.round(
      items.reduce((sum, i) => sum + i.priceEach * i.quantity * 100, 0)
    );

    await this.getDb().insert(orders).values({
      id: orderId,
      createdAt: now,
      status: "pending",
      totalPence,
      customerEmail: customerEmail ?? null,
      customerName: customerName ?? null,
      stripeSessionId: stripeSessionId ?? null,
      stripePaymentIntentId: stripePaymentIntentId ?? null,
      paymentStatus: paymentStatus ?? "pending",
    });

    const orderItemsToInsert = items.map((i) => ({
      id: randomUUID(),
      orderId,
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      priceEach: Math.round(i.priceEach * 100),
    }));
    await this.getDb().insert(orderItems).values(orderItemsToInsert);

    for (const item of items) {
      const product = await this.getProduct(item.productId);
      if (product) {
        const newQty = Math.max(0, product.quantity - item.quantity);
        await this.updateProductQuantity(item.productId, newQty);
      }
    }

    const apiItems: ApiOrderItem[] = items.map((i) => ({
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      priceEach: i.priceEach,
    }));

    return {
      id: orderId,
      createdAt: now,
      status: "pending",
      totalPence,
      items: apiItems,
      customerEmail,
      customerName,
      stripeSessionId: stripeSessionId ?? undefined,
      stripePaymentIntentId: stripePaymentIntentId ?? undefined,
      paymentStatus: paymentStatus ?? "pending",
    };
  }

  async listOrders(): Promise<ApiOrder[]> {
    const orderRows = await this.getDb().select().from(orders).orderBy(desc(orders.createdAt));
    const result: ApiOrder[] = [];

    for (const order of orderRows) {
      const itemRows = await this.getDb()
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));
      const items: ApiOrderItem[] = itemRows.map((row) => ({
        productId: row.productId,
        productName: row.productName,
        quantity: row.quantity,
        priceEach: row.priceEach / 100,
      }));
      result.push({
        id: order.id,
        createdAt: order.createdAt,
        status: order.status,
        totalPence: order.totalPence,
        items,
        customerEmail: order.customerEmail ?? undefined,
        customerName: order.customerName ?? undefined,
        stripeSessionId: order.stripeSessionId ?? undefined,
        stripePaymentIntentId: order.stripePaymentIntentId ?? undefined,
        paymentStatus: order.paymentStatus ?? undefined,
      });
    }

    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return result;
  }

  async getOrder(id: string): Promise<ApiOrder | undefined> {
    const [order] = await this.getDb().select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) return undefined;

    const itemRows = await this.getDb().select().from(orderItems).where(eq(orderItems.orderId, id));
    const items: ApiOrderItem[] = itemRows.map((row) => ({
      productId: row.productId,
      productName: row.productName,
      quantity: row.quantity,
      priceEach: row.priceEach / 100,
    }));

    return {
      id: order.id,
      createdAt: order.createdAt,
      status: order.status,
      totalPence: order.totalPence,
      items,
      customerEmail: order.customerEmail ?? undefined,
      customerName: order.customerName ?? undefined,
      stripeSessionId: order.stripeSessionId ?? undefined,
      stripePaymentIntentId: order.stripePaymentIntentId ?? undefined,
      paymentStatus: order.paymentStatus ?? undefined,
    };
  }

  async getOrderByStripeSessionId(sessionId: string): Promise<ApiOrder | undefined> {
    const [order] = await this.getDb()
      .select()
      .from(orders)
      .where(eq(orders.stripeSessionId, sessionId))
      .limit(1);
    if (!order) return undefined;
    return this.getOrder(order.id);
  }

  async getOrderByStripePaymentIntentId(paymentIntentId: string): Promise<ApiOrder | undefined> {
    const [order] = await this.getDb()
      .select()
      .from(orders)
      .where(eq(orders.stripePaymentIntentId, paymentIntentId))
      .limit(1);
    if (!order) return undefined;
    return this.getOrder(order.id);
  }

  async createImage(data: string, mimeType: string): Promise<string> {
    const id = `img_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
    await this.getDb()
      .insert(imagesTable)
      .values({ id, data, mimeType });
    return id;
  }

  async getImage(id: string): Promise<{ data: string; mimeType: string } | undefined> {
    const [row] = await this.getDb()
      .select()
      .from(imagesTable)
      .where(eq(imagesTable.id, id))
      .limit(1);
    if (!row) return undefined;
    return { data: row.data, mimeType: row.mimeType };
  }

  async deleteImage(id: string): Promise<boolean> {
    const existing = await this.getImage(id);
    if (!existing) return false;
    await this.getDb().delete(imagesTable).where(eq(imagesTable.id, id));
    return true;
  }

  async createPendingPayment(data: { paymentIntentId: string; items: { productId: string; productName: string; quantity: number; priceEach: number }[]; totalPence: number; customerEmail?: string; customerName?: string }): Promise<void> {
    await this.getDb().insert(pendingPaymentsTable).values({
      paymentIntentId: data.paymentIntentId,
      items: data.items,
      totalPence: data.totalPence,
      customerEmail: data.customerEmail ?? null,
      customerName: data.customerName ?? null,
    });
  }

  async getPendingPayment(paymentIntentId: string): Promise<{ items: { productId: string; productName: string; quantity: number; priceEach: number }[]; totalPence: number; customerEmail?: string; customerName?: string } | undefined> {
    const [row] = await this.getDb()
      .select()
      .from(pendingPaymentsTable)
      .where(eq(pendingPaymentsTable.paymentIntentId, paymentIntentId))
      .limit(1);
    if (!row) return undefined;
    return {
      items: row.items,
      totalPence: row.totalPence,
      customerEmail: row.customerEmail ?? undefined,
      customerName: row.customerName ?? undefined,
    };
  }

  async deletePendingPayment(paymentIntentId: string): Promise<boolean> {
    const existing = await this.getPendingPayment(paymentIntentId);
    if (!existing) return false;
    await this.getDb().delete(pendingPaymentsTable).where(eq(pendingPaymentsTable.paymentIntentId, paymentIntentId));
    return true;
  }

  async updateOrderStatus(id: string, status: string): Promise<ApiOrder | undefined> {
    const [updated] = await this.getDb()
      .update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();
    if (!updated) return undefined;
    return this.getOrder(id);
  }

  async listCategories(): Promise<Category[]> {
    return this.getDb().select().from(categoriesTable).orderBy(categoriesTable.name);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [row] = await this.getDb()
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, id))
      .limit(1);
    return row;
  }

  async createCategory(input: InsertCategory): Promise<Category> {
    const [row] = await this.getDb().insert(categoriesTable).values(input).returning();
    if (!row) throw new Error("Failed to create category");
    return row;
  }

  async updateCategory(
    id: string,
    patch: Partial<InsertCategory>
  ): Promise<Category | undefined> {
    const [row] = await this.getDb()
      .update(categoriesTable)
      .set(patch)
      .where(eq(categoriesTable.id, id))
      .returning();
    return row;
  }

  async deleteCategory(id: string): Promise<boolean> {
    const [existing] = await this.getDb()
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, id))
      .limit(1);
    if (!existing) return false;
    await this.getDb().delete(categoriesTable).where(eq(categoriesTable.id, id));
    return true;
  }
}

// In-memory storage for local dev when DATABASE_URL is not set
export class MemStorage implements IStorage {
  private users = new Map<string, User>();
  private products = new Map<string, ApiProduct>();
  private orders = new Map<string, ApiOrder>();
  private categories = new Map<string, Category>();
  private images = new Map<string, { data: string; mimeType: string }>();
  private pendingPayments = new Map<string, { items: { productId: string; productName: string; quantity: number; priceEach: number }[]; totalPence: number; customerEmail?: string; customerName?: string }>();

  constructor() {
    seedProducts.forEach((p) => this.products.set(p.id, { ...p }));
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async listProducts(): Promise<ApiProduct[]> {
    return Array.from(this.products.values());
  }

  async getProduct(id: string): Promise<ApiProduct | undefined> {
    return this.products.get(id);
  }

  async createProduct(input: InsertProduct): Promise<ApiProduct> {
    const id = `p_${Date.now().toString(36)}`;
    const product: ApiProduct = {
      id,
      name: input.name,
      partNumber: input.partNumber,
      vehicle: input.vehicle,
      category: input.category,
      subcategory: input.subcategory,
      brand: input.brand,
      price: input.price,
      rating: input.rating,
      reviewCount: input.reviewCount,
      stock: input.stock,
      quantity: input.quantity ?? 0,
      deliveryEta: input.deliveryEta,
      compatibility: input.compatibility,
      tags: input.tags,
      image: input.image,
      description: input.description,
      specs: input.specs,
      features: input.features,
    };
    this.products.set(id, product);
    return product;
  }

  async updateProduct(id: string, patch: Partial<ApiProduct>): Promise<ApiProduct | undefined> {
    const existing = this.products.get(id);
    if (!existing) return undefined;
    const updated: ApiProduct = { ...existing, ...patch };
    this.products.set(id, updated);
    return updated;
  }

  async deleteProduct(id: string): Promise<boolean> {
    return this.products.delete(id);
  }

  async updateProductQuantity(id: string, quantity: number): Promise<ApiProduct | undefined> {
    const existing = this.products.get(id);
    if (!existing) return undefined;
    const stock = stockFromQuantity(quantity);
    const updated: ApiProduct = { ...existing, quantity, stock };
    this.products.set(id, updated);
    return updated;
  }

  async createOrder(input: CreateOrderInput): Promise<ApiOrder> {
    const parsed = createOrderSchema.safeParse(input);
    if (!parsed.success) throw new Error("Invalid order");
    const { items, customerEmail, customerName, stripeSessionId, stripePaymentIntentId, paymentStatus } = parsed.data;

    const orderId = randomUUID();
    const now = new Date().toISOString();
    const totalPence = Math.round(
      items.reduce((sum, i) => sum + i.priceEach * i.quantity * 100, 0)
    );
    const apiItems: ApiOrderItem[] = items.map((i) => ({
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      priceEach: i.priceEach,
    }));
    const order: ApiOrder = {
      id: orderId,
      createdAt: now,
      status: "pending",
      totalPence,
      items: apiItems,
      customerEmail,
      customerName,
      stripeSessionId: stripeSessionId ?? undefined,
      stripePaymentIntentId: stripePaymentIntentId ?? undefined,
      paymentStatus: paymentStatus ?? "pending",
    };

    for (const item of items) {
      const product = this.products.get(item.productId);
      if (product) {
        const newQty = Math.max(0, product.quantity - item.quantity);
        await this.updateProductQuantity(item.productId, newQty);
      }
    }
    this.orders.set(orderId, order);
    return order;
  }

  async listOrders(): Promise<ApiOrder[]> {
    return Array.from(this.orders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getOrder(id: string): Promise<ApiOrder | undefined> {
    return this.orders.get(id);
  }

  async getOrderByStripeSessionId(sessionId: string): Promise<ApiOrder | undefined> {
    return Array.from(this.orders.values()).find((o) => o.stripeSessionId === sessionId);
  }

  async getOrderByStripePaymentIntentId(paymentIntentId: string): Promise<ApiOrder | undefined> {
    return Array.from(this.orders.values()).find((o) => o.stripePaymentIntentId === paymentIntentId);
  }

  async updateOrderStatus(id: string, status: string): Promise<ApiOrder | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    const updated = { ...order, status };
    this.orders.set(id, updated);
    return updated;
  }

  async listCategories(): Promise<Category[]> {
    return Array.from(this.categories.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getCategory(id: string): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async createCategory(input: InsertCategory): Promise<Category> {
    const id = randomUUID();
    const category: Category = {
      id,
      name: input.name,
      slug: input.slug,
      icon: input.icon ?? null,
      vehicleType: input.vehicleType,
      createdAt: new Date(),
    };
    this.categories.set(id, category);
    return category;
  }

  async updateCategory(
    id: string,
    patch: Partial<InsertCategory>
  ): Promise<Category | undefined> {
    const existing = this.categories.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    this.categories.set(id, updated);
    return updated as Category;
  }

  async deleteCategory(id: string): Promise<boolean> {
    return this.categories.delete(id);
  }

  async createImage(data: string, mimeType: string): Promise<string> {
    const id = `img_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
    this.images.set(id, { data, mimeType });
    return id;
  }

  async getImage(id: string): Promise<{ data: string; mimeType: string } | undefined> {
    return this.images.get(id);
  }

  async deleteImage(id: string): Promise<boolean> {
    return this.images.delete(id);
  }

  async createPendingPayment(data: { paymentIntentId: string; items: { productId: string; productName: string; quantity: number; priceEach: number }[]; totalPence: number; customerEmail?: string; customerName?: string }): Promise<void> {
    this.pendingPayments.set(data.paymentIntentId, {
      items: data.items,
      totalPence: data.totalPence,
      customerEmail: data.customerEmail,
      customerName: data.customerName,
    });
  }

  async getPendingPayment(paymentIntentId: string): Promise<{ items: { productId: string; productName: string; quantity: number; priceEach: number }[]; totalPence: number; customerEmail?: string; customerName?: string } | undefined> {
    return this.pendingPayments.get(paymentIntentId);
  }

  async deletePendingPayment(paymentIntentId: string): Promise<boolean> {
    return this.pendingPayments.delete(paymentIntentId);
  }
}

export const storage = db ? new DbStorage() : new MemStorage();
