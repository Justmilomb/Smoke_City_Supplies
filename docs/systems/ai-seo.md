# AI & SEO

## Goal
Generates AI-assisted SEO metadata (titles, descriptions, tags) for products using pluggable AI providers.

## Implementation
`server/ai.ts` selects between Perplexity and NVIDIA providers based on the `AI_PROVIDER` env var. Both providers implement the same interface. `server/seo.ts` calls the selected provider with product data and returns structured SEO metadata. Serper API (`SERPER_API_KEY`) used for optional SERP research to ground suggestions. Admin triggers generation via the product management UI.

## Key Code
```typescript
// AI provider selection
const provider = getAIProvider(); // reads AI_PROVIDER env var
const seo = await generateSEO(product, provider);
// Returns: { title, description, keywords, metaTags }
```

## Notes
- `AI_PROVIDER=perplexity` (default) uses `PERPLEXITY_API_KEY`.
- `AI_PROVIDER=nvidia` uses `NVIDIA_API_KEY` + `NVIDIA_SEO_MODEL` (default: `deepseek-ai/deepseek-v3.1`).
- Serper is optional — SEO generation works without it, just less grounded.
- Generated SEO is a suggestion only — admin reviews before saving to the product.
