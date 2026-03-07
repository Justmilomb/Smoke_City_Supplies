import type { ApiProduct, BikeFinderInput, BikeFinderResult } from "@shared/schema";
import { BIKE_DATA } from "@shared/bike-data";
import { getNvidiaClient, getPerplexityClient } from "./ai";
import { storage } from "./storage";

type NormalizedBike = {
  normalizedKey: string;
  displayName: string;
  parsedMake?: string;
};

/** Normalize a string for fuzzy comparison: lowercase, strip spaces/hyphens/dots, remove trailing "cc" */
function normalizeBikeString(s: string): string {
  return s.toLowerCase().replace(/[-\s.]/g, "").replace(/cc$/, "");
}

/** Known makes extracted from BIKE_DATA for regex-based parsing */
const KNOWN_MAKES = BIKE_DATA.map((b) => b.make);

/** Categories/subcategories whose products work on any motorcycle */
const UNIVERSAL_CATEGORIES = [
  "Oils & Fluids",
  "Chain Maintenance",
  "Cleaning & Care",
  "Cleaning Products",
  "Lubricants",
  "Tools",
  "Accessories",
  "Riding Gear",
  "Security",
  "Storage",
];

const UNIVERSAL_SUBCATEGORIES = [
  "engine oil",
  "brake fluid",
  "chain lube",
  "chain cleaner",
  "chain kit",
  "coolant",
  "cleaning",
  "polish",
  "wax",
  "tyre",
  "tire",
  "puncture",
  "lock",
  "cover",
  "tool",
  "grease",
  "spray",
];

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
    // Also try with hyphen variations (e.g., "Harley Davidson" vs "Harley-Davidson")
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
    // Remove make from the beginning (case-insensitive)
    remainder = remainder.replace(new RegExp(`^${make.replace(/[-]/g, "[-\\s]?")}\\s*`, "i"), "");
  }
  if (year) remainder = remainder.replace(year, "").trim();
  if (ccMatch) remainder = remainder.replace(ccMatch[0], "").trim();
  const model = remainder.replace(/\s+/g, " ").trim() || undefined;

  const displayName = cleaned;
  return { make, model, cc, year, displayName };
}

/** Get products that work on any motorcycle */
function getUniversalProducts(products: ApiProduct[]): ApiProduct[] {
  return products.filter((p) => {
    const catLower = (p.category || "").toLowerCase();
    const subLower = (p.subcategory || "").toLowerCase();
    const nameLower = p.name.toLowerCase();

    if (UNIVERSAL_CATEGORIES.some((uc) => catLower === uc.toLowerCase())) return true;
    if (UNIVERSAL_SUBCATEGORIES.some((us) => subLower.includes(us) || nameLower.includes(us))) return true;
    // Products explicitly marked as universal
    if (p.compatibility?.some((c) => /universal|all\s*(bikes|motorcycles)/i.test(c))) return true;
    return false;
  });
}

/** Find suggested similar bikes from BIKE_DATA for a given make */
function getSuggestedBikes(make: string, limit = 5): string[] {
  const found = BIKE_DATA.find((b) => b.make.toLowerCase() === make.toLowerCase());
  if (!found) return [];
  return found.models.slice(0, limit).map((m) => `${found.make} ${m.model}`);
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
    return { normalizedKey, displayName, parsedMake: input.make.trim() };
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
        return { normalizedKey, displayName, parsedMake: parsed.make };
      }
    } catch (err) {
      console.error("[bike-finder] NVIDIA normalization failed, using fallback:", err);
    }
  }

  // Regex fallback: parse known makes, year, cc from text
  const parsed = parseRawBikeText(rawText);
  const displayName = parsed.displayName;
  const normalizedKey = displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return { normalizedKey, displayName, parsedMake: parsed.make };
}

/**
 * Step 2: Check compatibility with multi-tier matching.
 * Returns { exact, family, universal } product ID sets.
 */
export async function checkCompatibilityMultiTier(
  displayName: string,
  parsedMake: string | undefined,
  products: ApiProduct[]
): Promise<{ exactIds: string[]; familyIds: string[]; universalIds: string[] }> {
  const bikeNorm = normalizeBikeString(displayName);
  const bikeLower = displayName.toLowerCase();
  const bikeWords = bikeLower.split(/\s+/).filter((w) => w.length > 1);

  // Tier 1 - Exact: normalized comparison against compatibility field
  const exactIds = new Set<string>();
  for (const p of products) {
    if (!p.compatibility?.length) continue;
    for (const c of p.compatibility) {
      const cNorm = normalizeBikeString(c);
      // Normalized string contains the bike
      if (cNorm.includes(bikeNorm) || bikeNorm.includes(cNorm)) {
        exactIds.add(p.id);
        break;
      }
      // Word-overlap fallback (existing logic)
      const cLower = c.toLowerCase();
      const matched = bikeWords.filter((w) => cLower.includes(w));
      if (matched.length >= Math.min(2, bikeWords.length)) {
        exactIds.add(p.id);
        break;
      }
    }
  }

  // Try Perplexity for AI-powered compatibility check with timeout
  const perplexity = getPerplexityClient();
  if (perplexity && products.length > 0) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const productList = products
        .map((p) => `- ID:${p.id} | ${p.name} | ${p.category} | Compatible: ${(p.compatibility ?? []).join(", ") || "none listed"}`)
        .join("\n");

      const completion = await perplexity.client.chat.completions.create({
        model: perplexity.model,
        messages: [
          {
            role: "system",
            content: `You are a motorcycle parts compatibility expert. Given a bike and a list of parts, determine which parts are compatible. Search the web for real compatibility data. Return ONLY a JSON array of compatible product IDs: ["id1","id2",...]. If unsure about a part, DO NOT include it. Be conservative — only include parts you're confident fit.`,
          },
          {
            role: "user",
            content: `Bike: ${displayName}\n\nProducts:\n${productList}\n\nWhich product IDs are compatible with this bike? Return JSON array only.`,
          },
        ],
        max_tokens: 2048,
        temperature: 0,
        web_search_options: { search_context_size: "medium" },
        signal: controller.signal,
      } as any);

      clearTimeout(timeout);

      const content = completion.choices?.[0]?.message?.content?.trim();
      if (content) {
        const arrayMatch = content.match(/\[[\s\S]*\]/);
        const aiIds: string[] = JSON.parse(arrayMatch ? arrayMatch[0] : content);
        const validProductIds = new Set(products.map((p) => p.id));
        for (const id of aiIds) {
          if (validProductIds.has(id)) {
            exactIds.add(id);
          }
        }
      }
    } catch (err) {
      console.error("[bike-finder] Perplexity compatibility check failed, using local matches only:", err);
    }
  }

  // Tier 2 - Family: same make, different model (exclude already exact-matched)
  const familyIds = new Set<string>();
  if (parsedMake) {
    const makeNorm = normalizeBikeString(parsedMake);
    for (const p of products) {
      if (exactIds.has(p.id)) continue;
      if (p.compatibility?.some((c) => normalizeBikeString(c).includes(makeNorm))) {
        familyIds.add(p.id);
      }
    }
  }

  // Tier 3 - Universal: products that work on any bike
  const universalProducts = getUniversalProducts(products);
  const universalIds = universalProducts
    .filter((p) => !exactIds.has(p.id) && !familyIds.has(p.id))
    .map((p) => p.id);

  return {
    exactIds: Array.from(exactIds),
    familyIds: Array.from(familyIds),
    universalIds,
  };
}

/**
 * Main orchestrator: normalize → check cache → multi-tier compatibility → never return empty.
 */
export async function findPartsForBike(input: BikeFinderInput): Promise<BikeFinderResult> {
  // Step 1: Normalize
  const { normalizedKey, displayName, parsedMake } = await normalizeBikeInput(input);

  // Step 2: Check cache
  const cached = await storage.getBikeCompatibilityCache(normalizedKey);
  if (cached) {
    const allProducts = await storage.listProducts();
    const productMap = new Map(allProducts.map((p) => [p.id, p]));
    const compatProducts = cached.compatibleProductIds
      .map((id) => productMap.get(id))
      .filter((p): p is ApiProduct => !!p);

    // Even for cached results, ensure we never return empty
    if (compatProducts.length > 0) {
      return {
        normalizedBike: normalizedKey,
        displayName: cached.displayName,
        fromCache: true,
        matchLevel: "exact",
        categories: groupByCategory(compatProducts),
        totalCompatible: compatProducts.length,
      };
    }
    // Cache had no products (maybe products were deleted), fall through to re-check
  }

  // Step 3: Get all products and check compatibility with multi-tier matching
  const allProducts = await storage.listProducts();
  const { exactIds, familyIds, universalIds } = await checkCompatibilityMultiTier(displayName, parsedMake, allProducts);

  const productMap = new Map(allProducts.map((p) => [p.id, p]));

  // Determine match level and build result
  let matchLevel: BikeFinderResult["matchLevel"];
  let compatibleIds: string[];

  if (exactIds.length > 0) {
    matchLevel = "exact";
    compatibleIds = exactIds;
  } else if (familyIds.length > 0) {
    matchLevel = "family";
    compatibleIds = familyIds;
  } else if (universalIds.length > 0) {
    matchLevel = "universal";
    compatibleIds = [];
  } else {
    matchLevel = "none";
    compatibleIds = [];
  }

  // Cache the exact matches (not family/universal since those are dynamic)
  await storage.setBikeCompatibilityCache({
    normalizedKey,
    displayName,
    compatibleProductIds: exactIds,
    totalProductsChecked: allProducts.length,
  });

  const compatProducts = compatibleIds
    .map((id) => productMap.get(id))
    .filter((p): p is ApiProduct => !!p);

  // Build universal categories (always include for non-exact matches)
  const universalProducts = universalIds
    .map((id) => productMap.get(id))
    .filter((p): p is ApiProduct => !!p);
  const universalCategories = matchLevel !== "exact" ? groupByCategory(universalProducts) : undefined;

  // Suggested bikes from the same make
  const suggestedBikes = parsedMake ? getSuggestedBikes(parsedMake) : undefined;

  return {
    normalizedBike: normalizedKey,
    displayName,
    fromCache: false,
    matchLevel,
    categories: groupByCategory(compatProducts),
    totalCompatible: compatProducts.length,
    universalCategories: universalCategories?.length ? universalCategories : undefined,
    totalUniversal: universalProducts.length || undefined,
    suggestedBikes: suggestedBikes?.length ? suggestedBikes : undefined,
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
