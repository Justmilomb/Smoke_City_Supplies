import type { InsertProduct } from "@shared/schema";

type SeoPayload = {
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  seoSlug?: string;
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function toSlug(value: string): string {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function buildFallbackSeo(product: InsertProduct): Required<SeoPayload> {
  const baseTitle = [product.brand, product.name, product.partNumber ? `(${product.partNumber})` : ""]
    .filter(Boolean)
    .join(" ");
  const title = normalizeWhitespace(`${baseTitle} | Smoke City Supplies`).slice(0, 70);
  const description = normalizeWhitespace(
    `${product.name} for ${product.vehicle}. ${product.description} Fast UK shipping, secure checkout, and expert support.`
  ).slice(0, 160);
  const keywords = Array.from(new Set([
    product.name,
    product.partNumber ?? "",
    product.brand ?? "",
    product.category,
    product.vehicle,
    ...(product.tags ?? []),
    "UK motorcycle parts",
    "bike parts UK",
  ].map((k) => normalizeWhitespace(k)).filter(Boolean))).slice(0, 12);

  return {
    seoTitle: title,
    seoDescription: description,
    seoKeywords: keywords,
    seoSlug: toSlug(`${product.name}-${product.partNumber ?? ""}`),
  };
}

function parseNvidiaResponse(raw: unknown): SeoPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const maybe = raw as Record<string, unknown>;
  const choices = maybe.choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const first = choices[0] as Record<string, unknown>;
  const message = first?.message as Record<string, unknown> | undefined;
  const content = typeof message?.content === "string" ? message.content : "";
  if (!content) return null;

  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(content.slice(start, end + 1)) as SeoPayload;
    return parsed;
  } catch {
    return null;
  }
}

export async function generateProductSeo(product: InsertProduct): Promise<Required<SeoPayload>> {
  const fallback = buildFallbackSeo(product);
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return fallback;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: process.env.NVIDIA_SEO_MODEL ?? "moonshotai/kimi-k2.5",
        messages: [
          {
            role: "system",
            content: "You generate concise ecommerce SEO metadata in strict JSON only.",
          },
          {
            role: "user",
            content: JSON.stringify({
              task: "Generate SEO metadata for a product page in UK English.",
              outputSchema: {
                seoTitle: "string <= 70 chars",
                seoDescription: "string <= 160 chars",
                seoKeywords: "string[] max 12",
                seoSlug: "kebab-case string",
              },
              product,
            }),
          },
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 600,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) return fallback;
    const data = (await response.json()) as unknown;
    const parsed = parseNvidiaResponse(data);
    if (!parsed) return fallback;

    return {
      seoTitle: normalizeWhitespace(parsed.seoTitle ?? fallback.seoTitle).slice(0, 70),
      seoDescription: normalizeWhitespace(parsed.seoDescription ?? fallback.seoDescription).slice(0, 160),
      seoKeywords: (parsed.seoKeywords ?? fallback.seoKeywords)
        .map((k) => normalizeWhitespace(String(k)))
        .filter(Boolean)
        .slice(0, 12),
      seoSlug: toSlug(parsed.seoSlug ?? fallback.seoSlug),
    };
  } catch {
    return fallback;
  }
}
