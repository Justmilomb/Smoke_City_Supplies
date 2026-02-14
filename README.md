# Smoke City Supplies

E-commerce site for bike and scooter parts. Run from this directory.

## Local Development

You can run the app locally without PostgreSQL. The server uses in-memory storage and sessions when `DATABASE_URL` is not set.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

- Port: `3000` by default. Use `PORT=3001 npm run dev` if needed.
- Admin login: `admin` / `admin` (change in production).

To use PostgreSQL locally:

1. Set `DATABASE_URL` (example: `postgresql://user:pass@localhost:5432/smoke_city`) and optionally `SESSION_SECRET`, `ADMIN_PASSWORD`.
2. Run `npm install && npm run db:push && npm run dev`.

## Render Deployment

This project is configured for Render.

Build command:

```bash
npm install && npm run build && npm run db:push
```

Start command:

```bash
npm run start
```

### No Local PostgreSQL Required

You do not need to run PostgreSQL on your own PC 24/7.

- This project already provisions a managed Postgres database in `render.yaml`.
- Render hosts the database and app for you.
- Your laptop can be off and the site still works.

If you want better uptime/performance than free-tier sleep limits, use a paid Render plan or an external managed Postgres provider like Neon/Supabase.

## Environment Variables

- `DATABASE_URL`
- `SESSION_SECRET`
- `NODE_ENV`
- `ADMIN_PASSWORD`
- `STRIPE_SECRET_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `WHATSAPP_NUMBER` (digits only, example `447XXXXXXXXX`)
- `SUPPORT_EMAIL`, `SUPPORT_PHONE`
- `NVIDIA_API_KEY` (optional, enables AI product SEO generation)
- `NVIDIA_SEO_MODEL` (optional, defaults to `moonshotai/kimi-k2.5`)

## Release Endpoints

- `GET /sitemap.xml` dynamic sitemap
- `GET /google-shopping.xml` live Google Merchant feed
- `POST /api/shipping/quote` shipping quote calculator
- `POST /api/create-payment-intent` Stripe amount includes shipping
- `GET /api/config` public support channels for frontend

## Scripts

- `npm run dev` development server
- `npm run build` build client and server
- `npm run start` production server
- `npm run db:push` push schema to database

## Documentation

- `docs/PROJECT_STRUCTURE.md`
- `docs/SECURITY_AND_VALIDATION.md`
- `docs/MAINTAINABILITY_GUIDE.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/AUDIT_SCOPE.md`
- `docs/SEO_STRATEGY.md`

## Security Note

Never commit API keys to source control. If a key was exposed, rotate it immediately and move it to environment variables.
