# Shipping

## Goal
Calculates UK shipping costs and provides manual Royal Mail label workflow for order fulfilment.

## Implementation
`server/shippingLogic.ts` packs items into parcels (weight/dimensions) and determines dispatch cutoff time. `server/shipping/royalMailManual.ts` applies fixed rate lookup (no live RM API) based on parcel weight bands. Three service tiers: Next Day Guaranteed, Next Day Aim, Tracked 48. Rates configured via env vars (`ROYAL_MAIL_*_PENCE`). Label creation links to Royal Mail Business Portal URL rather than API-generated labels.

## Key Code
```typescript
// Get rates for a basket
POST /api/shipping/rates  { items: CartItem[] }
// Returns: { services: [{ name, pricePence, estimatedDays }] }
```

## Notes
- Rates are manually maintained in env vars — update when Royal Mail changes prices.
- `ROYAL_MAIL_LABEL_URL` defaults to the RM Business Portal; admin opens it manually to print labels.
- Dispatch cutoff logic in `shippingLogic.ts` is UK business-hours-aware.
- UK-only — no international shipping logic exists.
