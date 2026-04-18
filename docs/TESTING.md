# Testing — Smoke City Supplies

## Build Verification

```bash
npm run check    # TypeScript compiler — must pass with 0 errors
npm run build    # Production build — must complete successfully
```

## Current Test Coverage

**No automated test framework configured.** This is a known gap (Phase 5 task). The TypeScript compiler (`npm run check`) is the primary automated quality gate.

Planned: Vitest for unit tests, supertest for API integration tests.

## Smoke Test Checklist

Run manually after any significant change or before deploying.

- [ ] `npm run dev` starts without errors on port 3000
- [ ] Home page loads at `localhost:3000`
- [ ] Product catalogue displays correctly
- [ ] Add to cart works; cart persists on page refresh
- [ ] Checkout flow completes end-to-end (Stripe test mode, card `4242 4242 4242 4242`)
- [ ] Shipping rate calculation returns results for a test basket
- [ ] Stripe webhook fires and marks order as paid (use Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`)
- [ ] Order confirmation email sends (check Resend dashboard)
- [ ] Invoice generates correctly and attaches to email
- [ ] Admin login works; admin functions are accessible
- [ ] Google Merchant feed at `/api/google-merchant-feed.xml` generates valid XML
- [ ] No error-level logs in server output during normal operation

## Regression Rule

Full smoke test required for changes to:
- `server/routes.ts`
- `server/storage.ts`
- `shared/schema.ts`
- `server/stripe.ts` / Stripe webhook handler
- `server/email.ts` / `server/invoice.ts`

## Log Patterns

- **Error (must fix before deploying):** `Error:`, `UnhandledPromiseRejection`, `ECONNREFUSED`
- **Warning (investigate):** `deprecated`, `DeprecationWarning`
- **Benign (expected):** `Vite dev server running`, `Server listening on port`
