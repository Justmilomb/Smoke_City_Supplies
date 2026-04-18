# eBay Integration

## Goal
Lists Smoke City products on eBay via the eBay Trading API, keeping inventory in sync.

## Implementation
`server/ebay.ts` wraps the eBay REST/Trading API using OAuth refresh token flow. Credentials (`EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `EBAY_REFRESH_TOKEN`) exchanged for short-lived access tokens. Listings created with fixed category (`EBAY_CATEGORY_ID=6028`), and require pre-configured policy IDs for payment, returns, and fulfilment. Sandbox vs production controlled by `EBAY_ENVIRONMENT`. Webhook verification uses `EBAY_VERIFICATION_TOKEN`.

## Key Code
```typescript
// Admin triggers listing from product page
POST /api/admin/products/:id/ebay/list
// Syncs stock level to existing eBay listing
POST /api/admin/products/:id/ebay/sync-stock
```

## Notes
- All four policy IDs must be created in the eBay Seller Hub before listing works.
- `EBAY_RUNAME` is the OAuth redirect name registered in the eBay developer console.
- `EBAY_ENVIRONMENT=production` — change to `sandbox` for testing with test credentials.
- eBay listing does NOT auto-update when product price changes — must re-list manually.
