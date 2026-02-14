# Project Structure

## Top-Level

- `client/`: React + Vite frontend.
- `server/`: Express API, auth, Stripe, storage, security middleware.
- `shared/`: shared runtime and type schemas (Drizzle + Zod).
- `script/`: build script.
- `docs/`: architecture, security, maintainability, and release documentation.

## Frontend (`client/src`)

- `pages/`: route-level pages (`home`, `store`, `product`, `checkout`, `admin/*`).
- `components/site/`: storefront layout and domain-specific UI.
- `components/admin/`: admin shell, auth guard, admin image upload.
- `components/ui/`: reusable design-system components.
- `lib/`: API hooks, cart state, auth helpers, data mapping.
- `hooks/`: cross-page hooks (`use-page-meta`, mobile detection, toasts).

## Backend (`server`)

- `index.ts`: server bootstrap, middleware, sessions, route registration.
- `routes.ts`: HTTP endpoints and core request handling.
- `storage.ts`: persistence abstraction and DB/memory implementations.
- `validation.ts`: sanitization and Zod validation schemas.
- `auth.ts`: Passport local auth + `requireAuth` guard.
- `security.ts`, `rateLimit.ts`: security headers, CORS, and request limits.
- `shipping.ts`: shipping quote rules.
- `seo.ts`: product SEO generation (NVIDIA-backed with deterministic fallback).
- `email.ts`: SMTP contact notifications/replies.
- `db.ts`, `stripe.ts`: infrastructure clients.

## Shared (`shared`)

- `schema.ts`: canonical DB schema + shared API types.

## Naming Conventions

- Route files and utilities use lower-kebab or lower-camel naming consistently.
- React components use PascalCase file names.
- Shared types are colocated with schema definitions to reduce drift.

## Folder Hygiene Rules

- New product/business logic should go in `server/` modules, not in route handlers directly.
- Keep `client/components/ui` framework-like; app-specific UI belongs in `client/components/site` or `client/components/admin`.
- Add docs for any new integration under `docs/`.
