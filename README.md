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

## Google Merchant File Feed (Automatic Updates)

Use Merchant Center's **Add products from a file** and provide this feed URL:

- `https://<your-domain>/feeds/google-merchant.xml`
- Local test URL: `http://localhost:3000/feeds/google-merchant.xml`

Recommended Merchant Center setup:
1. Products -> Data sources -> **Add products from file**
2. Choose **Enter a link to your file**
3. Paste your feed URL
4. Set schedule to **every 24 hours at 00:00**

The feed is generated from live product data. Any product create/update/delete in admin appears in the feed automatically on the next fetch.
