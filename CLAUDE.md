# Smoke City Supplies

Full-stack e-commerce platform for motorcycle and scooter parts. React 19 + Express 5 + TypeScript + Drizzle ORM + PostgreSQL + Stripe + Resend. Built for a real family-run UK bike shop. Target runtime: Node 20+, deployed on Render.

## Rules

- Do not introduce new environment variables without adding them to both `.env.example` and the Configuration section of `README.md`.
- If you change the database schema in `shared/schema.ts`, verify that `npm run db:push` still works and consider whether seed scripts need updating (`server/seed*.ts`).
- Do not modify `package.json` scripts without updating `README.md`.
- Run `npm run check` (TypeScript) before considering any change complete.
- Prefer small, scoped changes. Do not refactor broadly unless explicitly asked.
- Never commit `.env`, credentials, or API keys.
- All prices are in GBP (pence internally, pounds in UI).
- UK-only shipping assumptions throughout.

## Reading Order (Cold Start)

1. This file (`CLAUDE.md`)
2. `README.md` — full project context, setup, architecture, configuration
3. `shared/schema.ts` — database schema and Zod validators
4. `server/routes.ts` — all API endpoints
5. `server/index.ts` — server bootstrap and middleware
6. `client/src/App.tsx` — frontend routing
7. `.env.example` — all configuration knobs

## Source of Truth

- `README.md` — setup, architecture, deployment, configuration
- `package.json` — scripts are authoritative
- `.env.example` — canonical list of all environment variables
- `shared/schema.ts` — database schema

If `README.md` and code disagree, code wins — but fix the README.

## Key Modules

- `server/routes.ts` — API route registration (main controller surface, ~1500 lines)
- `server/storage.ts` — data access layer (Postgres or in-memory fallback)
- `server/index.ts` — server bootstrap, sessions, security middleware
- `server/stripe.ts` — Stripe SDK init
- `server/email.ts` — transactional email via Resend (invoice, confirmation, shipped, admin alert)
- `server/invoice.ts` — invoice number generation + HTML/PDF rendering
- `server/shipping/royalMailManual.ts` — Royal Mail shipping rates and label flow
- `server/shippingLogic.ts` — parcel building, dispatch cutoff, packing slip HTML
- `server/ebay.ts` — eBay listing integration
- `server/ai.ts` — AI provider selection (Perplexity / NVIDIA)
- `server/seo.ts` — AI-assisted SEO generation
- `server/googleMerchantFeed.ts` — Google Merchant XML feed builder
- `server/auth.ts` — Passport local strategy
- `server/db.ts` — PostgreSQL connection pool
- `server/upload.ts` — image upload intake + validation
- `server/security.ts` — CORS + security headers
- `server/rateLimit.ts` — rate limiting middleware
- `shared/schema.ts` — Drizzle table definitions + Zod validation schemas
- `client/src/App.tsx` — frontend route definitions (Wouter)
- `client/src/lib/cart.tsx` — cart context + localStorage persistence

## Quick Commands

```
npm install          # install dependencies
npm run dev          # start dev server (port 3000)
npm run check        # TypeScript type check
npm run build        # production build to dist/
npm run start        # run production server from dist/index.cjs
npm run db:push      # push schema to database (requires DATABASE_URL)
npm run seed:parts   # seed product data
```

## Ports

- Local default: `3000`
- Replit (`REPL_ID` present): `5000`
- Production: `PORT` env var (set by platform)
