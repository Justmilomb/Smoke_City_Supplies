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

/**
 * Check a small batch of products against a bike using Perplexity.
 * Perplexity searches the web for real compatibility data and returns which ones fit.
 */
async function checkBatch(
  bike: string,
  batch: ApiProduct[],
  perplexity: { client: any; model: string },
): Promise<string[]> {
  const productLines = batch
    .map((p, i) => `${i + 1}. [${p.id}] ${p.name} — ${p.brand || "generic"} (${p.category})`)
    .join("\n");

  const completion = await perplexity.client.chat.completions.create({
    model: perplexity.model,
    messages: [
      {
        role: "system",
        content: `You are a motorcycle parts compatibility checker. The user gives you a bike and a short list of products. For EACH product, search the web and decide: does this product work with this bike?

Answer "yes" if:
- Web results confirm it fits or is commonly used on this bike
- It's a universal part any motorcycle can use (chain lube, brake fluid, tools, grips, luggage, phone mounts, covers, cleaning products, cable ties, etc.)
- It's a generic consumable in the right category (e.g. organic brake pads fit most bikes, 10W-40 oil suits most engines, DOT 4 brake fluid is universal)
- You can't find evidence it DOESN'T fit — default to yes

Answer "no" ONLY if you find clear evidence it's incompatible (wrong tyre size, wrong battery spec, etc.)

Return ONLY a JSON array of the compatible product IDs. Example: ["abc123","def456"]`,
      },
      {
        role: "user",
        content: `Bike: ${bike}\n\nProducts to check:\n${productLines}\n\nWhich product IDs are compatible? JSON array only.`,
      },
    ],
    max_tokens: 1024,
    temperature: 0,
  } as any);

  const content = completion.choices?.[0]?.message?.content?.trim();
  if (!content) return [];

  const arrayMatch = content.match(/\[[\s\S]*\]/);
  if (!arrayMatch) return [];

  try {
    const ids: string[] = JSON.parse(arrayMatch[0]);
    const validIds = new Set(batch.map((p) => p.id));
    return ids.filter((id) => validIds.has(id));
  } catch {
    return [];
  }
}

const BATCH_SIZE = 10;

export async function checkCompatibilityBatch(
  displayName: string,
  products: ApiProduct[],
): Promise<string[]> {
  if (products.length === 0) return [];

  const perplexity = getPerplexityClient();
  if (!perplexity) {
    console.log("[bike-finder] No Perplexity key — returning all products");
    return products.map((p) => p.id);
  }

  const compatibleIds: string[] = [];

  // Split products into small batches so Perplexity can properly check each one
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    try {
      const ids = await checkBatch(displayName, batch, perplexity);
      console.log(`[bike-finder] Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${ids.length}/${batch.length} compatible`);
      compatibleIds.push(...ids);
    } catch (err: any) {
      console.error(`[bike-finder] Batch failed, including all:`, err?.message || err);
      // On error, include all from this batch rather than losing them
      compatibleIds.push(...batch.map((p) => p.id));
    }
  }

  return compatibleIds;
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
