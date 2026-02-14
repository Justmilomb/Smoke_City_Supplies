import { z } from "zod";

// Sanitize string inputs to prevent XSS - basic HTML tag removal
export function sanitizeString(input: unknown): string {
  if (!input || typeof input !== "string") return "";
  // Remove HTML tags and trim
  return input.replace(/<[^>]*>/g, "").trim().slice(0, 10000);
}

// Sanitize email
export function sanitizeEmail(input: string | undefined | null): string {
  const sanitized = sanitizeString(input);
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) return "";
  return sanitized.toLowerCase();
}

// Sanitize URL
export function sanitizeUrl(input: string | undefined | null): string {
  const sanitized = sanitizeString(input);
  try {
    const url = new URL(sanitized);
    // Only allow http/https
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

// Contact form schema — trim first so whitespace doesn't cause "Invalid form data"
export const contactFormSchema = z.object({
  name: z
    .string()
    .transform((s) => (s ?? "").trim())
    .pipe(z.string().min(1, "Name is required").max(100, "Name too long"))
    .transform(sanitizeString),
  email: z
    .string()
    .transform((s) => (s ?? "").trim().toLowerCase())
    .pipe(z.string().email("Invalid email"))
    .transform(sanitizeEmail),
  subject: z
    .string()
    .optional()
    .transform((val) => (val == null || val === "" ? undefined : sanitizeString(val).slice(0, 200))),
  partNumber: z
    .string()
    .optional()
    .transform((val) => (val == null || val === "" ? undefined : sanitizeString(val).slice(0, 100))),
  message: z
    .string()
    .transform((s) => (s ?? "").trim())
    .pipe(z.string().min(10, "Message must be at least 10 characters").max(5000, "Message too long"))
    .transform(sanitizeString),
});

// Admin reply to contact submission
export const contactReplySchema = z.object({
  replyBody: z.string().min(1, "Reply is required").max(10000, "Reply too long").transform(sanitizeString),
});

// Order status schema (legacy, single field)
export const orderStatusSchema = z.object({
  status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"], {
    errorMap: () => ({ message: "Invalid order status" }),
  }),
});

// Order patch schema for status + delivery tracking (all optional so PATCH can send only changed fields)
export const orderPatchSchema = z.object({
  status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]).optional(),
  trackingNumber: z.string().max(500).optional().nullable(),
  shippedAt: z.string().max(50).optional().nullable(),
  deliveredAt: z.string().max(50).optional().nullable(),
});

export const productQuantitySchema = z.object({
  quantity: z.number().int().min(0),
});

export const categoryPatchSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  icon: z.string().optional(),
  vehicleType: z.enum(["bike", "scooter", "all"]).optional(),
});

function sanitizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => sanitizeString(String(item))).filter(Boolean);
}

// Validate and sanitize product input (only include fields that are explicitly provided, for PATCH safety)
export function sanitizeProductInput(input: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (input.name !== undefined) result.name = sanitizeString(input.name);
  if (input.description !== undefined) result.description = sanitizeString(input.description);
  if (input.category !== undefined) result.category = sanitizeString(input.category);
  if (input.partNumber !== undefined) result.partNumber = input.partNumber != null ? sanitizeString(String(input.partNumber)) : undefined;
  if (input.subcategory !== undefined) result.subcategory = input.subcategory != null ? sanitizeString(String(input.subcategory)) : undefined;
  if (input.brand !== undefined) result.brand = input.brand != null ? sanitizeString(String(input.brand)) : undefined;
  if (input.vehicle !== undefined) result.vehicle = typeof input.vehicle === "string" ? sanitizeString(input.vehicle) : undefined;
  if (input.compatibility !== undefined) {
    result.compatibility = sanitizeStringArray(input.compatibility);
  }
  if (input.tags !== undefined) {
    result.tags = sanitizeStringArray(input.tags);
  }
  if (input.features !== undefined) {
    result.features = sanitizeStringArray(input.features);
  }
  if (input.seoTitle !== undefined) result.seoTitle = sanitizeString(input.seoTitle);
  if (input.seoDescription !== undefined) result.seoDescription = sanitizeString(input.seoDescription);
  if (input.seoSlug !== undefined) result.seoSlug = sanitizeString(input.seoSlug).toLowerCase().replace(/[^a-z0-9-]/g, "-");
  if (input.seoKeywords !== undefined) {
    result.seoKeywords = sanitizeStringArray(input.seoKeywords);
  }
  return result;
}

// Validate and sanitize category input
export function sanitizeCategoryInput(input: Record<string, unknown>) {
  return {
    name: sanitizeString(input.name),
    slug: sanitizeString(input.slug).toLowerCase().replace(/[^a-z0-9-]/g, "-"),
    icon: sanitizeString(input.icon),
    vehicleType: input.vehicleType === "bike" || input.vehicleType === "scooter" || input.vehicleType === "all"
      ? input.vehicleType
      : undefined,
  };
}
