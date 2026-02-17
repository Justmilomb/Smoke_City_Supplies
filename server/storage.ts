import type {
  ApiBarcode,
  ApiInventoryTransaction,
  ApiOrder,
  ApiOrderItem,
  ApiProduct,
  ApiStoredFile,
  Category,
  CheckoutPrepareInput,
  CreateOrderInput,
  InsertCategory,
  InsertProduct,
  InsertUser,
  User,
} from "@shared/schema";
import {
  barcodes,
  categories as categoriesTable,
  checkoutPrepareSchema,
  createOrderSchema,
  inventoryTransactions,
  orderItems,
  orderFulfillmentScans,
  orders,
  products,
  storedFiles,
  users,
} from "@shared/schema";
import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
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
  createStoredFile(input: {
    kind: string;
    filename: string;
    mimeType: string;
    content: Buffer;
    checksum?: string;
  }): Promise<ApiStoredFile>;
  getStoredFile(id: string): Promise<ApiStoredFile | undefined>;

  findBarcode(code: string): Promise<ApiBarcode | undefined>;
  linkBarcode(code: string, productId: string, format?: string): Promise<ApiBarcode>;
  resolveBarcode(code: string): Promise<{ barcode?: ApiBarcode; product?: ApiProduct }>;
  stockInByBarcode(input: { code: string; quantity: number; reason?: string; actor?: string }): Promise<ApiProduct | undefined>;

  createOrder(input: CreateOrderInput): Promise<ApiOrder>;
  prepareCheckoutOrder(input: CheckoutPrepareInput, stripePaymentIntentId: string): Promise<ApiOrder>;
  listOrders(): Promise<ApiOrder[]>;
  getOrder(id: string): Promise<ApiOrder | undefined>;
  getOrderByPaymentIntent(paymentIntentId: string): Promise<ApiOrder | undefined>;
  updateOrderStatus(id: string, status: string): Promise<ApiOrder | undefined>;
  markOrderPaidByPaymentIntent(paymentIntentId: string): Promise<ApiOrder | undefined>;
  markOrderPaymentFailedByPaymentIntent(paymentIntentId: string): Promise<ApiOrder | undefined>;
  recordOrderFulfillmentScan(input: {
    orderId: string;
    productId: string;
    barcodeId?: string;
    quantity: number;
    actor: string;
  }): Promise<{ packed: boolean; progress: Array<{ productId: string; required: number; scanned: number }> }>;
  getOrderFulfillmentProgress(orderId: string): Promise<Array<{ productId: string; required: number; scanned: number }>>;
  restockOverdueUnpackedOrders(days: number): Promise<{ ordersRestocked: number; itemsRestocked: number }>;
  recordOrderInvoice(
    orderId: string,
    data: { invoiceNumber: string; invoiceUrl?: string; invoiceFileId?: string; invoiceSentAt?: string }
  ): Promise<ApiOrder | undefined>;
  recordShippingLabel(
    orderId: string,
    data: {
      shippingLabelProvider: string;
      shippingLabelId: string;
      shippingLabelUrl: string;
      shippingLabelFileId?: string;
      trackingNumber: string;
      labelCreatedAt: string;
    }
  ): Promise<ApiOrder | undefined>;
  recordOrderEmailEvents(
    orderId: string,
    data: {
      customerOrderEmailSentAt?: string;
      customerShippedEmailSentAt?: string;
      adminAlertEmailSentAt?: string;
    }
  ): Promise<ApiOrder | undefined>;

  listInventoryTransactions(limit?: number): Promise<ApiInventoryTransaction[]>;

  listCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(input: InsertCategory): Promise<Category>;
  updateCategory(id: string, patch: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;
}

function stockFromQuantity(quantity: number): "in-stock" | "low" | "out" {
  if (quantity <= 0) return "out";
  if (quantity <= 5) return "low";
  return "in-stock";
}

function parseImageFileId(image: string | undefined): string | undefined {
  if (!image) return undefined;
  const match = image.match(/^\/api\/files\/([^/?#]+)/);
  return match?.[1];
}

function buildFileUrl(fileId: string): string {
  return `/api/files/${fileId}`;
}

function orderToApi(
  row: typeof orders.$inferSelect,
  items: ApiOrderItem[]
): ApiOrder {
  return {
    id: row.id,
    createdAt: row.createdAt,
    status: row.status,
    totalPence: row.totalPence,
    items,
    customerEmail: row.customerEmail ?? undefined,
    customerName: row.customerName ?? undefined,
    addressLine1: row.addressLine1 ?? undefined,
    addressLine2: row.addressLine2 ?? undefined,
    city: row.city ?? undefined,
    county: row.county ?? undefined,
    postcode: row.postcode ?? undefined,
    country: row.country ?? undefined,
    stripePaymentIntentId: row.stripePaymentIntentId ?? undefined,
    paymentStatus: row.paymentStatus,
    paidAt: row.paidAt ?? undefined,
    invoiceNumber: row.invoiceNumber ?? undefined,
    invoiceUrl: row.invoiceUrl ?? undefined,
    invoiceFileId: row.invoiceFileId ?? undefined,
    invoiceSentAt: row.invoiceSentAt ?? undefined,
    shippingLabelProvider: row.shippingLabelProvider ?? undefined,
    shippingLabelId: row.shippingLabelId ?? undefined,
    shippingLabelUrl: row.shippingLabelUrl ?? undefined,
    shippingLabelFileId: row.shippingLabelFileId ?? undefined,
    trackingNumber: row.trackingNumber ?? undefined,
    labelCreatedAt: row.labelCreatedAt ?? undefined,
    stockDeductedAt: row.stockDeductedAt ?? undefined,
    packedAt: row.packedAt ?? undefined,
    packingCompletedBy: row.packingCompletedBy ?? undefined,
    stockRevertedAt: row.stockRevertedAt ?? undefined,
    stockRevertReason: row.stockRevertReason ?? undefined,
    subtotalPence: row.subtotalPence ?? undefined,
    shippingAmountPence: row.shippingAmountPence ?? undefined,
    shippingRateId: row.shippingRateId ?? undefined,
    shippingProvider: row.shippingProvider ?? undefined,
    shippingServiceLevel: row.shippingServiceLevel ?? undefined,
    shippingEstimatedDays: row.shippingEstimatedDays ?? undefined,
    dispatchCutoffLocal: row.dispatchCutoffLocal ?? undefined,
    dispatchAdvice: row.dispatchAdvice ?? undefined,
    expectedShipDate: row.expectedShipDate ?? undefined,
    customerOrderEmailSentAt: row.customerOrderEmailSentAt ?? undefined,
    customerShippedEmailSentAt: row.customerShippedEmailSentAt ?? undefined,
    adminAlertEmailSentAt: row.adminAlertEmailSentAt ?? undefined,
  };
}

export class DbStorage implements IStorage {
  private getDb() {
    if (!db) throw new Error("Database not initialized");
    return db;
  }

  async createStoredFile(input: {
    kind: string;
    filename: string;
    mimeType: string;
    content: Buffer;
    checksum?: string;
  }): Promise<ApiStoredFile> {
    const [row] = await this.getDb()
      .insert(storedFiles)
      .values({
        id: randomUUID(),
        kind: input.kind,
        filename: input.filename,
        mimeType: input.mimeType,
        sizeBytes: input.content.length,
        content: input.content.toString("base64"),
        checksum: input.checksum ?? null,
      })
      .returning();
    if (!row) throw new Error("Failed to store file");
    return {
      id: row.id,
      kind: row.kind,
      filename: row.filename,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      content: Buffer.from(row.content, "base64"),
      checksum: row.checksum ?? undefined,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async getStoredFile(id: string): Promise<ApiStoredFile | undefined> {
    const [row] = await this.getDb().select().from(storedFiles).where(eq(storedFiles.id, id)).limit(1);
    if (!row) return undefined;
    return {
      id: row.id,
      kind: row.kind,
      filename: row.filename,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      content: Buffer.from(row.content, "base64"),
      checksum: row.checksum ?? undefined,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async getBarcodeMapForProducts(productIds: string[]): Promise<Map<string, ApiBarcode>> {
    if (productIds.length === 0) return new Map();
    const rows = await this.getDb().select().from(barcodes).where(inArray(barcodes.productId, productIds));
    const map = new Map<string, ApiBarcode>();
    for (const row of rows) {
      if (!map.has(row.productId)) {
        map.set(row.productId, {
          id: row.id,
          code: row.code,
          productId: row.productId,
          format: row.format,
          createdAt: row.createdAt.toISOString(),
          lastScannedAt: row.lastScannedAt?.toISOString(),
        });
      }
    }
    return map;
  }

  private async rowToApiProduct(row: typeof products.$inferSelect): Promise<ApiProduct> {
    const barcode = await this.getBarcodeByProductId(row.id);
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
      image: row.imageFileId ? buildFileUrl(row.imageFileId) : row.image,
      imageFileId: row.imageFileId ?? undefined,
      description: row.description,
      specs: row.specs,
      features: row.features ?? undefined,
      metaTitle: row.metaTitle ?? undefined,
      metaDescription: row.metaDescription ?? undefined,
      metaKeywords: row.metaKeywords ?? undefined,
      shippingWeightGrams: row.shippingWeightGrams ?? undefined,
      shippingLengthCm: row.shippingLengthCm ?? undefined,
      shippingWidthCm: row.shippingWidthCm ?? undefined,
      shippingHeightCm: row.shippingHeightCm ?? undefined,
      barcode: barcode?.code,
      barcodeFormat: barcode?.format,
    };
  }

  private async getBarcodeByProductId(productId: string): Promise<ApiBarcode | undefined> {
    const [row] = await this.getDb().select().from(barcodes).where(eq(barcodes.productId, productId)).limit(1);
    if (!row) return undefined;
    return {
      id: row.id,
      code: row.code,
      productId: row.productId,
      format: row.format,
      createdAt: row.createdAt.toISOString(),
      lastScannedAt: row.lastScannedAt?.toISOString(),
    };
  }

  private async listOrderItems(orderId: string): Promise<ApiOrderItem[]> {
    const itemRows = await this.getDb().select().from(orderItems).where(eq(orderItems.orderId, orderId));
    return itemRows.map((row) => ({
      productId: row.productId,
      productName: row.productName,
      quantity: row.quantity,
      priceEach: row.priceEach / 100,
    }));
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
    const productIds = rows.map((r) => r.id);
    const barcodeMap = await this.getBarcodeMapForProducts(productIds);
    return rows.map((row) => {
      const barcode = barcodeMap.get(row.id);
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
        image: row.imageFileId ? buildFileUrl(row.imageFileId) : row.image,
        imageFileId: row.imageFileId ?? undefined,
        description: row.description,
        specs: row.specs,
        features: row.features ?? undefined,
        metaTitle: row.metaTitle ?? undefined,
        metaDescription: row.metaDescription ?? undefined,
        metaKeywords: row.metaKeywords ?? undefined,
        shippingWeightGrams: row.shippingWeightGrams ?? undefined,
        shippingLengthCm: row.shippingLengthCm ?? undefined,
        shippingWidthCm: row.shippingWidthCm ?? undefined,
        shippingHeightCm: row.shippingHeightCm ?? undefined,
        barcode: barcode?.code,
        barcodeFormat: barcode?.format,
      };
    });
  }

  async getProduct(id: string): Promise<ApiProduct | undefined> {
    const [row] = await this.getDb().select().from(products).where(eq(products.id, id)).limit(1);
    return row ? this.rowToApiProduct(row) : undefined;
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
        imageFileId: input.imageFileId ?? parseImageFileId(input.image) ?? null,
        description: input.description,
        specs: input.specs,
        features: input.features ?? null,
        metaTitle: input.metaTitle ?? null,
        metaDescription: input.metaDescription ?? null,
        metaKeywords: input.metaKeywords ?? null,
        shippingWeightGrams: input.shippingWeightGrams ?? null,
        shippingLengthCm: input.shippingLengthCm ?? null,
        shippingWidthCm: input.shippingWidthCm ?? null,
        shippingHeightCm: input.shippingHeightCm ?? null,
      })
      .returning();
    if (!row) throw new Error("Failed to create product");

    if (input.barcode) {
      await this.linkBarcode(input.barcode, id, input.barcodeFormat);
    }

    return this.rowToApiProduct(row);
  }

  async updateProduct(id: string, patch: Partial<ApiProduct>): Promise<ApiProduct | undefined> {
    const existing = await this.getProduct(id);
    if (!existing) return undefined;

    const dbPatch: Record<string, unknown> = { ...patch };
    delete dbPatch.barcode;
    delete dbPatch.barcodeFormat;
    if (patch.price !== undefined) dbPatch.price = Math.round(patch.price * 100);
    if (patch.rating !== undefined) dbPatch.rating = Math.round(patch.rating * 10);
    if (patch.imageFileId !== undefined) dbPatch.imageFileId = patch.imageFileId;
    if (patch.image !== undefined && patch.imageFileId === undefined) {
      dbPatch.imageFileId = parseImageFileId(patch.image) ?? null;
    }
    if (patch.shippingWeightGrams !== undefined) dbPatch.shippingWeightGrams = patch.shippingWeightGrams;
    if (patch.shippingLengthCm !== undefined) dbPatch.shippingLengthCm = patch.shippingLengthCm;
    if (patch.shippingWidthCm !== undefined) dbPatch.shippingWidthCm = patch.shippingWidthCm;
    if (patch.shippingHeightCm !== undefined) dbPatch.shippingHeightCm = patch.shippingHeightCm;

    const [row] = await this.getDb().update(products).set(dbPatch).where(eq(products.id, id)).returning();

    if (patch.barcode) {
      await this.linkBarcode(patch.barcode, id, patch.barcodeFormat);
    }

    return row ? this.rowToApiProduct(row) : undefined;
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
    return row ? this.rowToApiProduct(row) : undefined;
  }

  async findBarcode(code: string): Promise<ApiBarcode | undefined> {
    const [row] = await this.getDb().select().from(barcodes).where(eq(barcodes.code, code)).limit(1);
    if (!row) return undefined;
    return {
      id: row.id,
      code: row.code,
      productId: row.productId,
      format: row.format,
      createdAt: row.createdAt.toISOString(),
      lastScannedAt: row.lastScannedAt?.toISOString(),
    };
  }

  async linkBarcode(code: string, productId: string, format = "unknown"): Promise<ApiBarcode> {
    const existing = await this.findBarcode(code);
    if (existing && existing.productId !== productId) {
      throw new Error("Barcode already linked to a different product");
    }

    const [row] = await this.getDb()
      .insert(barcodes)
      .values({ code, productId, format })
      .onConflictDoUpdate({
        target: barcodes.code,
        set: { productId, format, lastScannedAt: new Date() },
      })
      .returning();

    if (!row) throw new Error("Failed to link barcode");

    return {
      id: row.id,
      code: row.code,
      productId: row.productId,
      format: row.format,
      createdAt: row.createdAt.toISOString(),
      lastScannedAt: row.lastScannedAt?.toISOString(),
    };
  }

  async resolveBarcode(code: string): Promise<{ barcode?: ApiBarcode; product?: ApiProduct }> {
    const barcode = await this.findBarcode(code);
    if (!barcode) return {};
    await this.getDb().update(barcodes).set({ lastScannedAt: new Date() }).where(eq(barcodes.id, barcode.id));
    const product = await this.getProduct(barcode.productId);
    return { barcode, product };
  }

  private async recordInventoryTransaction(input: {
    productId: string;
    barcodeId?: string;
    type: string;
    quantityDelta: number;
    reason?: string;
    actor: string;
    orderId?: string;
  }): Promise<void> {
    await this.getDb().insert(inventoryTransactions).values({
      id: randomUUID(),
      productId: input.productId,
      barcodeId: input.barcodeId ?? null,
      type: input.type,
      quantityDelta: input.quantityDelta,
      reason: input.reason ?? null,
      actor: input.actor,
      orderId: input.orderId ?? null,
    });
  }

  async stockInByBarcode(input: {
    code: string;
    quantity: number;
    reason?: string;
    actor?: string;
  }): Promise<ApiProduct | undefined> {
    const resolved = await this.resolveBarcode(input.code);
    if (!resolved.product || !resolved.barcode) return undefined;

    const nextQty = resolved.product.quantity + input.quantity;
    const updated = await this.updateProductQuantity(resolved.product.id, nextQty);
    if (!updated) return undefined;

    await this.recordInventoryTransaction({
      productId: updated.id,
      barcodeId: resolved.barcode.id,
      type: "stock_in",
      quantityDelta: input.quantity,
      reason: input.reason,
      actor: input.actor ?? "admin",
    });

    return updated;
  }

  async createOrder(input: CreateOrderInput): Promise<ApiOrder> {
    const parsed = createOrderSchema.safeParse(input);
    if (!parsed.success) throw new Error("Invalid order");
    const { items, customerEmail, customerName } = parsed.data;

    const orderId = randomUUID();
    const now = new Date().toISOString();
    const itemsSubtotalPence = Math.round(
      items.reduce((sum, i) => sum + i.priceEach * i.quantity * 100, 0)
    );
    const subtotalPence = parsed.data.subtotalPence ?? itemsSubtotalPence;
    const shippingAmountPence = parsed.data.shippingAmountPence ?? 0;
    const totalPence = subtotalPence + shippingAmountPence;

    await this.getDb().insert(orders).values({
      id: orderId,
      createdAt: now,
      status: "pending",
      totalPence,
      customerEmail: customerEmail ?? null,
      customerName: customerName ?? null,
      addressLine1: parsed.data.addressLine1 ?? null,
      addressLine2: parsed.data.addressLine2 ?? null,
      city: parsed.data.city ?? null,
      county: parsed.data.county ?? null,
      postcode: parsed.data.postcode ?? null,
      country: parsed.data.country ?? "GB",
      stripePaymentIntentId: parsed.data.stripePaymentIntentId ?? null,
      paymentStatus: parsed.data.paymentStatus ?? "awaiting_payment",
      subtotalPence,
      shippingAmountPence,
      shippingRateId: parsed.data.shippingRateId ?? null,
      shippingProvider: parsed.data.shippingProvider ?? null,
      shippingServiceLevel: parsed.data.shippingServiceLevel ?? null,
      shippingEstimatedDays: parsed.data.shippingEstimatedDays ?? null,
      dispatchCutoffLocal: parsed.data.dispatchCutoffLocal ?? null,
      dispatchAdvice: parsed.data.dispatchAdvice ?? null,
      expectedShipDate: parsed.data.expectedShipDate ?? null,
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

    const created = await this.getOrder(orderId);
    if (!created) throw new Error("Failed to create order");

    if (created.paymentStatus === "paid") {
      await this.deductStockForOrder(orderId);
      return (await this.getOrder(orderId)) ?? created;
    }

    return created;
  }

  async prepareCheckoutOrder(input: CheckoutPrepareInput, stripePaymentIntentId: string): Promise<ApiOrder> {
    const parsed = checkoutPrepareSchema.safeParse(input);
    if (!parsed.success) throw new Error("Invalid checkout input");

    return this.createOrder({
      ...parsed.data,
      stripePaymentIntentId,
      paymentStatus: "awaiting_payment",
    });
  }

  async listOrders(): Promise<ApiOrder[]> {
    const orderRows = await this.getDb().select().from(orders).orderBy(desc(orders.createdAt));
    const result: ApiOrder[] = [];

    for (const orderRow of orderRows) {
      const items = await this.listOrderItems(orderRow.id);
      result.push(orderToApi(orderRow, items));
    }

    return result;
  }

  async getOrder(id: string): Promise<ApiOrder | undefined> {
    const [orderRow] = await this.getDb().select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!orderRow) return undefined;
    const items = await this.listOrderItems(id);
    return orderToApi(orderRow, items);
  }

  async getOrderByPaymentIntent(paymentIntentId: string): Promise<ApiOrder | undefined> {
    const [orderRow] = await this.getDb()
      .select()
      .from(orders)
      .where(eq(orders.stripePaymentIntentId, paymentIntentId))
      .limit(1);
    if (!orderRow) return undefined;
    const items = await this.listOrderItems(orderRow.id);
    return orderToApi(orderRow, items);
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

  private async deductStockForOrder(orderId: string): Promise<void> {
    const database = this.getDb();

    const [orderRow] = await database.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!orderRow || orderRow.stockDeductedAt) return;

    const items = await this.listOrderItems(orderId);

    await database.transaction(async (tx) => {
      for (const item of items) {
        // Lock the product row to prevent concurrent reads
        const [locked] = await tx
          .select({ id: products.id, quantity: products.quantity })
          .from(products)
          .where(eq(products.id, item.productId))
          .for("update");

        if (!locked) continue;

        const newQty = locked.quantity - item.quantity;
        if (newQty < 0) {
          throw new Error(
            `Insufficient stock for "${item.productName}" (product ${item.productId}): wanted ${item.quantity}, only ${locked.quantity} available`
          );
        }

        const stock = stockFromQuantity(newQty);
        await tx
          .update(products)
          .set({ quantity: newQty, stock })
          .where(eq(products.id, item.productId));

        await tx.insert(inventoryTransactions).values({
          id: randomUUID(),
          productId: item.productId,
          barcodeId: null,
          type: "order_reserve",
          quantityDelta: -item.quantity,
          reason: "Paid order stock deduction",
          actor: "system",
          orderId,
        });
      }

      await tx
        .update(orders)
        .set({ stockDeductedAt: new Date().toISOString() })
        .where(eq(orders.id, orderId));
    });
  }

  async markOrderPaidByPaymentIntent(paymentIntentId: string): Promise<ApiOrder | undefined> {
    const [orderRow] = await this.getDb()
      .select()
      .from(orders)
      .where(eq(orders.stripePaymentIntentId, paymentIntentId))
      .limit(1);
    if (!orderRow) return undefined;

    if (orderRow.paymentStatus !== "paid") {
      await this.getDb()
        .update(orders)
        .set({
          paymentStatus: "paid",
          paidAt: new Date().toISOString(),
          status: orderRow.status === "pending" ? "processing" : orderRow.status,
        })
        .where(eq(orders.id, orderRow.id));
    }

    try {
      await this.deductStockForOrder(orderRow.id);
    } catch (err) {
      console.error(`[stock] deduction failed for order ${orderRow.id}:`, err);
      await this.getDb()
        .update(orders)
        .set({ status: "stock_issue" })
        .where(eq(orders.id, orderRow.id));
    }
    return this.getOrder(orderRow.id);
  }

  async markOrderPaymentFailedByPaymentIntent(paymentIntentId: string): Promise<ApiOrder | undefined> {
    const [orderRow] = await this.getDb()
      .select()
      .from(orders)
      .where(eq(orders.stripePaymentIntentId, paymentIntentId))
      .limit(1);
    if (!orderRow) return undefined;

    await this.getDb()
      .update(orders)
      .set({ paymentStatus: "failed" })
      .where(eq(orders.id, orderRow.id));

    return this.getOrder(orderRow.id);
  }

  async recordOrderFulfillmentScan(input: {
    orderId: string;
    productId: string;
    barcodeId?: string;
    quantity: number;
    actor: string;
  }): Promise<{ packed: boolean; progress: Array<{ productId: string; required: number; scanned: number }> }> {
    await this.getDb().insert(orderFulfillmentScans).values({
      id: randomUUID(),
      orderId: input.orderId,
      productId: input.productId,
      barcodeId: input.barcodeId ?? null,
      quantity: input.quantity,
      actor: input.actor,
    });

    const items = await this.listOrderItems(input.orderId);
    const scans = await this.getDb()
      .select()
      .from(orderFulfillmentScans)
      .where(eq(orderFulfillmentScans.orderId, input.orderId));

    const scannedByProduct = new Map<string, number>();
    for (const scan of scans) {
      scannedByProduct.set(scan.productId, (scannedByProduct.get(scan.productId) || 0) + scan.quantity);
    }

    const progress = items.map((item) => ({
      productId: item.productId,
      required: item.quantity,
      scanned: scannedByProduct.get(item.productId) || 0,
    }));
    const packed = progress.every((p) => p.scanned >= p.required);

    if (packed) {
      await this.getDb()
        .update(orders)
        .set({
          packedAt: new Date().toISOString(),
          packingCompletedBy: input.actor,
        })
        .where(eq(orders.id, input.orderId));
    }

    return { packed, progress };
  }

  async getOrderFulfillmentProgress(orderId: string): Promise<Array<{ productId: string; required: number; scanned: number }>> {
    const items = await this.listOrderItems(orderId);
    const scans = await this.getDb()
      .select()
      .from(orderFulfillmentScans)
      .where(eq(orderFulfillmentScans.orderId, orderId));
    const scannedByProduct = new Map<string, number>();
    for (const scan of scans) {
      scannedByProduct.set(scan.productId, (scannedByProduct.get(scan.productId) || 0) + scan.quantity);
    }
    return items.map((item) => ({
      productId: item.productId,
      required: item.quantity,
      scanned: scannedByProduct.get(item.productId) || 0,
    }));
  }

  async restockOverdueUnpackedOrders(days: number): Promise<{ ordersRestocked: number; itemsRestocked: number }> {
    const now = new Date();
    const cutoff = new Date(now.getTime() - Math.max(1, days) * 24 * 60 * 60 * 1000);
    const candidates = await this.getDb()
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.paymentStatus, "paid"),
          isNotNull(orders.stockDeductedAt),
          isNull(orders.packedAt),
          isNull(orders.stockRevertedAt)
        )
      );

    let ordersRestocked = 0;
    let itemsRestocked = 0;
    for (const orderRow of candidates) {
      const deductedAt = orderRow.stockDeductedAt ? new Date(orderRow.stockDeductedAt) : undefined;
      if (!deductedAt || Number.isNaN(deductedAt.getTime()) || deductedAt > cutoff) continue;

      const items = await this.listOrderItems(orderRow.id);
      for (const item of items) {
        const product = await this.getProduct(item.productId);
        if (!product) continue;
        await this.updateProductQuantity(item.productId, product.quantity + item.quantity);
        await this.recordInventoryTransaction({
          productId: item.productId,
          type: "order_restock_timeout",
          quantityDelta: item.quantity,
          actor: "system",
          orderId: orderRow.id,
          reason: `Auto restock after ${days} days without packing`,
        });
        itemsRestocked += item.quantity;
      }

      await this.getDb()
        .update(orders)
        .set({
          stockRevertedAt: now.toISOString(),
          stockRevertReason: `Auto restock after ${days} days without packing`,
        })
        .where(eq(orders.id, orderRow.id));
      ordersRestocked += 1;
    }

    return { ordersRestocked, itemsRestocked };
  }

  async recordOrderInvoice(
    orderId: string,
    data: { invoiceNumber: string; invoiceUrl?: string; invoiceFileId?: string; invoiceSentAt?: string }
  ): Promise<ApiOrder | undefined> {
    await this.getDb()
      .update(orders)
      .set({
        invoiceNumber: data.invoiceNumber,
        invoiceUrl: data.invoiceUrl ?? null,
        invoiceFileId: data.invoiceFileId ?? null,
        invoiceSentAt: data.invoiceSentAt ?? null,
      })
      .where(eq(orders.id, orderId));

    return this.getOrder(orderId);
  }

  async recordShippingLabel(
    orderId: string,
    data: {
      shippingLabelProvider: string;
      shippingLabelId: string;
      shippingLabelUrl: string;
      shippingLabelFileId?: string;
      trackingNumber: string;
      labelCreatedAt: string;
    }
  ): Promise<ApiOrder | undefined> {
    await this.getDb()
      .update(orders)
      .set({
        shippingLabelProvider: data.shippingLabelProvider,
        shippingLabelId: data.shippingLabelId,
        shippingLabelUrl: data.shippingLabelUrl,
        shippingLabelFileId: data.shippingLabelFileId ?? null,
        trackingNumber: data.trackingNumber,
        labelCreatedAt: data.labelCreatedAt,
      })
      .where(eq(orders.id, orderId));

    return this.getOrder(orderId);
  }

  async recordOrderEmailEvents(
    orderId: string,
    data: {
      customerOrderEmailSentAt?: string;
      customerShippedEmailSentAt?: string;
      adminAlertEmailSentAt?: string;
    }
  ): Promise<ApiOrder | undefined> {
    const patch: Record<string, string> = {};
    if (data.customerOrderEmailSentAt) patch.customerOrderEmailSentAt = data.customerOrderEmailSentAt;
    if (data.customerShippedEmailSentAt) patch.customerShippedEmailSentAt = data.customerShippedEmailSentAt;
    if (data.adminAlertEmailSentAt) patch.adminAlertEmailSentAt = data.adminAlertEmailSentAt;
    if (!Object.keys(patch).length) return this.getOrder(orderId);

    await this.getDb()
      .update(orders)
      .set(patch)
      .where(eq(orders.id, orderId));

    return this.getOrder(orderId);
  }

  async listInventoryTransactions(limit = 100): Promise<ApiInventoryTransaction[]> {
    const rows = await this.getDb().select().from(inventoryTransactions).orderBy(desc(inventoryTransactions.createdAt)).limit(limit);
    return rows.map((row) => ({
      id: row.id,
      productId: row.productId,
      barcodeId: row.barcodeId ?? undefined,
      type: row.type,
      quantityDelta: row.quantityDelta,
      reason: row.reason ?? undefined,
      actor: row.actor,
      orderId: row.orderId ?? undefined,
      createdAt: row.createdAt.toISOString(),
    }));
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
  private files = new Map<string, ApiStoredFile>();
  private barcodeMap = new Map<string, ApiBarcode>(); // code -> barcode
  private inventoryTx = new Map<string, ApiInventoryTransaction>();
  private fulfillmentScans = new Map<string, Array<{ productId: string; quantity: number; barcodeId?: string; actor: string; createdAt: string }>>();

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

  async createStoredFile(input: {
    kind: string;
    filename: string;
    mimeType: string;
    content: Buffer;
    checksum?: string;
  }): Promise<ApiStoredFile> {
    const id = randomUUID();
    const file: ApiStoredFile = {
      id,
      kind: input.kind,
      filename: input.filename,
      mimeType: input.mimeType,
      sizeBytes: input.content.length,
      content: input.content,
      checksum: input.checksum,
      createdAt: new Date().toISOString(),
    };
    this.files.set(id, file);
    return file;
  }

  async getStoredFile(id: string): Promise<ApiStoredFile | undefined> {
    return this.files.get(id);
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
      image: input.imageFileId
        ? buildFileUrl(input.imageFileId)
        : parseImageFileId(input.image)
          ? buildFileUrl(parseImageFileId(input.image)!)
          : input.image,
      imageFileId: input.imageFileId ?? parseImageFileId(input.image),
      description: input.description,
      specs: input.specs,
      features: input.features,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
      metaKeywords: input.metaKeywords,
      shippingWeightGrams: input.shippingWeightGrams,
      shippingLengthCm: input.shippingLengthCm,
      shippingWidthCm: input.shippingWidthCm,
      shippingHeightCm: input.shippingHeightCm,
      barcode: input.barcode,
      barcodeFormat: input.barcodeFormat,
    };
    this.products.set(id, product);
    if (input.barcode) {
      await this.linkBarcode(input.barcode, id, input.barcodeFormat);
    }
    return product;
  }

  async updateProduct(id: string, patch: Partial<ApiProduct>): Promise<ApiProduct | undefined> {
    const existing = this.products.get(id);
    if (!existing) return undefined;
    const resolvedImageFileId =
      patch.imageFileId !== undefined
        ? patch.imageFileId
        : patch.image !== undefined
          ? parseImageFileId(patch.image)
          : existing.imageFileId;
    const updated: ApiProduct = {
      ...existing,
      ...patch,
      imageFileId: resolvedImageFileId,
      image:
        resolvedImageFileId
          ? buildFileUrl(resolvedImageFileId)
          : (patch.image ?? existing.image),
    };
    this.products.set(id, updated);
    if (patch.barcode) {
      await this.linkBarcode(patch.barcode, id, patch.barcodeFormat);
    }
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

  async findBarcode(code: string): Promise<ApiBarcode | undefined> {
    return this.barcodeMap.get(code);
  }

  async linkBarcode(code: string, productId: string, format = "unknown"): Promise<ApiBarcode> {
    const existing = this.barcodeMap.get(code);
    if (existing && existing.productId !== productId) {
      throw new Error("Barcode already linked to a different product");
    }

    const now = new Date().toISOString();
    const barcode: ApiBarcode = {
      id: existing?.id ?? randomUUID(),
      code,
      productId,
      format,
      createdAt: existing?.createdAt ?? now,
      lastScannedAt: now,
    };
    this.barcodeMap.set(code, barcode);

    const product = this.products.get(productId);
    if (product) {
      this.products.set(productId, { ...product, barcode: code, barcodeFormat: format });
    }

    return barcode;
  }

  async resolveBarcode(code: string): Promise<{ barcode?: ApiBarcode; product?: ApiProduct }> {
    const barcode = this.barcodeMap.get(code);
    if (!barcode) return {};
    const product = this.products.get(barcode.productId);
    return { barcode: { ...barcode, lastScannedAt: new Date().toISOString() }, product };
  }

  private recordInventoryTransaction(input: {
    productId: string;
    barcodeId?: string;
    type: string;
    quantityDelta: number;
    reason?: string;
    actor: string;
    orderId?: string;
  }) {
    const id = randomUUID();
    this.inventoryTx.set(id, {
      id,
      productId: input.productId,
      barcodeId: input.barcodeId,
      type: input.type,
      quantityDelta: input.quantityDelta,
      reason: input.reason,
      actor: input.actor,
      orderId: input.orderId,
      createdAt: new Date().toISOString(),
    });
  }

  async stockInByBarcode(input: {
    code: string;
    quantity: number;
    reason?: string;
    actor?: string;
  }): Promise<ApiProduct | undefined> {
    const resolved = await this.resolveBarcode(input.code);
    if (!resolved.product || !resolved.barcode) return undefined;

    const updated = await this.updateProductQuantity(
      resolved.product.id,
      resolved.product.quantity + input.quantity
    );
    if (!updated) return undefined;

    this.recordInventoryTransaction({
      productId: updated.id,
      barcodeId: resolved.barcode.id,
      type: "stock_in",
      quantityDelta: input.quantity,
      reason: input.reason,
      actor: input.actor ?? "admin",
    });

    return updated;
  }

  async createOrder(input: CreateOrderInput): Promise<ApiOrder> {
    const parsed = createOrderSchema.safeParse(input);
    if (!parsed.success) throw new Error("Invalid order");
    const { items, customerEmail, customerName } = parsed.data;

    const orderId = randomUUID();
    const now = new Date().toISOString();
    const itemsSubtotalPence = Math.round(
      items.reduce((sum, i) => sum + i.priceEach * i.quantity * 100, 0)
    );
    const subtotalPence = parsed.data.subtotalPence ?? itemsSubtotalPence;
    const shippingAmountPence = parsed.data.shippingAmountPence ?? 0;
    const totalPence = subtotalPence + shippingAmountPence;
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
      addressLine1: parsed.data.addressLine1,
      addressLine2: parsed.data.addressLine2,
      city: parsed.data.city,
      county: parsed.data.county,
      postcode: parsed.data.postcode,
      country: parsed.data.country ?? "GB",
      stripePaymentIntentId: parsed.data.stripePaymentIntentId,
      paymentStatus: parsed.data.paymentStatus ?? "awaiting_payment",
      subtotalPence,
      shippingAmountPence,
      shippingRateId: parsed.data.shippingRateId,
      shippingProvider: parsed.data.shippingProvider,
      shippingServiceLevel: parsed.data.shippingServiceLevel,
      shippingEstimatedDays: parsed.data.shippingEstimatedDays,
      dispatchCutoffLocal: parsed.data.dispatchCutoffLocal,
      dispatchAdvice: parsed.data.dispatchAdvice,
      expectedShipDate: parsed.data.expectedShipDate,
    };

    this.orders.set(orderId, order);

    if (order.paymentStatus === "paid") {
      await this.deductStockForOrder(orderId);
    }

    return this.orders.get(orderId)!;
  }

  async prepareCheckoutOrder(input: CheckoutPrepareInput, stripePaymentIntentId: string): Promise<ApiOrder> {
    const parsed = checkoutPrepareSchema.safeParse(input);
    if (!parsed.success) throw new Error("Invalid checkout input");
    return this.createOrder({
      ...parsed.data,
      stripePaymentIntentId,
      paymentStatus: "awaiting_payment",
    });
  }

  async listOrders(): Promise<ApiOrder[]> {
    return Array.from(this.orders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getOrder(id: string): Promise<ApiOrder | undefined> {
    return this.orders.get(id);
  }

  async getOrderByPaymentIntent(paymentIntentId: string): Promise<ApiOrder | undefined> {
    return Array.from(this.orders.values()).find((o) => o.stripePaymentIntentId === paymentIntentId);
  }

  async updateOrderStatus(id: string, status: string): Promise<ApiOrder | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    const updated = { ...order, status };
    this.orders.set(id, updated);
    return updated;
  }

  private async deductStockForOrder(orderId: string): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order || order.stockDeductedAt) return;

    for (const item of order.items) {
      const product = this.products.get(item.productId);
      if (!product) continue;
      const newQty = Math.max(0, product.quantity - item.quantity);
      await this.updateProductQuantity(item.productId, newQty);
      this.recordInventoryTransaction({
        productId: item.productId,
        type: "order_reserve",
        quantityDelta: -item.quantity,
        actor: "system",
        orderId,
        reason: "Paid order stock deduction",
      });
    }

    this.orders.set(orderId, {
      ...order,
      stockDeductedAt: new Date().toISOString(),
    });
  }

  async markOrderPaidByPaymentIntent(paymentIntentId: string): Promise<ApiOrder | undefined> {
    const order = await this.getOrderByPaymentIntent(paymentIntentId);
    if (!order) return undefined;

    if (order.paymentStatus !== "paid") {
      this.orders.set(order.id, {
        ...order,
        paymentStatus: "paid",
        paidAt: new Date().toISOString(),
        status: order.status === "pending" ? "processing" : order.status,
      });
    }

    await this.deductStockForOrder(order.id);
    return this.orders.get(order.id);
  }

  async markOrderPaymentFailedByPaymentIntent(paymentIntentId: string): Promise<ApiOrder | undefined> {
    const order = await this.getOrderByPaymentIntent(paymentIntentId);
    if (!order) return undefined;
    const updated = { ...order, paymentStatus: "failed" };
    this.orders.set(order.id, updated);
    return updated;
  }

  async recordOrderFulfillmentScan(input: {
    orderId: string;
    productId: string;
    barcodeId?: string;
    quantity: number;
    actor: string;
  }): Promise<{ packed: boolean; progress: Array<{ productId: string; required: number; scanned: number }> }> {
    const order = this.orders.get(input.orderId);
    if (!order) return { packed: false, progress: [] };
    const list = this.fulfillmentScans.get(input.orderId) || [];
    list.push({
      productId: input.productId,
      quantity: input.quantity,
      barcodeId: input.barcodeId,
      actor: input.actor,
      createdAt: new Date().toISOString(),
    });
    this.fulfillmentScans.set(input.orderId, list);

    const scannedByProduct = new Map<string, number>();
    for (const scan of list) {
      scannedByProduct.set(scan.productId, (scannedByProduct.get(scan.productId) || 0) + scan.quantity);
    }
    const progress = order.items.map((item) => ({
      productId: item.productId,
      required: item.quantity,
      scanned: scannedByProduct.get(item.productId) || 0,
    }));
    const packed = progress.every((p) => p.scanned >= p.required);
    if (packed) {
      this.orders.set(input.orderId, {
        ...order,
        packedAt: new Date().toISOString(),
        packingCompletedBy: input.actor,
      });
    }
    return { packed, progress };
  }

  async getOrderFulfillmentProgress(orderId: string): Promise<Array<{ productId: string; required: number; scanned: number }>> {
    const order = this.orders.get(orderId);
    if (!order) return [];
    const list = this.fulfillmentScans.get(orderId) || [];
    const scannedByProduct = new Map<string, number>();
    for (const scan of list) {
      scannedByProduct.set(scan.productId, (scannedByProduct.get(scan.productId) || 0) + scan.quantity);
    }
    return order.items.map((item) => ({
      productId: item.productId,
      required: item.quantity,
      scanned: scannedByProduct.get(item.productId) || 0,
    }));
  }

  async restockOverdueUnpackedOrders(days: number): Promise<{ ordersRestocked: number; itemsRestocked: number }> {
    const now = new Date();
    const cutoff = new Date(now.getTime() - Math.max(1, days) * 24 * 60 * 60 * 1000);
    let ordersRestocked = 0;
    let itemsRestocked = 0;

    for (const order of this.orders.values()) {
      if (order.paymentStatus !== "paid" || !order.stockDeductedAt || order.packedAt || order.stockRevertedAt) continue;
      const deductedAt = new Date(order.stockDeductedAt);
      if (Number.isNaN(deductedAt.getTime()) || deductedAt > cutoff) continue;

      for (const item of order.items) {
        const product = this.products.get(item.productId);
        if (!product) continue;
        await this.updateProductQuantity(item.productId, product.quantity + item.quantity);
        this.recordInventoryTransaction({
          productId: item.productId,
          type: "order_restock_timeout",
          quantityDelta: item.quantity,
          actor: "system",
          orderId: order.id,
          reason: `Auto restock after ${days} days without packing`,
        });
        itemsRestocked += item.quantity;
      }

      this.orders.set(order.id, {
        ...order,
        stockRevertedAt: now.toISOString(),
        stockRevertReason: `Auto restock after ${days} days without packing`,
      });
      ordersRestocked += 1;
    }

    return { ordersRestocked, itemsRestocked };
  }

  async recordOrderInvoice(
    orderId: string,
    data: { invoiceNumber: string; invoiceUrl?: string; invoiceFileId?: string; invoiceSentAt?: string }
  ): Promise<ApiOrder | undefined> {
    const order = this.orders.get(orderId);
    if (!order) return undefined;
    const updated = {
      ...order,
      invoiceNumber: data.invoiceNumber,
      invoiceUrl: data.invoiceUrl,
      invoiceFileId: data.invoiceFileId,
      invoiceSentAt: data.invoiceSentAt,
    };
    this.orders.set(orderId, updated);
    return updated;
  }

  async recordShippingLabel(
    orderId: string,
    data: {
      shippingLabelProvider: string;
      shippingLabelId: string;
      shippingLabelUrl: string;
      shippingLabelFileId?: string;
      trackingNumber: string;
      labelCreatedAt: string;
    }
  ): Promise<ApiOrder | undefined> {
    const order = this.orders.get(orderId);
    if (!order) return undefined;
    const updated = {
      ...order,
      ...data,
    };
    this.orders.set(orderId, updated);
    return updated;
  }

  async recordOrderEmailEvents(
    orderId: string,
    data: {
      customerOrderEmailSentAt?: string;
      customerShippedEmailSentAt?: string;
      adminAlertEmailSentAt?: string;
    }
  ): Promise<ApiOrder | undefined> {
    const order = this.orders.get(orderId);
    if (!order) return undefined;
    const updated = { ...order, ...data };
    this.orders.set(orderId, updated);
    return updated;
  }

  async listInventoryTransactions(limit = 100): Promise<ApiInventoryTransaction[]> {
    return Array.from(this.inventoryTx.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
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
}

if (!db && process.env.NODE_ENV === "production") {
  console.warn(
    "[storage] DATABASE_URL is not set in production. Using in-memory storage; data will reset on deploy/restart."
  );
}

export const storage = db ? new DbStorage() : new MemStorage();
