# Coding Standards — Smoke City Supplies

## TypeScript

- **Strict mode** enabled. All source files use `.ts` / `.tsx`.
- **No `any`**, no `@ts-ignore`.
- Run `npm run check` after any TypeScript changes.

## Imports

- Client: use path aliases (`@/` → `client/src`, `@shared/` → `shared/`, `@assets/` → `attached_assets/`)
- Server: use relative imports

## Components

- React functional components only
- TailwindCSS utility classes for styling
- No separate CSS modules

## Database

- Drizzle ORM with PostgreSQL
- Schema in `shared/schema.ts`
- Always run `npm run db:push` after schema changes
- Update seed scripts if schema changes affect them

## API

- Express route handlers in `server/routes.ts`
- All endpoints return JSON
- Stripe webhook handler is authoritative for payment status

## Environment Variables

- Don't introduce new env vars without documenting in README.md
- `DATABASE_URL` controls Postgres vs in-memory mode
