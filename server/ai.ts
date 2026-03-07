import OpenAI from "openai";

export type AIProvider = "perplexity" | "nvidia";

export function getAIClient(): { client: OpenAI; model: string; provider: AIProvider } {
  const configuredProvider = process.env.AI_PROVIDER?.toLowerCase();
  const perplexityKey = process.env.PERPLEXITY_API_KEY;

  if (configuredProvider === "perplexity" || (!configuredProvider && perplexityKey)) {
    if (!perplexityKey) {
      throw new Error("PERPLEXITY_API_KEY not configured");
    }
    return {
      client: new OpenAI({
        baseURL: "https://api.perplexity.ai",
        apiKey: perplexityKey,
      }),
      model: "sonar",
      provider: "perplexity",
    };
  }

  const nvidiaKey = process.env.NVIDIA_API_KEY;
  if (!nvidiaKey) {
    throw new Error("No AI API key configured (set PERPLEXITY_API_KEY or NVIDIA_API_KEY)");
  }

  return {
    client: new OpenAI({
      baseURL: "https://integrate.api.nvidia.com/v1",
      apiKey: nvidiaKey,
    }),
    model: process.env.NVIDIA_SEO_MODEL || "deepseek-ai/deepseek-v3.1",
    provider: "nvidia",
  };
}

/** Dedicated NVIDIA client for bike input normalization (deterministic, temperature 0) */
export function getNvidiaClient(): { client: OpenAI; model: string } | null {
  const nvidiaKey = process.env.NVIDIA_API_KEY;
  if (!nvidiaKey) return null;
  return {
    client: new OpenAI({
      baseURL: "https://integrate.api.nvidia.com/v1",
      apiKey: nvidiaKey,
    }),
    model: process.env.NVIDIA_SEO_MODEL || "deepseek-ai/deepseek-v3.1",
  };
}

/** Dedicated Perplexity client for compatibility checking (web search enabled) */
export function getPerplexityClient(): { client: OpenAI; model: string } | null {
  const perplexityKey = process.env.PERPLEXITY_API_KEY;
  if (!perplexityKey) return null;
  return {
    client: new OpenAI({
      baseURL: "https://api.perplexity.ai",
      apiKey: perplexityKey,
    }),
    model: "sonar",
  };
}
