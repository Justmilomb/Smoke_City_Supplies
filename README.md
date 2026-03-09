# Smoke City Supplies

Smoke City Supplies is an e-commerce site for motorcycle and scooter parts, built to support a real family-run bike shop with practical tools for day-to-day sales and operations.

## Project Story

Hey, I'm Milo. I built this website to help my grandad sell parts from his bike shop online.

At the same time, I was also building my social media giveaway tool, [Giveaway Engine](https://github.com/Justmilomb/Giveaway-Engine), so this project became a hands-on learning experience in parallel.

This site is less "vibe-coded" than my other project and not as visually polished, but it taught me a lot. My workflow was using Codex for smaller, focused tasks and Claude Code for larger chunks of work. The most rewarding part was vibe-coding this with my grandad while still trying to keep the site safe, reliable, and usable for a real business.

## Overview

The platform combines a customer-facing storefront with an admin panel for catalog and order management.

- Stripe checkout with webhook-confirmed payment state
- Product catalog with filtering and search
- Admin CRUD for products, orders, and categories
- Barcode-assisted inventory workflows (mobile-first)
- Invoice emailing and manual shipping label workflow
- Royal Mail manual shipping mode with fixed service rates
- SEO and feed endpoints (`sitemap.xml`, `robots.txt`, `llms.txt`, Google Merchant feed)
- Security middleware (headers, CSRF, rate limiting, input hardening)

## Tech Stack

- Frontend: React + Vite + TypeScript
- Backend: Express + TypeScript
- Database ORM: Drizzle
- Payments: Stripe
- Email: Resend
- Runtime: Node.js 20+

## Repository Layout

- `client/` - React application (Vite root)
- `server/` - Express API, auth, checkout, admin routes
- `shared/` - Shared TypeScript modules (including schema)
- `script/` - Build tooling
- `dist/` - Production build output (generated)
- `uploads/` - Local upload storage (ephemeral in many environments)
- `docs/ARCHITECTURE.md` - Request flow and codebase architecture

## Local Development

You can run locally without PostgreSQL. If `DATABASE_URL` is not set, the app uses in-memory storage and sessions.

### Quick Start (No Database)

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Port behavior:
- Local default: `3000`
- Replit default (when `REPL_ID` is present): `5000`
- Override: set `PORT`

Default local admin credentials:
- Username: `admin`
- Password: `admin`

### Optional: Run With Local PostgreSQL

```bash
npm install
npm run db:push
npm run dev
```

Required for this mode:
- `DATABASE_URL` (for example: `postgresql://user:pass@localhost:5432/smoke_city`)

Recommended:
- `SESSION_SECRET`
- `ADMIN_PASSWORD`

## Scripts

- `npm run dev` - Start dev server
- `npm run dev:client` - Start Vite client dev server on port `3000`
- `npm run build` - Build client and server into `dist/`
- `npm run start` - Run production server from `dist/index.cjs`
- `npm run check` - TypeScript check
- `npm run db:push` - Push Drizzle schema (skips if `DATABASE_URL` is not set)
- `npm run seed:parts` - Seed parts data

## Environment Variables

Core:
- `DATABASE_URL` - PostgreSQL connection string (optional locally, recommended for persistent production data)
- `SESSION_SECRET` - Session signing secret
- `ADMIN_PASSWORD` - Override default admin password
- `NODE_ENV` - `development` or `production`
- `PORT` - Server port (set externally on most platforms)
- `PUBLIC_BASE_URL` - Canonical public URL used for URL generation and SEO consistency

Payments:
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

Email and order ops:
- `RESEND_API_KEY`
- `INVOICE_FROM_EMAIL`
- `INVOICE_REPLY_TO`
- `ADMIN_ORDER_ALERT_EMAIL`

Shipping (Royal Mail manual mode):
- `ROYAL_MAIL_LABEL_URL`
- `ROYAL_MAIL_NEXT_DAY_GUARANTEED_PENCE`
- `ROYAL_MAIL_NEXT_DAY_AIM_PENCE`
- `SHIP_FROM_NAME`
- `SHIP_FROM_ADDRESS_LINE1`
- `SHIP_FROM_ADDRESS_LINE2`
- `SHIP_FROM_CITY`
- `SHIP_FROM_COUNTY`
- `SHIP_FROM_POSTCODE`
- `SHIP_FROM_COUNTRY`

Seeding:
- `SEED_PARTS_ON_STARTUP` - Use with care in production

## Checkout and Order Lifecycle

- Client creates checkout intent via `POST /api/checkout/prepare`
- Client fetches shipping options via `POST /api/shipping/rates`
- Stripe webhook `POST /api/stripe/webhook` is the source of truth for payment success/failure
- On successful payment: stock is deducted once, invoices and notifications are triggered
- Admin can resend invoices and generate shipping/packing documents from order actions

## SEO and Feeds

The app exposes:
- `GET /sitemap.xml`
- `GET /robots.txt`
- `GET /llms.txt`
- Google Merchant feed at `/uploads/google-merchant.xml`
- Fallback merchant endpoint at `/feeds/google-merchant.xml`

## Deployment (Render)

This repo includes `render.yaml` for Render deployment.

Typical commands:

```bash
npm install && npm run build && npm run db:push
npm run start
```

Notes:
- Server binds to `0.0.0.0` and uses `PORT`
- Without `DATABASE_URL`, production data is in-memory and resets on restart
- Uploaded assets and generated docs are stored and served by backend storage routes

## Additional Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Replit Notes](replit.md)
