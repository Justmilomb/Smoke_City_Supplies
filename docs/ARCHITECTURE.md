# Architecture — Smoke City Supplies

## System Graph

```
Smoke City Supplies
  ├─ client/src/App.tsx              (frontend root, Wouter routing)     ← hub
  │   ├─ pages/                      (route page components)             ← leaf
  │   ├─ components/                 (reusable UI)                       ← leaf
  │   └─ lib/
  │       ├─ cart.tsx                (cart context + localStorage)       ← leaf
  │       └─ queryClient.ts          (TanStack Query config)             ← leaf
  │
  ├─ server/index.ts                 (Express bootstrap + middleware)     ← hub
  │   ├─ server/routes.ts            (all API endpoints, ~1500 lines)    ← hub
  │   ├─ server/storage.ts           (data access layer)                 ← hub
  │   │   └─ server/db.ts            (PostgreSQL connection pool)        ← leaf
  │   ├─ server/auth.ts              (Passport.js local strategy)        ← leaf
  │   ├─ server/stripe.ts            (Stripe SDK init)                   ← leaf
  │   ├─ server/email.ts             (Resend transactional email)        ← leaf
  │   ├─ server/invoice.ts           (invoice number + HTML/PDF)         ← leaf
  │   ├─ server/shippingLogic.ts     (parcel building, dispatch cutoff)  ← leaf
  │   │   └─ server/shipping/
  │   │       └─ royalMailManual.ts  (RM rates + label flow)             ← leaf
  │   ├─ server/ebay.ts              (eBay listing integration)          ← leaf
  │   ├─ server/ai.ts                (AI provider selection)             ← leaf
  │   ├─ server/seo.ts               (AI-assisted SEO generation)        ← leaf
  │   ├─ server/googleMerchantFeed.ts (Google Merchant XML feed)         ← leaf
  │   ├─ server/upload.ts            (image upload + validation)         ← leaf
  │   ├─ server/security.ts          (CORS + security headers)           ← leaf
  │   └─ server/rateLimit.ts         (rate limiting middleware)          ← leaf
  │
  └─ shared/schema.ts                (Drizzle table defs + Zod schemas)  ← hub
```

## Data Flow — Order Lifecycle

```
Customer → Cart (localStorage)
       → POST /api/checkout/prepare → [Order created, Stripe PaymentIntent]
       → Stripe Elements (client) → Stripe confirms payment
       → POST /api/stripe/webhook → [Stock decremented, Invoice generated, Emails sent]
       → Admin reviews order → marks shipped → Shipping email sent
```

## Subsystem Responsibilities

| System | Owns | Must NOT |
|--------|------|----------|
| `server/routes.ts` | HTTP endpoints, request validation, response shaping | Contain business logic — delegate to storage/services |
| `server/storage.ts` | All database reads/writes | Be bypassed — no direct DB calls in routes |
| `server/stripe.ts` | Stripe client init | Handle order state — webhook handler does that |
| `server/email.ts` | Send transactional emails via Resend | Know about order state — only receive data to send |
| `server/invoice.ts` | Invoice numbering, HTML/PDF render | Send emails — email.ts does that |
| `server/shippingLogic.ts` | Parcel packing, dispatch cutoff advice | Call Royal Mail API — rates are manual/fixed |
| `server/auth.ts` | Passport.js session strategy | Store passwords — bcrypt in storage.ts |
| `client/src/lib/cart.tsx` | Cart state + localStorage persistence | Talk to server — sync happens only at checkout |

## Key Types / Schemas

| Type | Location | Purpose |
|------|----------|---------|
| `products` | `shared/schema.ts` | Product catalogue rows |
| `orders` | `shared/schema.ts` | Order header (status, totals, customer) |
| `orderItems` | `shared/schema.ts` | Line items per order |
| `users` | `shared/schema.ts` | Admin user accounts |
| `sessions` | `shared/schema.ts` | Express session store (connect-pg-simple) |
| `InsertProduct` / `SelectProduct` | `shared/schema.ts` | Drizzle-inferred CRUD types |

## Phase Map

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Foundation — project setup, auth, data layer | Done |
| 2 | Core e-commerce — catalogue, cart, checkout, Stripe | Done |
| 3 | Operations — shipping, invoices, email, admin dashboard | Done |
| 4 | Integrations — eBay, Google Merchant, AI/SEO | Done |
| 5 | Quality & DevEx — CI/CD, automated tests, monitoring, docs | In Progress |
