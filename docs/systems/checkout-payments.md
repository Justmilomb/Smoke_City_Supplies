# Checkout & Payments

## Goal
Handles the full purchase flow: order creation, Stripe PaymentIntent, payment confirmation, and post-payment fulfilment triggers.

## Implementation
`POST /api/checkout/prepare` creates a pending order in the DB and returns a Stripe `clientSecret` for Elements. The client completes payment in-browser. Stripe calls `POST /api/stripe/webhook` on success — this is the authoritative confirmation event. The webhook handler decrements stock, marks the order paid, generates the invoice, and fires confirmation emails. CSRF token required for prepare endpoint. Stripe webhook verified with `STRIPE_WEBHOOK_SECRET`.

## Key Code
```typescript
// Checkout prepare — returns clientSecret
POST /api/checkout/prepare  { items, shipping, customer }

// Webhook — single source of truth for payment status
POST /api/stripe/webhook    Stripe-Signature header required
```

## Notes
- Never trust the client for payment confirmation — webhook only.
- Test mode: use Stripe test keys + test card `4242 4242 4242 4242`.
- If webhook fires before `prepare` response returns, order must already exist in DB.
- `STRIPE_PUBLISHABLE_KEY` is safe to expose to the client; `STRIPE_SECRET_KEY` is server-only.
