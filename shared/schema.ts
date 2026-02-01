import { sql } from "drizzle-orm";
import { integer, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Categories for dynamic management
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon"),
  vehicleType: varchar("vehicle_type", { length: 20 }).notNull(), // "bike" | "scooter" | "all"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  icon: z.string().optional(),
  vehicleType: z.enum(["bike", "scooter", "all"]),
});
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Product (parts) for catalog and admin
export const productSpecSchema = z.object({ label: z.string(), value: z.string() });
export type ProductSpec = z.infer<typeof productSpecSchema>;

export const products = pgTable("products", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  partNumber: text("part_number"),
  vehicle: varchar("vehicle", { length: 40 }).notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  brand: text("brand"),
  price: integer("price").notNull(), // store as pence (GBP)
  rating: integer("rating").notNull(), // e.g. 47 for 4.7
  reviewCount: integer("review_count").notNull(),
  stock: varchar("stock", { length: 20 }).notNull(),
  quantity: integer("quantity").notNull().default(0),
  deliveryEta: text("delivery_eta").notNull(),
  compatibility: jsonb("compatibility").$type<string[]>().notNull(),
  tags: jsonb("tags").$type<string[]>().notNull(),
  image: text("image").notNull(),
  description: text("description").notNull(),
  specs: jsonb("specs").$type<ProductSpec[]>().notNull(),
  features: jsonb("features").$type<string[]>(),
});

export const insertProductSchema = z.object({
  name: z.string().min(1),
  partNumber: z.string().optional(),
  vehicle: z.string().min(1),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  brand: z.string().optional(),
  price: z.number().positive(),
  rating: z.number(),
  reviewCount: z.number(),
  stock: z.enum(["in-stock", "low", "out"]),
  quantity: z.number().int().min(0),
  deliveryEta: z.string(),
  compatibility: z.array(z.string()),
  tags: z.array(z.string()),
  image: z.string(),
  description: z.string(),
  specs: z.array(productSpecSchema),
  features: z.array(z.string()).optional(),
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// Orders for customer checkout
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey(),
  orderId: varchar("order_id").notNull(),
  productId: varchar("product_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  priceEach: integer("price_each").notNull(),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey(),
  createdAt: text("created_at").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  totalPence: integer("total_pence").notNull(),
  customerEmail: text("customer_email"),
  customerName: text("customer_name"),
  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("pending"), // "pending" | "paid" | "failed"
});

export const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    quantity: z.number().int().min(1),
    priceEach: z.number().positive(),
  })),
  customerEmail: z.string().email().optional(),
  customerName: z.string().optional(),
  stripeSessionId: z.string().optional(),
  stripePaymentIntentId: z.string().optional(),
  paymentStatus: z.enum(["pending", "paid", "failed"]).optional(),
});
export const createOrderWithSessionSchema = z.object({
  sessionId: z.string().min(1),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreateOrderWithSessionInput = z.infer<typeof createOrderWithSessionSchema>;

// API shape for product (matches client Part + quantity)
export type ApiProduct = {
  id: string;
  name: string;
  partNumber?: string;
  vehicle: string;
  category: string;
  subcategory?: string;
  brand?: string;
  price: number;
  rating: number;
  reviewCount: number;
  stock: string;
  quantity: number;
  deliveryEta: string;
  compatibility: string[];
  tags: string[];
  image: string;
  description: string;
  specs: ProductSpec[];
  features?: string[];
};

export type ApiOrderItem = {
  productId: string;
  productName: string;
  quantity: number;
  priceEach: number;
};

export type ApiOrder = {
  id: string;
  createdAt: string;
  status: string;
  totalPence: number;
  items: ApiOrderItem[];
  customerEmail?: string;
  customerName?: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  paymentStatus?: string;
};
