# Architecture

## Request Flow (Dev)

- `server/index.ts` creates the Express app, sessions, Passport, and registers API routes.
- In development, `server/vite.ts` mounts Vite in middleware mode and serves `client/index.html` for all non-API paths.
- In production, `server/static.ts` serves the built frontend from `dist/public`.

## Key Modules

- `server/index.ts`: server bootstrap, sessions, security middleware, and dev/prod wiring.
- `server/routes.ts`: API route registration (main router/controller surface).
- `server/invoice.ts`: invoice number generation + HTML/PDF rendering helpers.
- `server/email.ts`: transactional invoice email dispatch (Resend API).
- `server/shippo.ts`: shipping label creation integration.
- `server/googleMerchantFeed.ts`: Google Merchant XML feed builder + feed-file writer scheduler.
- `server/auth.ts`: Passport strategies and auth wiring.
- `server/db.ts`: database connection (`pool`), used to decide whether to use Postgres-backed sessions/storage.
- `server/storage.ts`: data access layer (uses DB when configured; otherwise in-memory).
- `server/upload.ts`: image upload pipeline (Cloudflare R2 when configured, local filesystem fallback at `/uploads`).
- `server/security.ts`: CORS + security headers.

## Frontend

- `client/` is the Vite root.
- `vite.config.ts` defines aliases:
  - `@` -> `client/src`
  - `@shared` -> `shared`
  - `@assets` -> `attached_assets`

## Build Output

- `npm run build` runs `script/build.ts`:
  - Vite build -> `dist/public`
  - esbuild bundles server -> `dist/index.cjs`
- `npm run start` runs `node dist/index.cjs`

## Data + Sessions

- If `DATABASE_URL` is set and `server/db.ts` creates a pool:
  - sessions use Postgres (`connect-pg-simple`)
  - storage is expected to use Postgres paths
- If not set:
  - sessions use an in-memory store (`memorystore`)
  - data is in-memory and resets when the process restarts

## Checkout and Payment Confirmation

- `POST /api/checkout/prepare` creates a pending order record plus Stripe PaymentIntent.
- `POST /api/stripe/webhook` is the authoritative payment status updater.
- On successful payment webhook:
  - order payment status is set to `paid`
  - stock is decremented idempotently
  - invoice metadata is stored and invoice email pipeline is triggered

## Inventory + Barcode Admin Flow

- Admin can resolve/link barcodes through:
  - `POST /api/admin/barcodes/resolve`
  - `POST /api/admin/barcodes/link`
- Stock-in via barcode:
  - `POST /api/admin/inventory/stock-in`
- Inventory audit events:
  - `GET /api/admin/inventory/transactions`

## Feed Endpoints

- `server/routes.ts` also exposes `GET /feeds/google-merchant.xml`.
- Merchant file path is `/uploads/google-merchant.xml`.
- The feed file is written on startup, every 24 hours, and after product mutations.
- `GET /feeds/google-merchant.xml` is kept as a live generated fallback endpoint.

## Upload Storage

- `POST /api/upload` accepts a single `image` file from authenticated admin users.
- If R2 env vars are configured, the server writes uploads to Cloudflare R2 and stores a public URL in product records.
- If R2 is not configured, uploads are written to local `UPLOADS_DIR` and served from `/uploads/*`.
