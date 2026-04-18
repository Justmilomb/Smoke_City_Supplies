# Auth

## Goal
Handles admin authentication via Passport.js local strategy with PostgreSQL-backed sessions.

## Implementation
Passport local strategy in `server/auth.ts` validates username/password against `users` table. Passwords hashed with bcrypt (rounds configured in storage). Sessions stored in PostgreSQL via `connect-pg-simple` (table: `sessions`). `express-session` middleware wired in `server/index.ts`. In-memory fallback uses `memorystore`.

## Key Code
```typescript
// Protecting admin routes
app.use('/api/admin/*', requireAuth, handler);

// session check
req.isAuthenticated()  // true if logged-in admin
```

## Notes
- Only one admin user; no multi-user RBAC.
- Session secret from `SESSION_SECRET` env var — required in production.
- `ADMIN_PASSWORD` env var seeds the initial admin account on first run.
- bcrypt cost factor hardcoded to 10 — don't lower it.
