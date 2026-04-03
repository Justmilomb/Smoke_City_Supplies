# Smoke City Supplies

An e-commerce platform for motorcycle and scooter parts, built to support a real family-run bike shop with practical tools for day-to-day sales and operations. The site combines a customer-facing storefront with a full admin panel for catalog management, order processing, inventory tracking, and shipping.

## Overview

- Stripe checkout with webhook-confirmed payment state
- Product catalog with filtering, search, and category browsing
- Admin CRUD for products, orders, and categories
- Barcode-assisted inventory workflows (mobile-first scanning)
- Invoice emailing and manual shipping label workflow
- Royal Mail manual shipping mode with fixed service rates
- AI-powered bike finder for part compatibility lookups
- eBay listing sync (optional)
- SEO and feed endpoints (sitemap, robots, llms.txt, Google Merchant feed)
- Security middleware (headers, CSRF, rate limiting, input hardening)
- Works without a database for local development (in-memory fallback)

## Tech Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS, Radix/Shadcn UI
- **Backend**: Express 5, TypeScript, Passport.js (session auth)
- **Database**: PostgreSQL with Drizzle ORM (optional locally)
- **Payments**: Stripe (Elements + webhooks)
- **Email**: Resend (transactional)
- **State**: React Query (server state), React Context (cart, auth)
- **Routing**: Wouter (client), Express (server)
- **Runtime**: Node.js 20+

## Project Structure

```
client/                  React application (Vite root)
  src/
    pages/               Route-based page components
    components/site/     Public-facing components
    components/admin/    Admin panel components
    components/ui/       Radix/Shadcn UI primitives
    hooks/               Custom React hooks
    lib/                 Client utilities, queries, context
server/                  Express API and business logic
  shipping/              Shipping provider modules
shared/                  Shared TypeScript modules
  schema.ts              Drizzle table definitions + Zod validators
script/                  Build tooling
dist/                    Production build output (generated)
uploads/                 Local upload storage (ephemeral)
migrations/              Drizzle migration files (generated)
attached_assets/         Brand assets (logo, favicon)
```

## Quick Start

### No Database (Default)

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The app uses in-memory storage and sessions when `DATABASE_URL` is not set.

Default admin credentials:
- Username: `admin`
- Password: `admin`

### With PostgreSQL

```bash
npm install
npm run db:push
npm run dev
```

Requires `DATABASE_URL` (e.g. `postgresql://user:pass@localhost:5432/smoke_city`).

Recommended: also set `SESSION_SECRET` and `ADMIN_PASSWORD`.

## Scripts

- `npm run dev` — start dev server (Vite HMR + Express)
- `npm run dev:client` — start Vite client dev server on port 3000
- `npm run build` — build client and server into `dist/`
- `npm run start` — run production server from `dist/index.cjs`
- `npm run check` — TypeScript type check
- `npm run db:push` — push Drizzle schema (skips if `DATABASE_URL` is not set)
- `npm run seed:parts` — seed product data

## Configuration

All environment variables are defined in `.env.example`. Copy it to `.env` and fill in what you need.

### Core

- `NODE_ENV` — `development` or `production`
- `PORT` — server port (set externally on most platforms)
- `DATABASE_URL` — PostgreSQL connection string (optional locally)
- `SESSION_SECRET` — session signing secret
- `ADMIN_PASSWORD` — override default admin password
- `PUBLIC_BASE_URL` — canonical public URL for SEO and feed links

### Payments (Stripe)

- `STRIPE_SECRET_KEY` — Stripe secret key (`sk_test_` or `sk_live_`)
- `STRIPE_PUBLISHABLE_KEY` — Stripe publishable key (`pk_test_` or `pk_live_`)
- `STRIPE_WEBHOOK_SECRET` — webhook signing secret (`whsec_`)

### Email and Notifications

- `RESEND_API_KEY` — Resend API key for transactional emails
- `INVOICE_FROM_EMAIL` — invoice sender email
- `INVOICE_REPLY_TO` — invoice reply-to email
- `ADMIN_ORDER_ALERT_EMAIL` — admin alert recipient for new paid orders

### Shipping (Royal Mail)

- `ROYAL_MAIL_LABEL_URL` — Royal Mail label portal URL
- `ROYAL_MAIL_NEXT_DAY_GUARANTEED_PENCE` — Next Day Guaranteed price in pence (default 1000)
- `ROYAL_MAIL_NEXT_DAY_AIM_PENCE` — Next Day Aim price in pence (default 500)
- `ROYAL_MAIL_TRACKED_48_PENCE` — Tracked 48 price in pence (default 400)
- `SHIP_FROM_NAME` — sender name for labels
- `SHIP_FROM_ADDRESS_LINE1` — sender address line 1
- `SHIP_FROM_ADDRESS_LINE2` — sender address line 2
- `SHIP_FROM_CITY` — sender city
- `SHIP_FROM_COUNTY` — sender county
- `SHIP_FROM_POSTCODE` — sender postcode
- `SHIP_FROM_COUNTRY` — sender country code (default `GB`)

### Contact and Support

- `WHATSAPP_NUMBER` — WhatsApp contact number
- `SUPPORT_EMAIL` — support email address
- `SUPPORT_PHONE` — support phone number

### AI / SEO

- `AI_PROVIDER` — AI provider selection (`perplexity` or `nvidia`)
- `PERPLEXITY_API_KEY` — Perplexity API key
- `NVIDIA_API_KEY` — NVIDIA API key
- `NVIDIA_SEO_MODEL` — NVIDIA model for SEO generation (default `deepseek-ai/deepseek-v3.1`)
- `SERPER_API_KEY` — Serper API key for search data

### eBay Integration

- `EBAY_CLIENT_ID` — eBay app client ID
- `EBAY_CLIENT_SECRET` — eBay app client secret
- `EBAY_REFRESH_TOKEN` — eBay OAuth refresh token
- `EBAY_ENVIRONMENT` — `sandbox` or `production`
- `EBAY_CATEGORY_ID` — default eBay listing category (default `6028`)
- `EBAY_PAYMENT_POLICY_ID` — eBay payment policy ID
- `EBAY_RETURN_POLICY_ID` — eBay return policy ID
- `EBAY_FULFILLMENT_POLICY_ID` — eBay fulfillment policy ID
- `EBAY_VERIFICATION_TOKEN` — eBay notification verification token

### Seeding

- `SEED_PARTS_ON_STARTUP` — auto-seed products on startup (use with care in production)

## Architecture

### Request Flow

In development, `server/index.ts` creates the Express app with sessions, Passport, and API routes. `server/vite.ts` mounts Vite in middleware mode and serves `client/index.html` for all non-API paths. In production, `server/static.ts` serves the built frontend from `dist/public`.

### Key Server Modules

- `server/index.ts` — server bootstrap, sessions, security middleware, dev/prod wiring
- `server/routes.ts` — API route registration (main controller surface)
- `server/storage.ts` — data access layer (Postgres when configured, otherwise in-memory)
- `server/invoice.ts` — invoice number generation + HTML/PDF rendering
- `server/email.ts` — transactional email dispatch via Resend
- `server/shipping/royalMailManual.ts` — Royal Mail shipping rates + manual label flow
- `server/shippingLogic.ts` — parcel building, dispatch cutoff, packing slip HTML
- `server/googleMerchantFeed.ts` — Google Merchant XML feed builder + scheduler
- `server/auth.ts` — Passport strategies
- `server/db.ts` — PostgreSQL connection pool
- `server/upload.ts` — image upload intake + validation (stored in PostgreSQL)
- `server/security.ts` — CORS + security headers

### Frontend

`client/` is the Vite root. Path aliases defined in `vite.config.ts`:
- `@` -> `client/src`
- `@shared` -> `shared`
- `@assets` -> `attached_assets`

### Build Output

`npm run build` runs `script/build.ts`:
1. Vite builds the frontend -> `dist/public`
2. esbuild bundles the server -> `dist/index.cjs`

`npm run start` runs `node dist/index.cjs`.

### Data and Sessions

When `DATABASE_URL` is set:
- Sessions use PostgreSQL (`connect-pg-simple`)
- Storage uses Drizzle ORM with PostgreSQL

When `DATABASE_URL` is not set:
- Sessions use an in-memory store (`memorystore`)
- Data is in-memory and resets on process restart

### Upload Storage

`POST /api/upload` accepts image files from authenticated admin users. Binaries are saved in PostgreSQL (`stored_files` table) and served via `/api/files/:id`. Product and order records reference file IDs.

## Checkout and Payment Pipeline

### Order Lifecycle

1. Client calls `POST /api/shipping/rates` to quote UK shipping options
2. Client calls `POST /api/checkout/prepare` to create a pending order + Stripe PaymentIntent
3. Client renders Stripe Elements payment form
4. Stripe webhook `POST /api/stripe/webhook` confirms payment
5. On success: order status set to `paid`, stock decremented idempotently, invoice and confirmation emails sent, admin alert dispatched

Admin can resend invoices and generate shipping/packing documents from order actions.

### Stripe Configuration

1. Get API keys from the Stripe Dashboard:
   - Test: `https://dashboard.stripe.com/test/apikeys`
   - Live: `https://dashboard.stripe.com/apikeys`
2. Set `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` in your environment
3. Set up a webhook endpoint at `https://your-domain/api/stripe/webhook`
4. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
5. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

For local webhook testing, use the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### Test Cards

- Success: `4242 4242 4242 4242`
- Declined: `4000 0000 0000 0002`
- Requires auth: `4000 0025 0000 3155`

Use any future expiry, any CVC, any postal code.

## SEO and Feeds

- `GET /sitemap.xml` — dynamic sitemap
- `GET /robots.txt` — robots directives
- `GET /llms.txt` — LLM-readable site info
- `GET /feeds/google-merchant.xml` — live generated fallback
- `/uploads/google-merchant.xml` — file-based feed (auto-rewritten daily and after product mutations)

## Deployment

### Render

The repo includes `render.yaml` for Render deployment. It provisions a web service and PostgreSQL database.

```bash
npm install && npm run build && npm run db:push
npm run start
```

The server binds to `0.0.0.0` and reads `PORT` from the environment. Without `DATABASE_URL`, production data is in-memory and resets on restart.

### Pre-Launch Checklist

- [ ] `DATABASE_URL` configured (Render PostgreSQL)
- [ ] `SESSION_SECRET` generated (`openssl rand -base64 32`)
- [ ] `ADMIN_PASSWORD` set (not the default)
- [ ] Stripe live keys set (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`)
- [ ] Stripe webhook endpoint configured with `STRIPE_WEBHOOK_SECRET`
- [ ] `RESEND_API_KEY` set for transactional emails
- [ ] Privacy policy and terms reviewed
- [ ] Contact information verified
- [ ] Test order placed end-to-end
- [ ] Mobile responsiveness checked

### Troubleshooting

**Payments not working**: Check Stripe Dashboard logs. Verify live keys (not test). Confirm webhook endpoint is configured and `STRIPE_WEBHOOK_SECRET` is set.

**Site not loading**: Check Render logs. Verify environment variables. Confirm database connection. Review recent deploys.

**Admin login failing**: Verify `ADMIN_PASSWORD` is set. Username is `admin` (lowercase). Check Render logs for auth errors.

**Database DNS error (`getaddrinfo ENOTFOUND`)**: Render free-tier PostgreSQL databases expire after 90 days. Create a new database and re-link it to the web service. If running locally, unset `DATABASE_URL` to use in-memory mode.

## Extending the Platform

- **New API routes**: add to `server/routes.ts`
- **New pages**: add to `client/src/pages/` and register in `client/src/App.tsx`
- **Schema changes**: modify `shared/schema.ts`, run `npm run db:push`, update seed scripts if needed
- **New environment variables**: add to `.env.example` and document in the Configuration section above

See `CLAUDE.md` for AI development tool configuration.
