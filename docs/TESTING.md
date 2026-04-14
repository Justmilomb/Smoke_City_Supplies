# Testing — Smoke City Supplies

## Current State

**No automated test framework configured.** This is a known gap.

## Available Checks

```bash
npm run check    # TypeScript compiler (tsc --noEmit)
```

## Smoke Test Checklist

- [ ] `npm run dev` starts without errors
- [ ] Home page loads at localhost:3000
- [ ] Product catalogue displays correctly
- [ ] Add to cart works
- [ ] Checkout flow completes (Stripe test mode)
- [ ] Shipping rate calculation returns results
- [ ] Order confirmation email sends
- [ ] Invoice generates correctly
- [ ] Admin functions work (if applicable)
- [ ] Google Merchant feed generates valid XML
