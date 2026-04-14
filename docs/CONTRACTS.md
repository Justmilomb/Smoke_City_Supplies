# Contracts — Smoke City Supplies

## Client ↔ Server API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/shipping/rates` | Get live UK shipping quotes |
| POST | `/api/checkout/prepare` | Create pending order + Stripe PaymentIntent |
| POST | `/api/stripe/webhook` | Stripe payment status webhook |
| GET/POST | `/api/products/*` | Product CRUD |
| GET/POST | `/api/orders/*` | Order management |
| GET/POST | `/api/auth/*` | Authentication (Passport.js) |

## Server ↔ Database (Drizzle)

- Schema defined in `shared/schema.ts`
- Storage layer in `server/storage.ts` abstracts Postgres vs in-memory
- Migrations via `npm run db:push` (drizzle-kit)
- If `DATABASE_URL` set → Postgres; otherwise in-memory (resets on restart)

## Server ↔ Stripe

- PaymentIntent created during `POST /api/checkout/prepare`
- Webhook at `POST /api/stripe/webhook` is authoritative for payment status
- Webhook handler: sets order as paid, decrements stock, triggers invoice + email pipeline

## Server ↔ Email (Resend)

- `server/email.ts` dispatches via Resend API
- Triggered by: order confirmation, invoice, shipped notification, admin alerts

## Server ↔ Royal Mail

- `server/shipping/royalMailManual.ts` — fixed rate lookup + manual label draft
- `server/shippingLogic.ts` — parcel building, dispatch cutoff advice

## Invariants

- Stripe webhook is the single source of truth for payment status
- Stock is only decremented after confirmed payment (webhook handler)
- Invoice numbers are sequential and never reused (`server/invoice.ts`)
