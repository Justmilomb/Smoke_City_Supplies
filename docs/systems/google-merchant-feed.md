# Google Merchant Feed

## Goal
Generates a Google Merchant Center XML product feed so products appear in Google Shopping results.

## Implementation
`server/googleMerchantFeed.ts` reads all active products from `storage` and renders a Google Merchant XML feed following the RSS 2.0 / Google product schema. Feed is served at `GET /api/google-merchant-feed.xml`. `PUBLIC_BASE_URL` env var is used to construct canonical product URLs and image URLs in the feed. Feed regenerates on each request (no caching).

## Key Code
```typescript
// Feed endpoint — no auth required (public for Google crawler)
GET /api/google-merchant-feed.xml
// Returns: application/xml with <rss> + <channel> + <item> per product
```

## Notes
- `PUBLIC_BASE_URL` must be set to the production domain for Google to resolve product links.
- Products with no image are included but may be rejected by Google Merchant Center.
- Feed is not paginated — suitable for catalogues up to ~several thousand SKUs.
- Submit the feed URL in Google Merchant Center → Feeds → Add feed.
