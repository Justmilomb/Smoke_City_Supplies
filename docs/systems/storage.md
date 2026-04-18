# Storage

## Goal
Data access layer that abstracts PostgreSQL vs in-memory storage behind a single interface, allowing development without a live database.

## Implementation
`server/storage.ts` exports a `storage` object implementing the `IStorage` interface. If `DATABASE_URL` is set, it uses Drizzle ORM over `pg` pool (`server/db.ts`). Otherwise it falls back to an in-memory implementation that resets on restart. All routes call `storage.*` methods — nothing in routes touches the DB directly. Schema defined in `shared/schema.ts` using Drizzle table builders + `drizzle-zod` for Zod validators.

## Key Code
```typescript
// Always use storage, never db directly in routes
const product = await storage.getProduct(id);
await storage.updateProduct(id, { stock: newStock });
```

## Notes
- In-memory mode is for dev convenience only — loses all data on restart.
- `npm run db:push` (drizzle-kit) pushes schema changes to the live DB — run after any `shared/schema.ts` change.
- Image data stored as base64 in the `products` table (no filesystem/CDN).
- Stock decrement happens only in the Stripe webhook handler — never client-side.
