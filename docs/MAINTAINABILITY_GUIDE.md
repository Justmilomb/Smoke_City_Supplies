# Maintainability Guide

## Coding Standards

- Keep route handlers thin; move reusable business logic into module files.
- Prefer explicit Zod schemas for every mutation endpoint.
- Keep sanitization functions centralized in `server/validation.ts`.
- Use shared types from `shared/schema.ts` to avoid frontend/backend mismatch.

## Comments

- Add comments only where behavior is non-obvious or security-critical.
- Avoid noisy comments that restate the code.

## File Organization

- UI primitives: `client/src/components/ui`.
- Storefront views/components: `client/src/pages` + `client/src/components/site`.
- Admin views/components: `client/src/pages/admin-*` + `client/src/components/admin`.
- Server domain helpers: split by concern (`shipping.ts`, `seo.ts`, `email.ts`, etc.).

## Data Flow Rules

- Server is source of truth for totals (price, shipping, payment amount).
- Client displays values from server responses; do not trust client-side totals for charging.
- Inventory updates are done in storage layer, not page code.

## Review Checklist

- Are new endpoints authenticated if they mutate admin data?
- Are all request bodies validated with Zod?
- Are user-provided strings sanitized before storage/use?
- Are external API failures handled with safe fallback behavior?
- Is new behavior documented in `docs/` and `README.md`?
