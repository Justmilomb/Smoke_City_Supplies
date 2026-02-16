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
  subject: z.string().max(200, "Subject too long").optional().transform((val) => sanitizeString(val)),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000, "Message too long").transform(sanitizeString),
});

// Order status schema
export const orderStatusSchema = z.object({
  status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"], {
    errorMap: () => ({ message: "Invalid order status" }),
  }),
});

// Validate and sanitize product input
export function sanitizeProductInput(input: any) {
  return {
    name: sanitizeString(input.name),
    description: sanitizeString(input.description),
    category: sanitizeString(input.category),
    partNumber: input.partNumber != null ? sanitizeString(String(input.partNumber)) : undefined,
    subcategory: input.subcategory != null ? sanitizeString(String(input.subcategory)) : undefined,
    brand: input.brand != null ? sanitizeString(String(input.brand)) : undefined,
    barcode: input.barcode != null ? sanitizeString(String(input.barcode)) : undefined,
    barcodeFormat: input.barcodeFormat != null ? sanitizeString(String(input.barcodeFormat)) : undefined,
    vehicle: typeof input.vehicle === "string" ? sanitizeString(input.vehicle) : undefined,
    compatibility: Array.isArray(input.compatibility)
      ? input.compatibility.map((c: any) => sanitizeString(c)).filter(Boolean)
      : [],
    tags: Array.isArray(input.tags)
      ? input.tags.map((t: any) => sanitizeString(t)).filter(Boolean)
      : [],
    features: Array.isArray(input.features)
      ? input.features.map((f: any) => sanitizeString(f)).filter(Boolean)
      : undefined,
    shippingWeightGrams: typeof input.shippingWeightGrams === "number" ? Math.max(1, Math.round(input.shippingWeightGrams)) : undefined,
    shippingLengthCm: typeof input.shippingLengthCm === "number" ? Math.max(1, Math.round(input.shippingLengthCm)) : undefined,
    shippingWidthCm: typeof input.shippingWidthCm === "number" ? Math.max(1, Math.round(input.shippingWidthCm)) : undefined,
    shippingHeightCm: typeof input.shippingHeightCm === "number" ? Math.max(1, Math.round(input.shippingHeightCm)) : undefined,
  };
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
