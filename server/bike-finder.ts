import type { ApiProduct, BikeFinderInput, BikeFinderResult } from "@shared/schema";
import { getNvidiaClient, getPerplexityClient } from "./ai";
import { storage } from "./storage";

type NormalizedBike = {
  normalizedKey: string;
  displayName: string;
};

/**
 * Step 1: Normalize bike input using NVIDIA AI (fix typos, standardize format).
 * Falls back to simple string normalization if NVIDIA unavailable.
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

  // For free text, try NVIDIA normalization
  const nvidia = getNvidiaClient();
  if (nvidia) {
    try {
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
      } as any);

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
    } catch (err) {
      console.error("[bike-finder] NVIDIA normalization failed, using fallback:", err);
    }
  }

  // Simple fallback: clean up whitespace and lowercase key
  const displayName = rawText.replace(/\s+/g, " ").trim();
  const normalizedKey = displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return { normalizedKey, displayName };
}

/**
 * Step 2: Check compatibility of all products against a bike using Perplexity (web search).
 * Falls back to matching existing `compatibility` fields if Perplexity unavailable.
 */
export async function checkCompatibilityBatch(
  displayName: string,
  products: ApiProduct[]
): Promise<string[]> {
  // First: match products that already list this bike in their compatibility field
  const bikeLower = displayName.toLowerCase();
  const bikeWords = bikeLower.split(/\s+/).filter((w) => w.length > 1);

  const localMatches = products.filter((p) =>
    p.compatibility?.some((c) => {
      const cLower = c.toLowerCase();
      // Check if most words from the bike name appear in the compatibility string
      const matched = bikeWords.filter((w) => cLower.includes(w));
      return matched.length >= Math.min(2, bikeWords.length);
    })
  );

  const localIds = new Set(localMatches.map((p) => p.id));

  // Try Perplexity for AI-powered compatibility check
  const perplexity = getPerplexityClient();
  if (perplexity && products.length > 0) {
    try {
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
      } as any);

      const content = completion.choices?.[0]?.message?.content?.trim();
      if (content) {
        const arrayMatch = content.match(/\[[\s\S]*\]/);
        const aiIds: string[] = JSON.parse(arrayMatch ? arrayMatch[0] : content);
        // Validate returned IDs exist in our product set
        const validProductIds = new Set(products.map((p) => p.id));
        for (const id of aiIds) {
          if (validProductIds.has(id)) {
            localIds.add(id);
          }
        }
      }
    } catch (err) {
      console.error("[bike-finder] Perplexity compatibility check failed, using local matches only:", err);
    }
  }

  return Array.from(localIds);
}

/**
 * Main orchestrator: normalize → check cache → check compatibility → cache → return grouped results.
 */
export async function findPartsForBike(input: BikeFinderInput): Promise<BikeFinderResult> {
  // Step 1: Normalize
  const { normalizedKey, displayName } = await normalizeBikeInput(input);

  // Step 2: Check cache
  const cached = await storage.getBikeCompatibilityCache(normalizedKey);
  if (cached) {
    const allProducts = await storage.listProducts();
    const productMap = new Map(allProducts.map((p) => [p.id, p]));
    const compatProducts = cached.compatibleProductIds
      .map((id) => productMap.get(id))
      .filter((p): p is ApiProduct => !!p);

    return {
      normalizedBike: normalizedKey,
      displayName: cached.displayName,
      fromCache: true,
      categories: groupByCategory(compatProducts),
      totalCompatible: compatProducts.length,
    };
  }

  // Step 3: Get all products and check compatibility
  const allProducts = await storage.listProducts();
  const compatibleIds = await checkCompatibilityBatch(displayName, allProducts);

  // Step 4: Cache the result
  await storage.setBikeCompatibilityCache({
    normalizedKey,
    displayName,
    compatibleProductIds: compatibleIds,
    totalProductsChecked: allProducts.length,
  });

  // Step 5: Group and return
  const productMap = new Map(allProducts.map((p) => [p.id, p]));
  const compatProducts = compatibleIds
    .map((id) => productMap.get(id))
    .filter((p): p is ApiProduct => !!p);

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
