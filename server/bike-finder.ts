import type { ApiProduct, BikeFinderInput, BikeFinderResult } from "@shared/schema";
import { BIKE_DATA } from "@shared/bike-data";
import { getNvidiaClient, getPerplexityClient } from "./ai";
import { storage } from "./storage";

type NormalizedBike = {
  normalizedKey: string;
  displayName: string;
};

const KNOWN_MAKES = BIKE_DATA.map((b) => b.make);

function parseRawBikeText(text: string): { displayName: string } {
  return { displayName: text.replace(/\s+/g, " ").trim() };
}

export async function normalizeBikeInput(input: BikeFinderInput): Promise<NormalizedBike> {
  const rawText = input.freeText
    ? input.freeText.trim()
    : [input.make, input.model, input.cc ? `${input.cc}cc` : "", input.year].filter(Boolean).join(" ");

  if (input.make && input.model) {
    const parts = [input.make.trim(), input.model.trim()];
    if (input.cc) parts.push(`${input.cc}cc`);
    if (input.year) parts.push(input.year);
    const displayName = parts.join(" ");
    const normalizedKey = displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return { normalizedKey, displayName };
  }

  const nvidia = getNvidiaClient();
  if (nvidia) {
    try {
      const completion = await nvidia.client.chat.completions.create({
        model: nvidia.model,
        messages: [
          {
            role: "system",
            content: `You normalize motorcycle/scooter names. Given user input (possibly with typos), return JSON: {"displayName":"Make Model"}. Do NOT add cc or year unless the user typed it. Respond ONLY with valid JSON.`,
          },
          { role: "user", content: rawText },
        ],
        max_tokens: 150,
        temperature: 0,
        top_p: 0.7,
      } as any);

      const content = completion.choices?.[0]?.message?.content?.trim();
      if (content) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content) as { displayName?: string };
        const displayName = parsed.displayName || rawText;
        const normalizedKey = displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        return { normalizedKey, displayName };
      }
    } catch (err: any) {
      console.error("[bike-finder] NVIDIA normalization failed:", err?.message || err);
    }
  }

  const { displayName } = parseRawBikeText(rawText);
  const normalizedKey = displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return { normalizedKey, displayName };
}

// ── Product Classification ───────────────────────────────────────────────

/**
 * Categories of products that are universal — they fit any motorcycle.
 * These skip the API compatibility check entirely.
 */
const UNIVERSAL_KEYWORDS = [
  "chain lube", "chain cleaner", "brake fluid", "brake cleaner",
  "cable tie", "zip tie", "tool", "toolkit", "wrench", "socket",
  "phone mount", "phone holder", "gps mount",
  "cover", "motorcycle cover", "bike cover",
  "cleaning", "polish", "wax", "shampoo",
  "luggage", "pannier", "top box", "tank bag", "saddle bag",
  "grip", "handlebar grip", "bar end",
  "lock", "disc lock", "chain lock", "padlock",
  "visor", "helmet",
  "glove", "jacket", "boot",
  "first aid", "puncture repair", "tyre repair",
  "usb charger", "voltmeter",
];

/**
 * Categories that require strict spec-based compatibility checking.
 * These are the ones most likely to be wrong size / wrong fit.
 */
const STRICT_CATEGORIES = [
  "spark plug", "spark plugs",
  "battery", "batteries",
  "tyre", "tire", "tyres", "tires",
  "brake pad", "brake pads", "brake disc", "brake rotor",
  "oil filter", "air filter", "fuel filter",
  "chain", "sprocket", "chain and sprocket",
  "clutch", "clutch plate", "clutch cable",
  "throttle cable", "brake cable",
  "mirror", "indicator", "headlight", "bulb",
  "gasket", "seal", "bearing",
  "piston", "piston ring", "valve",
  "fairing", "bodywork", "panel",
  "seat", "footpeg", "foot peg",
  "exhaust", "silencer", "muffler",
  "radiator", "coolant hose",
  "shock", "fork", "suspension",
  "wheel", "rim",
  "windscreen", "windshield",
  "lever", "brake lever", "clutch lever",
];

function isUniversalProduct(product: ApiProduct): boolean {
  const hay = `${product.name} ${product.category} ${(product.tags ?? []).join(" ")}`.toLowerCase();
  return UNIVERSAL_KEYWORDS.some((kw) => hay.includes(kw));
}

function needsStrictCheck(product: ApiProduct): boolean {
  const hay = `${product.name} ${product.category}`.toLowerCase();
  return STRICT_CATEGORIES.some((kw) => hay.includes(kw));
}

/**
 * Build a detailed product description line for the API, including
 * all available specs so the API can make an informed decision.
 */
function buildProductLine(product: ApiProduct): string {
  const parts: string[] = [
    `[${product.id}] ${product.name}`,
    product.brand ? `Brand: ${product.brand}` : null,
    `Category: ${product.category}`,
    product.partNumber ? `Part#: ${product.partNumber}` : null,
  ].filter((s): s is string => !!s);

  // Include specs if available (thread size, heat range, dimensions, etc.)
  if (product.specs && product.specs.length > 0) {
    const specStr = product.specs
      .filter((s) => s.label && s.value)
      .map((s) => `${s.label}: ${s.value}`)
      .join(", ");
    if (specStr) parts.push(`Specs: ${specStr}`);
  }

  // Include compatibility list if available
  if (product.compatibility && product.compatibility.length > 0) {
    parts.push(`Listed compatible with: ${product.compatibility.join(", ")}`);
  }

  return parts.join(" | ");
}

// ── Compatibility Check via API ──────────────────────────────────────────

type CompatResult = {
  id: string;
  compatible: boolean;
  reason: string;
};

async function checkBatchStrict(
  bike: string,
  batch: ApiProduct[],
  perplexity: { client: any; model: string },
): Promise<CompatResult[]> {
  const productLines = batch.map((p) => buildProductLine(p)).join("\n");

  const completion = await perplexity.client.chat.completions.create({
    model: perplexity.model,
    messages: [
      {
        role: "system",
        content: `You are a motorcycle parts compatibility expert. You MUST verify each product against the specific bike using real technical specifications.

RULES — follow these strictly:
1. Search the web for the bike's actual specifications (engine type, displacement, tyre sizes, battery spec, spark plug spec, brake pad type, chain size, oil spec, etc.)
2. For EACH product, check if its specifications ACTUALLY MATCH the bike. Do not guess.
3. A product is compatible ONLY if:
   - Its specs (size, thread, fitment, dimensions) match the bike's requirements, OR
   - The product's own compatibility list includes this bike or its engine/frame family, OR
   - Web results explicitly confirm this product fits this bike
4. A product is NOT compatible if:
   - It's a bike-specific part (spark plug, filter, brake pad, tyre, chain, etc.) and you cannot confirm it fits
   - The specs don't match (wrong size, wrong thread, wrong heat range, wrong dimensions)
   - It's designed for a different engine type, frame, or wheel size
5. When UNSURE about a bike-specific part, mark it as NOT compatible. Do NOT default to "yes" for fitment parts.
6. Universal accessories (tools, cleaning products, luggage, phone mounts, covers, locks, riding gear) should already be filtered out — but if any appear, mark them compatible.

Return a JSON array of objects. For EVERY product in the list, include:
{"id": "product_id", "compatible": true/false, "reason": "brief technical explanation"}

Example:
[
  {"id": "p_abc", "compatible": true, "reason": "NGK LMAR8D-J matches OEM spec for BMW R1250GS: 14mm thread, 19mm reach, heat range 8"},
  {"id": "p_def", "compatible": false, "reason": "NGK DR8ES-L has 12mm thread, bike requires 14mm thread spark plug"}
]

Return ONLY the JSON array, no other text.`,
      },
      {
        role: "user",
        content: `Bike: ${bike}\n\nProducts to check:\n${productLines}`,
      },
    ],
    max_tokens: 2048,
    temperature: 0,
  } as any);

  const content = completion.choices?.[0]?.message?.content?.trim();
  if (!content) return [];

  const arrayMatch = content.match(/\[[\s\S]*\]/);
  if (!arrayMatch) return [];

  try {
    const results: CompatResult[] = JSON.parse(arrayMatch[0]);
    const validIds = new Set(batch.map((p) => p.id));
    return results.filter((r) => validIds.has(r.id));
  } catch {
    return [];
  }
}

const BATCH_SIZE = 8; // Slightly smaller batches for more thorough checking

export async function checkCompatibilityBatch(
  displayName: string,
  products: ApiProduct[],
): Promise<string[]> {
  if (products.length === 0) return [];

  // Step 1: Separate universal products (skip API) from bike-specific ones
  const universalIds: string[] = [];
  const needsCheck: ApiProduct[] = [];

  for (const product of products) {
    if (isUniversalProduct(product)) {
      universalIds.push(product.id);
    } else {
      needsCheck.push(product);
    }
  }

  console.log(`[bike-finder] ${universalIds.length} universal, ${needsCheck.length} need compatibility check`);

  // Step 2: Check if any products list this bike in their compatibility field
  const bikeNameLower = displayName.toLowerCase();
  const bikeWords = bikeNameLower.split(/\s+/).filter((w) => w.length > 1);
  const preMatchedIds: string[] = [];
  const stillNeedsCheck: ApiProduct[] = [];

  for (const product of needsCheck) {
    const compatList = (product.compatibility ?? []).map((c) => c.toLowerCase());
    // Check if the bike name (or key parts of it) appear in the compatibility list
    const matchesCompat = compatList.some((c) => {
      return bikeWords.length >= 2 && bikeWords.every((w) => c.includes(w));
    });

    if (matchesCompat) {
      preMatchedIds.push(product.id);
      console.log(`[bike-finder] Pre-matched by compatibility list: ${product.name}`);
    } else {
      stillNeedsCheck.push(product);
    }
  }

  // Step 3: Send remaining products to Perplexity for strict checking
  const perplexity = getPerplexityClient();
  if (!perplexity) {
    console.log("[bike-finder] No Perplexity key — returning universal + pre-matched only");
    return [...universalIds, ...preMatchedIds];
  }

  const apiMatchedIds: string[] = [];

  for (let i = 0; i < stillNeedsCheck.length; i += BATCH_SIZE) {
    const batch = stillNeedsCheck.slice(i, i + BATCH_SIZE);
    try {
      const results = await checkBatchStrict(displayName, batch, perplexity);
      const compatible = results.filter((r) => r.compatible);
      const incompatible = results.filter((r) => !r.compatible);

      for (const r of compatible) {
        console.log(`[bike-finder]   YES ${r.id}: ${r.reason}`);
      }
      for (const r of incompatible) {
        console.log(`[bike-finder]   NO  ${r.id}: ${r.reason}`);
      }

      console.log(`[bike-finder] Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${compatible.length}/${batch.length} compatible`);
      apiMatchedIds.push(...compatible.map((r) => r.id));
    } catch (err: any) {
      console.error(`[bike-finder] Batch failed:`, err?.message || err);
      // On error, do NOT include all — only include universal parts
      // This prevents false positives from error fallbacks
    }
  }

  return [...universalIds, ...preMatchedIds, ...apiMatchedIds];
}

export async function findPartsForBike(input: BikeFinderInput): Promise<BikeFinderResult> {
  const { normalizedKey, displayName } = await normalizeBikeInput(input);

  // Check cache
  try {
    const cached = await storage.getBikeCompatibilityCache(normalizedKey);
    if (cached) {
      const allProducts = await storage.listProducts();
      const productMap = new Map(allProducts.map((p) => [p.id, p]));
      const compatProducts = cached.compatibleProductIds
        .map((id) => productMap.get(id))
        .filter((p): p is ApiProduct => !!p);

      if (compatProducts.length > 0) {
        return {
          normalizedBike: normalizedKey,
          displayName: cached.displayName,
          fromCache: true,
          categories: groupByCategory(compatProducts),
          totalCompatible: compatProducts.length,
        };
      }
    }
  } catch (err) {
    console.error("[bike-finder] Cache read failed:", err);
  }

  const allProducts = await storage.listProducts();
  const compatibleIds = await checkCompatibilityBatch(displayName, allProducts);

  const productMap = new Map(allProducts.map((p) => [p.id, p]));
  const compatProducts = compatibleIds
    .map((id) => productMap.get(id))
    .filter((p): p is ApiProduct => !!p);

  if (compatibleIds.length > 0) {
    try {
      await storage.setBikeCompatibilityCache({
        normalizedKey,
        displayName,
        compatibleProductIds: compatibleIds,
        totalProductsChecked: allProducts.length,
      });
    } catch (err) {
      console.error("[bike-finder] Cache write failed:", err);
    }
  }

  return {
    normalizedBike: normalizedKey,
    displayName,
    fromCache: false,
    categories: groupByCategory(compatProducts),
    totalCompatible: compatProducts.length,
  };
}

function groupByCategory(products: ApiProduct[]): BikeFinderResult["categories"] {
  const map = new Map<string, ApiProduct[]>();
  for (const p of products) {
    const cat = p.category || "Other";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(p);
  }
  return Array.from(map.entries())
    .map(([name, prods]) => ({ name, products: prods }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
