# Smoke City Supplies

E-commerce site for motorcycle and scooter parts, run by Karl. Bringing back old-fashioned service with real human care and expertise.

## Features

- **Stripe Payment Integration** - Secure checkout with credit/debit cards
- **Webhook-Confirmed Orders** - Orders are finalized by Stripe webhooks for safer stock handling
- **Product Catalog** - Comprehensive filtering and search
- **Admin Panel** - Full CRUD for products, orders, categories
- **Barcode Inventory Tools** - Admin can link/scan barcodes for stock-in workflows (mobile-first)
- **Invoice + Shipping Ops** - Automatic invoice email pipeline and manual Shippo label generation
- **Security** - Rate limiting, input sanitization, CSRF protection
- **Brand Story** - Personal touch throughout the customer journey

## Local development (Mac)

You can run the app locally **without** PostgreSQL. The server uses in-memory storage and in-memory sessions when `DATABASE_URL` is not set.

**Quick start (no database):**

```bash
npm install
npm run dev
```

Then open **http://localhost:3000** in your browser. The dev server serves both the API and the frontend with hot reload.

- **Port:** 3000 by default locally. If the port is in use, run `PORT=3001 npm run dev` (or another free port).
- **Replit:** defaults to port 5000 (Replit sets `REPL_ID`).
- **Admin login:** username `admin`, password `admin` (change in production)
- **Data:** In-memory (resets when you stop the server). Set `DATABASE_URL` if you want a local PostgreSQL database.
- **Seed behavior:** In development, startup seeding runs automatically to ensure sample catalog data exists.

**With a local PostgreSQL database (optional):**

1. Set `DATABASE_URL` (e.g. `postgresql://user:pass@localhost:5432/smoke_city`) and optionally `SESSION_SECRET`, `ADMIN_PASSWORD`.
2. `npm install && npm run db:push && npm run dev`

## Render Deployment

This project is configured for deployment on Render.

### Quick Deploy

1. Push this repository to GitHub
2. In Render dashboard, create a new **Web Service**
3. Connect your GitHub repository
4. Render will detect `render.yaml` and configure automatically

### Manual Configuration (if not using render.yaml)

**Build Command:**
```bash
npm install && npm run build && npm run db:push
```

**Start Command:**
```bash
npm run start
```

**Environment Variables:**
- `DATABASE_URL` - Optional for temporary/free deployments. Recommended for persistent PostgreSQL storage.
- `SESSION_SECRET` - Generate with: `openssl rand -base64 32`
- `NODE_ENV` - Set to `production` (auto-set by Render)
- `ADMIN_PASSWORD` - (Optional) Override default admin password
- `SEED_PARTS_ON_STARTUP` - Optional. Set to `true` only if you want to auto-seed products on every boot
- `STRIPE_SECRET_KEY` - Your Stripe secret key (required for payments)
- `STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key (required for payments)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret (required for payment confirmation)
- `RESEND_API_KEY` - API key for invoice emails (optional locally, recommended production)
- `INVOICE_FROM_EMAIL` - Sender address for invoices (e.g. billing@yourdomain.com)
- `INVOICE_REPLY_TO` - Reply address customers use when replying to invoice emails (defaults to `smokecitycycles@gmail.com`)
- `SHIPPO_API_KEY` - Shippo API token for label generation
- `SHIP_FROM_NAME` - Sender name for shipping labels
- `SHIP_FROM_ADDRESS_LINE1` - Sender street for shipping labels
- `SHIP_FROM_CITY` - Sender city for shipping labels
- `SHIP_FROM_POSTCODE` - Sender postcode for shipping labels
- `SHIP_FROM_COUNTRY` - Sender country code (default `GB`)
- `PUBLIC_BASE_URL` - Public site URL used when generating product links in the Merchant feed file

**PostgreSQL Database:**
- Create a PostgreSQL database in Render
- The connection string will be automatically set as `DATABASE_URL`
- SSL is automatically configured for production

**Important Notes:**
- The server binds to `0.0.0.0` and uses the `PORT` environment variable (set by Render)
- If `DATABASE_URL` is not set, the app uses in-memory storage in production. Admin/products/orders will reset on restart/redeploy.
- Product auto-seeding is disabled by default in production. Use `SEED_PARTS_ON_STARTUP=true` only when you intentionally want to seed.
- Uploaded images/invoices/labels are stored in PostgreSQL and served via `/api/files/:id`.

## Scripts

- `npm run dev` — development server (port 3000)
- `npm run build` — build client and server
- `npm run start` — production server
- `npm run db:push` — push schema to database (skips if DATABASE_URL not set)

## Checkout + Order Lifecycle

- Frontend calls `POST /api/checkout/prepare` to create the pending order + Stripe PaymentIntent.
- Stripe webhook `POST /api/stripe/webhook` is the source of truth for marking payment success/failure.
- On `payment_intent.succeeded`, stock is deducted once, and invoice dispatch is triggered.
- Admin order actions include:
  - resend invoice (`/api/admin/orders/:id/invoice/resend`)
  - generate shipping label via Shippo (`/api/admin/orders/:id/shipping-label`)

## Google Merchant File Feed (Automatic Updates)

Use Merchant Center's **Add products from a file** and provide this feed URL:

- `https://<your-domain>/uploads/google-merchant.xml`
- Local test URL: `http://localhost:3000/uploads/google-merchant.xml`

Recommended Merchant Center setup:
1. Products -> Data sources -> **Add products from file**
2. Choose **Enter a link to your file**
3. Paste your feed URL
4. Set schedule to **every 24 hours at 00:00**

How updates work:
- Feed file is written automatically at server startup.
- Feed file rewrites every 24 hours automatically.
- Feed file is also rewritten when admin creates/updates/deletes a product.
- Fallback live endpoint is available at `https://<your-domain>/feeds/google-merchant.xml`.

If your live feed has only a few products, your production database currently has only those products. Seeded demo products in this repo are not automatically enabled in production unless `SEED_PARTS_ON_STARTUP=true`.
