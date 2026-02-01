import { z } from "zod";

// Sanitize string inputs to prevent XSS - basic HTML tag removal
export function sanitizeString(input: string | undefined | null): string {
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

// Contact form schema
export const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long").transform(sanitizeString),
  email: z.string().email("Invalid email").transform(sanitizeEmail),
  subject: z.string().max(200, "Subject too long").optional().transform((val) => sanitizeString(val ?? "")),
  partNumber: z.string().max(100, "Part number too long").optional().transform((val) => sanitizeString(val ?? "")),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000, "Message too long").transform(sanitizeString),
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

// Validate and sanitize product input (only include fields that are explicitly provided, for PATCH safety)
export function sanitizeProductInput(input: any): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (input.name !== undefined) result.name = sanitizeString(input.name);
  if (input.description !== undefined) result.description = sanitizeString(input.description);
  if (input.category !== undefined) result.category = sanitizeString(input.category);
  if (input.partNumber !== undefined) result.partNumber = input.partNumber != null ? sanitizeString(String(input.partNumber)) : undefined;
  if (input.subcategory !== undefined) result.subcategory = input.subcategory != null ? sanitizeString(String(input.subcategory)) : undefined;
  if (input.brand !== undefined) result.brand = input.brand != null ? sanitizeString(String(input.brand)) : undefined;
  if (input.vehicle !== undefined) result.vehicle = typeof input.vehicle === "string" ? sanitizeString(input.vehicle) : undefined;
  if (input.compatibility !== undefined) {
    result.compatibility = Array.isArray(input.compatibility)
      ? input.compatibility.map((c: any) => sanitizeString(c)).filter(Boolean)
      : [];
  }
  if (input.tags !== undefined) {
    result.tags = Array.isArray(input.tags)
      ? input.tags.map((t: any) => sanitizeString(t)).filter(Boolean)
      : [];
  }
  if (input.features !== undefined) {
    result.features = Array.isArray(input.features)
      ? input.features.map((f: any) => sanitizeString(f)).filter(Boolean)
      : undefined;
  }
  return result;
}

// Validate and sanitize category input
export function sanitizeCategoryInput(input: any) {
  return {
    name: sanitizeString(input.name),
    slug: sanitizeString(input.slug).toLowerCase().replace(/[^a-z0-9-]/g, "-"),
    icon: sanitizeString(input.icon),
    vehicleType: input.vehicleType === "bike" || input.vehicleType === "scooter" || input.vehicleType === "all"
      ? input.vehicleType
      : undefined,
  };
}
