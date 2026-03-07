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

  // Try Perplexity AI first — send all products, let AI determine compatibility
  const perplexity = getPerplexityClient();
  if (perplexity && products.length > 0) {
    try {
      // Build a concise product list to stay within context limits
      const productList = products
        .map((p) => `- ID:${p.id} | ${p.name} | ${p.category}`)
        .join("\n");

      const completion = await perplexity.client.chat.completions.create({
        model: perplexity.model,
        messages: [
          {
            role: "system",
            content: `You are a motorcycle parts compatibility expert. Given a bike and a list of parts, determine which parts are compatible. Search the web for real compatibility data — look up the bike's specifications (engine oil type, oil filter, spark plug, chain size, brake pads, etc.) and match against the product list. Return ONLY a valid JSON array of compatible product IDs: ["id1","id2",...]. Include all parts that fit or are commonly used on this bike. For universal items like cleaning products, chain lube, or tools — include them. If you are unsure, include the product. Return an empty array [] only if genuinely nothing fits.`,
          },
          {
            role: "user",
            content: `Bike: ${displayName}\n\nProducts:\n${productList}\n\nWhich product IDs are compatible with this bike? Return JSON array only.`,
          },
        ],
        max_tokens: 2048,
        temperature: 0,
      } as any);

      const content = completion.choices?.[0]?.message?.content?.trim();
      console.log("[bike-finder] Perplexity response:", content);
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

      // Return AI results (even if empty — AI made a determination)
      return Array.from(compatibleIds);
    } catch (err) {
      console.error("[bike-finder] Perplexity compatibility check failed, falling back to local matching:", err);
    }
  }

  // Fallback: local word-overlap matching against product name, category, and compatibility field
  const bikeNorm = normalizeBikeString(displayName);
  const bikeLower = displayName.toLowerCase();
  const bikeWords = bikeLower.split(/\s+/).filter((w) => w.length > 1);

  for (const p of products) {
    // Check compatibility field
    if (p.compatibility?.length) {
      for (const c of p.compatibility) {
        const cNorm = normalizeBikeString(c);
        if (cNorm.includes(bikeNorm) || bikeNorm.includes(cNorm)) {
          compatibleIds.add(p.id);
          break;
        }
        const cLower = c.toLowerCase();
        const matched = bikeWords.filter((w) => cLower.includes(w));
        if (matched.length >= Math.min(2, bikeWords.length)) {
          compatibleIds.add(p.id);
          break;
        }
      }
    }

    // Also check product name for bike-specific references
    const nameLower = p.name.toLowerCase();
    const nameMatched = bikeWords.filter((w) => nameLower.includes(w));
    if (nameMatched.length >= Math.min(2, bikeWords.length)) {
      compatibleIds.add(p.id);
    }
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
