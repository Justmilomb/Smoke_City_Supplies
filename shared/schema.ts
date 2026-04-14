import { sql } from "drizzle-orm";
import { integer, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Keep connect-pg-simple session table in Drizzle schema so db:push
// does not attempt to drop it as an unmanaged table.
export const session = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
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
  vehicleType: varchar("vehicle_type", { length: 20 }).notNull(), // "motorcycle" | "scooter" | "all"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  icon: z.string().optional(),
  vehicleType: z.enum(["motorcycle", "scooter", "all"]),
});
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Product (parts) for catalog and admin
export const productSpecSchema = z.object({ label: z.string(), value: z.string() });
export type ProductSpec = z.infer<typeof productSpecSchema>;

export const storedFiles = pgTable("stored_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  kind: varchar("kind", { length: 40 }).notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  content: text("content").notNull(),
  checksum: text("checksum"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
  images: jsonb("images").$type<string[]>(),
  imageFileId: varchar("image_file_id"),
  description: text("description").notNull(),
  specs: jsonb("specs").$type<ProductSpec[]>().notNull(),
  features: jsonb("features").$type<string[]>(),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  metaKeywords: text("meta_keywords"),
  shippingWeightGrams: integer("shipping_weight_grams"),
  shippingLengthCm: integer("shipping_length_cm"),
  shippingWidthCm: integer("shipping_width_cm"),
  shippingHeightCm: integer("shipping_height_cm"),
  ebayListingId: text("ebay_listing_id"),
  ebayOfferId: text("ebay_offer_id"),
  ebaySyncedAt: timestamp("ebay_synced_at"),
  ebaySyncStatus: varchar("ebay_sync_status", { length: 20 }),
});

export const barcodes = pgTable("barcodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  productId: varchar("product_id").notNull(),
  format: varchar("format", { length: 50 }).notNull().default("unknown"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastScannedAt: timestamp("last_scanned_at"),
});

export const inventoryTransactions = pgTable("inventory_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull(),
  barcodeId: varchar("barcode_id"),
  type: varchar("type", { length: 40 }).notNull(),
  quantityDelta: integer("quantity_delta").notNull(),
  reason: text("reason"),
  actor: text("actor").notNull().default("system"),
  orderId: varchar("order_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProductSchema = z.object({
  name: z.string().min(1),
  partNumber: z.string().optional(),
  vehicle: z.string().min(1),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  brand: z.string().min(1),
  price: z.number().positive(),
  rating: z.number(),
  reviewCount: z.number(),
  stock: z.enum(["in-stock", "low", "out"]),
  quantity: z.number().int().min(0),
  deliveryEta: z.string(),
  compatibility: z.array(z.string()),
  tags: z.array(z.string()),
  image: z.string(),
  images: z.array(z.string()).optional(),
  imageFileId: z.string().optional(),
  description: z.string(),
  specs: z.array(productSpecSchema),
  features: z.array(z.string()).optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
  shippingWeightGrams: z.number().int().min(1).optional(),
  shippingLengthCm: z.number().int().min(1).optional(),
  shippingWidthCm: z.number().int().min(1).optional(),
  shippingHeightCm: z.number().int().min(1).optional(),
  barcode: z.string().optional(),
  barcodeFormat: z.string().optional(),
  ebayListingId: z.string().optional(),
  ebayOfferId: z.string().optional(),
  ebaySyncedAt: z.string().optional(),
  ebaySyncStatus: z.enum(["synced", "pending", "error"]).optional(),
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey(),
  orderId: varchar("order_id").notNull(),
  productId: varchar("product_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  priceEach: integer("price_each").notNull(),
});

export const orderFulfillmentScans = pgTable("order_fulfillment_scans", {
  id: varchar("id").primaryKey(),
  orderId: varchar("order_id").notNull(),
  productId: varchar("product_id").notNull(),
  barcodeId: varchar("barcode_id"),
  quantity: integer("quantity").notNull(),
  actor: text("actor").notNull().default("admin"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey(),
  createdAt: text("created_at").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  totalPence: integer("total_pence").notNull(),
  customerEmail: text("customer_email"),
  customerName: text("customer_name"),
  customerFirstName: text("customer_first_name"),
  customerLastName: text("customer_last_name"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  county: text("county"),
  postcode: text("postcode"),
  country: text("country"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  paymentStatus: varchar("payment_status", { length: 30 }).notNull().default("awaiting_payment"),
  paidAt: text("paid_at"),
  invoiceNumber: text("invoice_number"),
  invoiceUrl: text("invoice_url"),
  invoiceFileId: varchar("invoice_file_id"),
  invoiceSentAt: text("invoice_sent_at"),
  shippingLabelProvider: text("shipping_label_provider"),
  shippingLabelId: text("shipping_label_id"),
  shippingLabelUrl: text("shipping_label_url"),
  shippingLabelFileId: varchar("shipping_label_file_id"),
  trackingNumber: text("tracking_number"),
  labelCreatedAt: text("label_created_at"),
  stockDeductedAt: text("stock_deducted_at"),
  packedAt: text("packed_at"),
  packingCompletedBy: text("packing_completed_by"),
  stockRevertedAt: text("stock_reverted_at"),
  stockRevertReason: text("stock_revert_reason"),
  subtotalPence: integer("subtotal_pence"),
  shippingAmountPence: integer("shipping_amount_pence"),
  shippingRateId: text("shipping_rate_id"),
  shippingProvider: text("shipping_provider"),
  shippingServiceLevel: text("shipping_service_level"),
  shippingEstimatedDays: integer("shipping_estimated_days"),
  dispatchCutoffLocal: text("dispatch_cutoff_local"),
  dispatchAdvice: text("dispatch_advice"),
  expectedShipDate: text("expected_ship_date"),
  customerOrderEmailSentAt: text("customer_order_email_sent_at"),
  customerShippedEmailSentAt: text("customer_shipped_email_sent_at"),
  adminAlertEmailSentAt: text("admin_alert_email_sent_at"),
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
  customerFirstName: z.string().optional(),
  customerLastName: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  postcode: z.string().optional(),
  country: z.string().optional(),
  stripePaymentIntentId: z.string().optional(),
  paymentStatus: z.enum(["awaiting_payment", "paid", "failed", "refunded"]).optional(),
  subtotalPence: z.number().int().min(0).optional(),
  shippingAmountPence: z.number().int().min(0).optional(),
  shippingRateId: z.string().optional(),
  shippingProvider: z.string().optional(),
  shippingServiceLevel: z.string().optional(),
  shippingEstimatedDays: z.number().int().min(1).max(30).optional(),
  dispatchCutoffLocal: z.string().optional(),
  dispatchAdvice: z.string().optional(),
  expectedShipDate: z.string().optional(),
});

export const checkoutPrepareSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    quantity: z.number().int().min(1),
    priceEach: z.number().positive(),
  })).min(1),
  customerEmail: z.string().email(),
  customerName: z.string().optional(),
  customerFirstName: z.string().min(1),
  customerLastName: z.string().min(1),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  county: z.string().optional(),
  postcode: z.string().min(1),
  country: z.string().default("GB"),
  shippingRateId: z.string().min(1),
  shippingAmountPence: z.number().int().min(0),
  shippingProvider: z.string().min(1),
  shippingServiceLevel: z.string().min(1),
  shippingEstimatedDays: z.number().int().min(1).max(30).optional(),
});

export const shippingRatesQuoteSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    quantity: z.number().int().min(1),
    priceEach: z.number().positive(),
  })).min(1),
  customerName: z.string().min(1),
  customerFirstName: z.string().optional(),
  customerLastName: z.string().optional(),
  customerEmail: z.string().email(),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  county: z.string().optional(),
  postcode: z.string().min(1),
  country: z.string().default("GB"),
});

export const barcodeResolveSchema = z.object({
  code: z.string().min(3),
  format: z.string().optional(),
});

export const barcodeLinkSchema = z.object({
  code: z.string().min(3),
  productId: z.string().min(1),
  format: z.string().optional(),
});

export const stockInSchema = z.object({
  code: z.string().min(3),
  quantity: z.number().int().min(1),
  reason: z.string().optional(),
});

export const stockOutSchema = z.object({
  code: z.string().min(3),
  quantity: z.number().int().min(1),
  reason: z.string().optional(),
});

export const fulfillmentScanSchema = z.object({
  code: z.string().min(3).optional(),
  productId: z.string().min(1).optional(),
  quantity: z.number().int().min(1).default(1),
}).refine((v) => Boolean(v.code || v.productId), {
  message: "Either barcode code or productId is required",
  path: ["code"],
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CheckoutPrepareInput = z.infer<typeof checkoutPrepareSchema>;
export type ShippingRatesQuoteInput = z.infer<typeof shippingRatesQuoteSchema>;

// Bike compatibility cache for bike finder feature
export const bikeCompatibilityCache = pgTable("bike_compatibility_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  normalizedKey: text("normalized_key").notNull().unique(),
  displayName: text("display_name").notNull(),
  compatibleProductIds: jsonb("compatible_product_ids").$type<string[]>().notNull(),
  totalProductsChecked: integer("total_products_checked").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bikeFinderInputSchema = z.object({
  make: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  cc: z.string().optional(),
  year: z.string().optional(),
  freeText: z.string().min(3).optional(),
}).refine((v) => Boolean((v.make && v.model) || v.freeText), {
  message: "Either select a bike or enter details in free text",
  path: ["freeText"],
});

export type BikeFinderInput = z.infer<typeof bikeFinderInputSchema>;

export type BikeFinderResult = {
  normalizedBike: string;
  displayName: string;
  fromCache: boolean;
  categories: Array<{
    name: string;
    products: ApiProduct[];
  }>;
  totalCompatible: number;
};

export type BikeCompatibilityCacheRow = typeof bikeCompatibilityCache.$inferSelect;

// Simple key-value settings store (e.g. eBay refresh token)
export const settings = pgTable("settings", {
  key: varchar("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ApiStoredFile = {
  id: string;
  kind: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  content: Buffer;
  checksum?: string;
  createdAt: string;
};

export type ApiBarcode = {
  id: string;
  code: string;
  productId: string;
  format: string;
  createdAt: string;
  lastScannedAt?: string;
};

export type ApiInventoryTransaction = {
  id: string;
  productId: string;
  barcodeId?: string;
  type: string;
  quantityDelta: number;
  reason?: string;
  actor: string;
  orderId?: string;
  createdAt: string;
};

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
  images?: string[];
  imageFileId?: string;
  description: string;
  specs: ProductSpec[];
  features?: string[];
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  shippingWeightGrams?: number;
  shippingLengthCm?: number;
  shippingWidthCm?: number;
  shippingHeightCm?: number;
  barcode?: string;
  barcodeFormat?: string;
  ebayListingId?: string;
  ebayOfferId?: string;
  ebaySyncedAt?: string;
  ebaySyncStatus?: string;
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
  customerFirstName?: string;
  customerLastName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  stripePaymentIntentId?: string;
  paymentStatus: string;
  paidAt?: string;
  invoiceNumber?: string;
  invoiceUrl?: string;
  invoiceFileId?: string;
  invoiceSentAt?: string;
  shippingLabelProvider?: string;
  shippingLabelId?: string;
  shippingLabelUrl?: string;
  shippingLabelFileId?: string;
  trackingNumber?: string;
  labelCreatedAt?: string;
  stockDeductedAt?: string;
  packedAt?: string;
  packingCompletedBy?: string;
  stockRevertedAt?: string;
  stockRevertReason?: string;
  subtotalPence?: number;
  shippingAmountPence?: number;
  shippingRateId?: string;
  shippingProvider?: string;
  shippingServiceLevel?: string;
  shippingEstimatedDays?: number;
  dispatchCutoffLocal?: string;
  dispatchAdvice?: string;
  expectedShipDate?: string;
  customerOrderEmailSentAt?: string;
  customerShippedEmailSentAt?: string;
  adminAlertEmailSentAt?: string;
};
