import type { ApiProduct, BikeFinderInput, BikeFinderResult } from "@shared/schema";
import { BIKE_DATA } from "@shared/bike-data";
import { getNvidiaClient, getPerplexityClient } from "./ai";
import { storage } from "./storage";

type NormalizedBike = {
  normalizedKey: string;
  displayName: string;
};

/** Normalize a string for fuzzy comparison: lowercase, strip spaces/hyphens/dots, remove trailing "cc" */
function normalizeBikeString(s: string): string {
  return s.toLowerCase().replace(/[-\s.]/g, "").replace(/cc$/, "");
}

/** Known makes extracted from BIKE_DATA for regex-based parsing */
const KNOWN_MAKES = BIKE_DATA.map((b) => b.make);

/** Parse free text into make/model/cc/year using regex when AI is unavailable */
function parseRawBikeText(text: string): { make?: string; model?: string; cc?: string; year?: string; displayName: string } {
  const cleaned = text.replace(/\s+/g, " ").trim();

  // Try to extract make by matching known makes
  let make: string | undefined;
  const textLower = cleaned.toLowerCase();
  for (const knownMake of KNOWN_MAKES) {
    if (textLower.startsWith(knownMake.toLowerCase())) {
      make = knownMake;
      break;
    }
    const normalized = normalizeBikeString(knownMake);
    if (normalizeBikeString(cleaned).startsWith(normalized)) {
      make = knownMake;
      break;
    }
  }

  // Extract year (4-digit number between 1970-2030)
  const yearMatch = cleaned.match(/\b(19[7-9]\d|20[0-3]\d)\b/);
  const year = yearMatch ? yearMatch[1] : undefined;

  // Extract CC (number followed by "cc")
  const ccMatch = cleaned.match(/\b(\d{2,4})\s*cc\b/i);
  const cc = ccMatch ? ccMatch[1] : undefined;

  // Model = remainder after removing make, year, cc
  let remainder = cleaned;
  if (make) {
    remainder = remainder.replace(new RegExp(`^${make.replace(/[-]/g, "[-\\s]?")}\\s*`, "i"), "");
  }
  if (year) remainder = remainder.replace(year, "").trim();
  if (ccMatch) remainder = remainder.replace(ccMatch[0], "").trim();
  const model = remainder.replace(/\s+/g, " ").trim() || undefined;

  const displayName = cleaned;
  return { make, model, cc, year, displayName };
}

/**
 * Step 1: Normalize bike input using NVIDIA AI (fix typos, standardize format).
 * Falls back to regex parsing if NVIDIA unavailable.
 */
export async function normalizeBikeInput(input: BikeFinderInput): Promise<NormalizedBike> {
  const rawText = input.freeText
    ? input.freeText.trim()
    : [input.make, input.model, input.cc ? `${input.cc}cc` : "", input.year].filter(Boolean).join(" ");

  // If structured input, build the key directly without AI
  if (input.make && input.model) {
    const parts = [input.make.trim(), input.model.trim()];
    if (input.cc) parts.push(`${input.cc}cc`);
    if (input.year) parts.push(input.year);
    const displayName = parts.join(" ");
    const normalizedKey = displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return { normalizedKey, displayName };
  }

  // For free text, try NVIDIA normalization with timeout
  const nvidia = getNvidiaClient();
  if (nvidia) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const completion = await nvidia.client.chat.completions.create({
        model: nvidia.model,
        messages: [
          {
            role: "system",
            content: `You normalize motorcycle/scooter names. Given user input (possibly with typos), return JSON: {"make":"...","model":"...","cc":"...","year":"...","displayName":"Make Model CCcc Year"}. Fill in what you can identify. If cc or year is unknown, omit those fields. Respond ONLY with valid JSON.`,
          },
          { role: "user", content: rawText },
        ],
        max_tokens: 150,
        temperature: 0,
        top_p: 0.7,
        signal: controller.signal,
      } as any);

      clearTimeout(timeout);

      const content = completion.choices?.[0]?.message?.content?.trim();
      if (content) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content) as {
          make?: string;
          model?: string;
          cc?: string;
          year?: string;
          displayName?: string;
        };
        const displayName =
          parsed.displayName ||
          [parsed.make, parsed.model, parsed.cc ? `${parsed.cc}cc` : "", parsed.year].filter(Boolean).join(" ");
        const normalizedKey = displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        return { normalizedKey, displayName };
      }
    } catch (err: any) {
      console.error("[bike-finder] NVIDIA normalization failed, using fallback:", err?.message || err);
    }
  }

  // Regex fallback: parse known makes, year, cc from text
  const parsed = parseRawBikeText(rawText);
  const displayName = parsed.displayName;
  const normalizedKey = displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return { normalizedKey, displayName };
}

/**
 * Step 2: Check compatibility — AI first, local word-overlap fallback.
 * Returns a flat list of compatible product IDs.
 */
export async function checkCompatibilityBatch(
  displayName: string,
  products: ApiProduct[]
): Promise<string[]> {
  const compatibleIds = new Set<string>();

  // Ask Perplexity: does each product work with this bike?
  const perplexity = getPerplexityClient();
  if (perplexity && products.length > 0) {
    try {
      const productList = products
        .map((p) => `${p.id}: ${p.name} (${p.category})`)
        .join("\n");

      const completion = await perplexity.client.chat.completions.create({
        model: perplexity.model,
        messages: [
          {
            role: "system",
            content: `You help match motorcycle parts to bikes. The user will give you a bike and a list of products from a store. For each product, decide: would this product work on / be useful for this bike? Search the web for the bike's specs if needed.

Say YES to:
- Parts that directly fit (correct oil weight, filter size, tyre size, etc.)
- Universal parts any bike can use (chain lube, brake fluid, tools, cleaning products, luggage, phone mounts, covers, locks, grips, etc.)
- Generic consumables (brake pads, oil filters, spark plugs) — these are generic fitments sold to suit many bikes

Only say NO if a part is clearly wrong for this bike (e.g. wrong tyre size, wrong battery voltage).

When in doubt, say YES.

Return ONLY a JSON array of the compatible product IDs. Example: ["id1","id2","id3"]`,
          },
          {
            role: "user",
            content: `Bike: ${displayName}\n\nProducts:\n${productList}`,
          },
        ],
        max_tokens: 4096,
        temperature: 0,
      } as any);

      const content = completion.choices?.[0]?.message?.content?.trim();
      console.log("[bike-finder] Perplexity response:", content?.substring(0, 300));
      if (content) {
        const arrayMatch = content.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          const aiIds: string[] = JSON.parse(arrayMatch[0]);
          const validProductIds = new Set(products.map((p) => p.id));
          for (const id of aiIds) {
            if (validProductIds.has(id)) {
              compatibleIds.add(id);
            }
          }
        }
      }

      return Array.from(compatibleIds);
    } catch (err: any) {
      console.error("[bike-finder] Perplexity failed, falling back to local matching:", err?.message || err);
    }
  }

  // Fallback when no AI available: include everything (better than showing nothing)
  for (const p of products) {
    compatibleIds.add(p.id);
  }

  return Array.from(compatibleIds);
}

/**
 * Main orchestrator: normalize → check cache → AI/local compatibility → done.
 */
export async function findPartsForBike(input: BikeFinderInput): Promise<BikeFinderResult> {
  // Step 1: Normalize
  const { normalizedKey, displayName } = await normalizeBikeInput(input);

  // Step 2: Check cache (gracefully skip if cache table doesn't exist)
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
      // Cache had no products (maybe stale), fall through to re-check
    }
  } catch (err) {
    console.error("[bike-finder] Cache read failed (table may not exist):", err);
  }

  // Step 3: Get all products and check compatibility
  const allProducts = await storage.listProducts();
  const compatibleIds = await checkCompatibilityBatch(displayName, allProducts);

  const productMap = new Map(allProducts.map((p) => [p.id, p]));
  const compatProducts = compatibleIds
    .map((id) => productMap.get(id))
    .filter((p): p is ApiProduct => !!p);

  // Only cache if we found results — don't cache empty results
  if (compatibleIds.length > 0) {
    try {
      await storage.setBikeCompatibilityCache({
        normalizedKey,
        displayName,
        compatibleProductIds: compatibleIds,
        totalProductsChecked: allProducts.length,
      });
    } catch (err) {
      console.error("[bike-finder] Cache write failed (table may not exist):", err);
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
