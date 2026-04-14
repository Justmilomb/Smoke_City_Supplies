# System Overview — Smoke City Supplies

## What It Does

E-commerce website for Smoke City Supplies vape shop. Customers browse products, add to cart, checkout with Stripe, get shipping via Royal Mail, receive invoices and email notifications.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, TailwindCSS |
| Backend | Express, Node.js |
| Database | PostgreSQL, Drizzle ORM |
| Payments | Stripe (PaymentIntent + webhook) |
| Email | Resend |
| Shipping | Royal Mail (manual rates) |
| Deployment | Render |

## Runtime Lifecycle

1. Express server starts, loads middleware and routes
2. Vite dev server attaches (development) or static files served (production)
3. Google Merchant feed scheduler runs periodically
4. Customer browses → adds to cart → checkout
5. Shipping rates calculated → Stripe PaymentIntent created
6. Stripe webhook confirms payment → stock decremented → invoice generated → emails sent

## Key Constraints

- Stripe webhook is authoritative for payment status (no client-side confirmation)
- `DATABASE_URL` controls Postgres vs in-memory mode
- Image uploads stored in PostgreSQL (not filesystem)
- Royal Mail rates are fixed/manual, not live API
