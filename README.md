# Smoke City Supplies

E-commerce site for bike and scooter parts. Run from this directory.

## Setup

1. Set `DATABASE_URL` (PostgreSQL) and optionally `SESSION_SECRET`, `ADMIN_PASSWORD`.
2. `npm install && npm run build && npm run db:push`
3. `npm run start` (or `npm run dev` for development)

## Scripts

- `npm run dev` — development server
- `npm run build` — build client and server
- `npm run start` — production server
- `npm run db:push` — push schema to database