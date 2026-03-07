import type { ApiProduct, BikeFinderInput, BikeFinderResult } from "@shared/schema";
import { BIKE_DATA } from "@shared/bike-data";
import { getNvidiaClient } from "./ai";
import { storage } from "./storage";

type NormalizedBike = {
  normalizedKey: string;
  displayName: string;
};

function normalizeBikeString(s: string): string {
  return s.toLowerCase().replace(/[-\s.]/g, "").replace(/cc$/, "");
}

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
 * Check each product against the bike using Serper (web search) + NVIDIA (reasoning).
 * For each product, search the web to see if it's compatible, then ask NVIDIA yes/no.
 */

async function serperSearch(query: string): Promise<string> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return "";

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: 3 }),
    });
    if (!res.ok) return "";
    const data = await res.json() as {
      organic?: Array<{ title?: string; snippet?: string }>;
      answerBox?: { answer?: string; snippet?: string };
    };

    const parts: string[] = [];
    if (data.answerBox?.answer) parts.push(data.answerBox.answer);
    if (data.answerBox?.snippet) parts.push(data.answerBox.snippet);
    for (const r of data.organic ?? []) {
      if (r.snippet) parts.push(r.snippet);
    }
    return parts.join(" ").substring(0, 1500);
  } catch {
    return "";
  }
}

async function isProductCompatible(
  bike: string,
  product: ApiProduct,
  nvidia: { client: any; model: string },
): Promise<boolean> {
  // Search: "Is [product] compatible with [bike]?"
  const searchQuery = `${product.name} ${product.brand || ""} compatible ${bike}`;
  const webData = await serperSearch(searchQuery);

  const completion = await nvidia.client.chat.completions.create({
    model: nvidia.model,
    messages: [
      {
        role: "system",
        content: `You decide if a motorcycle part is compatible with a bike. You will get the bike name, the product, and web search results. Answer ONLY "yes" or "no".

Say "yes" if:
- The web results confirm it fits this bike
- It's a universal part (chain lube, brake fluid, tools, grips, luggage, phone mounts, covers, cleaning products, etc.)
- It's a generic consumable that could reasonably fit (oil, brake pads, spark plugs, filters)
- You're not sure — default to "yes"

Say "no" ONLY if the web results clearly say it does NOT fit this bike.`,
      },
      {
        role: "user",
        content: `Bike: ${bike}\nProduct: ${product.name} (${product.category}, ${product.brand || "generic"})\n\nWeb search results:\n${webData || "No results found"}\n\nIs this product compatible? Answer yes or no only.`,
      },
    ],
    max_tokens: 10,
    temperature: 0,
  } as any);

  const answer = completion.choices?.[0]?.message?.content?.trim().toLowerCase() || "";
  return answer.startsWith("yes");
}

// Process products in batches to avoid hammering APIs
async function checkInBatches(
  bike: string,
  products: ApiProduct[],
  nvidia: { client: any; model: string },
  batchSize: number,
): Promise<string[]> {
  const compatibleIds: string[] = [];

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (p) => {
        try {
          const ok = await isProductCompatible(bike, p, nvidia);
          console.log(`[bike-finder] ${p.name} -> ${ok ? "YES" : "NO"}`);
          return ok ? p.id : null;
        } catch (err: any) {
          console.error(`[bike-finder] Error checking ${p.name}:`, err?.message);
          return p.id; // on error, include it
        }
      }),
    );
    for (const id of results) {
      if (id) compatibleIds.push(id);
    }
  }

  return compatibleIds;
}

export async function checkCompatibilityBatch(
  displayName: string,
  products: ApiProduct[],
): Promise<string[]> {
  if (products.length === 0) return [];

  const nvidia = getNvidiaClient();
  if (!nvidia || !process.env.SERPER_API_KEY) {
    console.log("[bike-finder] Missing SERPER_API_KEY or NVIDIA — returning all products");
    return products.map((p) => p.id);
  }

  return checkInBatches(displayName, products, nvidia, 5);
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
