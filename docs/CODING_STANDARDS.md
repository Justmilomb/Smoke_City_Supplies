# Coding Standards — Smoke City Supplies

## Naming

| Element | Convention | Example |
|---------|-----------|---------|
| Types / Interfaces | PascalCase, no `I` prefix | `OrderItem`, `ShippingRate` |
| Functions / variables | camelCase | `calculateShipping`, `totalPence` |
| Constants | UPPER_SNAKE or camelCase | `MAX_WEIGHT_G`, `defaultTimeout` |
| Booleans | `is`/`has` prefix | `isPaid`, `hasStock` |
| Components | PascalCase file matching export | `ProductCard.tsx` → `ProductCard` |
| React hooks | `use` prefix, camelCase | `useCart`, `useProductQuery` |

## TypeScript

- Strict mode enabled (`tsconfig.json`). All source files `.ts` / `.tsx`.
- No `any`, no `@ts-ignore`.
- Run `npm run check` after every TypeScript change — must pass 0 errors.
- Types over interfaces where possible. No `I` prefix on interfaces.

## Imports

- Client: use path aliases (`@/` → `client/src/`, `@shared/` → `shared/`, `@assets/` → `attached_assets/`)
- Server: use relative imports
- No barrel exports (`index.ts`) except at genuine package boundaries

## Components

- React functional components + hooks only. No class components.
- TailwindCSS utility classes only. No CSS-in-JS, no `.css` files.
- Co-locate small helpers with the component that uses them.

## Database

- Drizzle ORM. Schema in `shared/schema.ts` — single source of truth.
- `server/storage.ts` is the only layer that queries the DB directly.
- Always run `npm run db:push` after schema changes.
- Update seed scripts (`server/seed*.ts`) if schema changes affect them.

## API

- All Express route handlers in `server/routes.ts`.
- All endpoints return JSON.
- Stripe webhook handler is authoritative for payment status — never override client-side.
- Validate incoming request bodies with Zod schemas from `shared/schema.ts`.

## Environment Variables

- Never access `process.env.X` inline in business logic — use validated config.
- `DATABASE_URL` controls Postgres vs in-memory mode.
- All keys documented in `.env.example` and `README.md`.

## Comments

- Comments explain *why*, never *what*. If removing it wouldn't confuse a future reader, don't write it.
- No TODO/FIXME in code — track in `docs/CURRENT_TASKS.md`.
- No commented-out code — delete it; git has the history.

## Error Handling

- Validate at system boundaries (user input, external APIs). Trust internal code.
- Never swallow errors silently. At minimum, log with context.
- Include actionable detail: not just "failed" but *what* failed and *why*.
- Fail loudly at startup for missing env vars — don't defer to call time.

## File Size

- Leaf modules: aim for under ~400 lines.
- Hub files (`routes.ts`, `storage.ts`, `schema.ts`) may exceed this — they wire concerns by design.
