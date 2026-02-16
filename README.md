# Smoke City Supplies

E-commerce site for motorcycle and scooter parts, run by Karl. Bringing back old-fashioned service with real human care and expertise.

## Features

- **Stripe Payment Integration** - Secure checkout with credit/debit cards
- **Product Catalog** - Comprehensive filtering and search
- **Admin Panel** - Full CRUD for products, orders, categories
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
- `UPLOADS_DIR` - Optional path for uploaded files. In production, set this to a persistent mount (for example a Render Disk path) to keep images across redeploys
- `STRIPE_SECRET_KEY` - Your Stripe secret key (required for payments)
- `STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key (required for payments)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret (for payment confirmations)
- `PUBLIC_BASE_URL` - Public site base URL (for SEO/canonical URLs and Merchant product links)
- `GOOGLE_MERCHANT_SYNC_ENABLED` - Set `true` to enable Merchant API sync scheduler
- `GOOGLE_MERCHANT_SYNC_INTERVAL_MINUTES` - Sync interval; default is `15`
- `GOOGLE_MERCHANT_ACCOUNT_ID` - Merchant Center account ID
- `GOOGLE_MERCHANT_DATASOURCE_NAME` - Full resource name, e.g. `accounts/123456789/dataSources/987654321`
- `GOOGLE_MERCHANT_CONTENT_LANGUAGE` - Feed language, default `en`
- `GOOGLE_MERCHANT_FEED_LABEL` - Feed label/target market, default `GB`
- `GOOGLE_MERCHANT_CURRENCY_CODE` - Feed currency, default `GBP`
- `GOOGLE_MERCHANT_SERVICE_ACCOUNT_EMAIL` - Google service account email with Merchant Center access
- `GOOGLE_MERCHANT_SERVICE_ACCOUNT_PRIVATE_KEY` - Service account private key (single env var, keep `\n` escapes)

**PostgreSQL Database:**
- Create a PostgreSQL database in Render
- The connection string will be automatically set as `DATABASE_URL`
- SSL is automatically configured for production

**Important Notes:**
- The server binds to `0.0.0.0` and uses the `PORT` environment variable (set by Render)
- If `DATABASE_URL` is not set, the app uses in-memory storage in production. Admin/products/orders will reset on restart/redeploy.
- Product auto-seeding is disabled by default in production. Use `SEED_PARTS_ON_STARTUP=true` only when you intentionally want to seed.
- Uploaded images are persisted only if `UPLOADS_DIR` points to persistent storage (for example Render Disk)
- For cloud-based persistence, consider Cloudinary or S3

## Scripts

- `npm run dev` — development server (port 3000)
- `npm run build` — build client and server
- `npm run start` — production server
- `npm run db:push` — push schema to database (skips if DATABASE_URL not set)

## Google Merchant API (15-minute sync)

1. In Merchant Center, go to **Products > Data sources > Add products using API**.
2. Set a clear data source name, for example: `Smoke City Supplies API`.
3. Save the data source, then copy its full resource name into `GOOGLE_MERCHANT_DATASOURCE_NAME`:
   - format: `accounts/<merchant-account-id>/dataSources/<data-source-id>`
4. Configure the Google Merchant env vars listed above.
5. Enable scheduler:
   - `GOOGLE_MERCHANT_SYNC_ENABLED=true`
   - `GOOGLE_MERCHANT_SYNC_INTERVAL_MINUTES=15`

Admin endpoints:
- `GET /api/integrations/google-merchant/status` - config/scheduler/sync status
- `POST /api/integrations/google-merchant/sync` - run an immediate manual sync
