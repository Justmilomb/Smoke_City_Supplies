# Release Checklist

## Infrastructure

- Deploy via `render.yaml` (includes managed Render PostgreSQL).
- Confirm `DATABASE_URL` is attached from Render DB.
- Confirm health endpoint is green: `/health`.

## Environment Variables

- `SESSION_SECRET`
- `STRIPE_SECRET_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `WHATSAPP_NUMBER`
- `SUPPORT_PHONE`, `SUPPORT_EMAIL`
- `SMTP_*` values (optional if email remains disabled in UI)
- `NVIDIA_API_KEY` (optional; SEO fallback still works without it)

## Data and Schema

- Run `npm run db:push` on deploy.
- Verify admin login.
- Verify product create/edit/delete and quantity updates.

## Checkout and Orders

- Verify shipping quote endpoint: `POST /api/shipping/quote`.
- Verify Stripe amount includes shipping.
- Verify order total fields and stock deduction.

## SEO and Discovery

- Verify `sitemap.xml`.
- Verify `google-shopping.xml`.
- Confirm product pages render canonical, title, description, and JSON-LD.

## Contact Experience

- Verify direct WhatsApp button behavior.
- Verify real phone number links correctly on mobile.
- Confirm fake email is displayed as disabled if required by business policy.
