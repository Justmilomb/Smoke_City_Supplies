# Architecture

## Request Flow (Dev)

- `server/index.ts` creates the Express app, sessions, Passport, and registers API routes.
- In development, `server/vite.ts` mounts Vite in middleware mode and serves `client/index.html` for all non-API paths.
- In production, `server/static.ts` serves the built frontend from `dist/public`.

## Key Modules

- `server/index.ts`: server bootstrap, sessions, security middleware, and dev/prod wiring.
- `server/routes.ts`: API route registration (main router/controller surface).
- `server/auth.ts`: Passport strategies and auth wiring.
- `server/db.ts`: database connection (`pool`), used to decide whether to use Postgres-backed sessions/storage.
- `server/storage.ts`: data access layer (uses DB when configured; otherwise in-memory).
- `server/upload.ts`: upload directory + multer wiring; served at `/uploads`.
- `server/security.ts`: CORS + security headers.

## Frontend

- `client/` is the Vite root.
- `vite.config.ts` defines aliases:
  - `@` -> `client/src`
  - `@shared` -> `shared`
  - `@assets` -> `attached_assets`

## Build Output

- `npm run build` runs `script/build.ts`:
  - Vite build -> `dist/public`
  - esbuild bundles server -> `dist/index.cjs`
- `npm run start` runs `node dist/index.cjs`

## Data + Sessions

- If `DATABASE_URL` is set and `server/db.ts` creates a pool:
  - sessions use Postgres (`connect-pg-simple`)
  - storage is expected to use Postgres paths
- If not set:
  - sessions use an in-memory store (`memorystore`)
  - data is in-memory and resets when the process restarts

