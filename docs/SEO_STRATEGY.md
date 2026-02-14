# SEO Strategy

## Goals

- Keep metadata unique and relevant across all indexable pages.
- Adapt titles/descriptions to user intent (search/category/filter state).
- Keep canonical URLs stable to avoid duplicate-index signals.
- Mark non-index pages (`admin`, `checkout`, `cart`, `success`, `404`) as `noindex`.

## Implemented Rules

- Shared meta hook (`client/src/hooks/use-page-meta.ts`) now controls:
  - `title`, `description`
  - `keywords`
  - `canonical`
  - `robots` (`index,follow` or `noindex,nofollow`)
  - Open Graph baseline (`og:title`, `og:description`, `og:url`, `og:type`)

- Product pages:
  - Prefer generated SEO fields (`seoTitle`, `seoDescription`, `seoKeywords`).
  - Fallback to product content when AI SEO is unavailable.
  - Include Product JSON-LD.

- Store and Catalog pages:
  - Build adaptive metadata from active filters and search query.
  - Canonicalize only approved query keys.
  - Include CollectionPage + ItemList structured data on store page.

- Site-wide:
  - Dynamic sitemap from backend (`/sitemap.xml`).
  - Google Merchant feed (`/google-shopping.xml`) from live inventory.

## Content Quality Rules

- Title target: 50-70 chars.
- Description target: 120-160 chars.
- Use user-facing language and concrete product/category terms.
- Avoid keyword stuffing and duplicated page descriptions.

## Operational Checks

- Verify every public page has `usePageMeta`.
- Verify admin and transaction pages are `noindex`.
- Re-submit updated sitemap/feed after major catalog changes.
