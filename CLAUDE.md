# CLAUDE.md — Smoke City Supplies

## What This Is
E-commerce website for Smoke City Supplies. Full-stack TypeScript application.

**Tech stack:** React, Vite, TailwindCSS, Express, Drizzle ORM, PostgreSQL
**Platform:** Windows 10
**Language(s):** English British

---

## Rules (non-negotiable)

- **Strict TypeScript.** No `any`. No `@ts-ignore`.
- **Don't ask permission.** Just execute. User trusts technical decisions.
- **No git operations.** User commits manually.
- Prefer small, local changes with clear intent; avoid broad refactors unless requested.
- If you change the DB schema (`shared/schema.ts`), verify `npm run db:push` still works.
- If you change routes/handlers, run `npm run check` at minimum.
- Don't introduce new env vars without documenting them in README.md.

---

## Reading Order (cold start)
1. Read `E:\Coding\Second Brain\Smoke_City_Supplies\CONTEXT.md` — your project brain
2. Read `E:\Coding\Second Brain\_index\MASTER_INDEX.md` — cross-project awareness
3. Read `E:\Coding\Second Brain\_index\SKILL_TRANSFERS.md` — applicable lessons
4. `docs/ARCHITECTURE.md` — system structure
5. `AGENTS.md` — additional agent notes and repo map

---

## Repository Structure

- `client/`: React app (Vite root lives here).
- `server/`: Express app and API routes.
- `shared/`: shared TypeScript code (notably DB schema).
- `script/`: build tooling (bundles server + builds client into `dist/`).
- `dist/`: build output (generated).
- `uploads/`: local file uploads (ephemeral in many deploy targets).

## Commands

```bash
npm install
npm run dev          # Start dev server (port 3000 or PORT env)
npm run check        # TypeScript compiler check
npm run db:push      # Push schema changes to database
```

## Ports

- Local dev defaults to 3000 unless PORT is set
- Replit defaults to 5000 (detected via REPL_ID)
- Render (and similar) set PORT externally

---

## Architecture

```
Request
  └─> server/index.ts (Express bootstrap, sessions, Passport, API routes)
        ├─ Dev:  server/vite.ts (Vite middleware mode → client/index.html)
        └─ Prod: server/static.ts (serves dist/public)
```

**Key server modules:**
- `server/routes.ts` — API route registration (main router/controller surface)
- `server/auth.ts` — Passport strategies and auth wiring
- `server/db.ts` — database connection (`pool`); drives session and storage strategy
- `server/storage.ts` — data access layer (Postgres when DB configured; otherwise in-memory)
- `server/invoice.ts` — invoice number generation + HTML/PDF rendering
- `server/email.ts` — transactional email dispatch via Resend (invoice, confirmation, shipped, admin alert)
- `server/shippingLogic.ts` — parcel building, dispatch cutoff advice, packing slip HTML
- `server/shipping/royalMailManual.ts` — fixed Royal Mail rates + manual label draft flow
- `server/googleMerchantFeed.ts` — Google Merchant XML feed builder + scheduler
- `server/upload.ts` — image upload intake + validation (stored in PostgreSQL)
- `server/security.ts` — CORS + security headers

**Frontend aliases (vite.config.ts):**
- `@` → `client/src`
- `@shared` → `shared`
- `@assets` → `attached_assets`

**Build:**
- `npm run build` → Vite build to `dist/public` + esbuild bundles server to `dist/index.cjs`
- `npm run start` → `node dist/index.cjs`

**Data/Sessions:**
- `DATABASE_URL` set → Postgres sessions (`connect-pg-simple`) + Postgres storage
- `DATABASE_URL` unset → in-memory sessions (`memorystore`) + in-memory data (resets on restart)

**Checkout flow:**
- `POST /api/shipping/rates` → live UK shipping quotes
- `POST /api/checkout/prepare` → pending order + Stripe PaymentIntent
- `POST /api/stripe/webhook` → authoritative payment status update (sets paid, decrements stock, triggers invoice + email pipeline)

---

## Before You Finish

### Minimum write-back (every session):
1. `E:\Coding\Second Brain\Smoke_City_Supplies\SESSION_LOG.md` — add entry if anything important happened
2. `E:\Coding\Second Brain\Smoke_City_Supplies\KNOWN_ISSUES.md` — add/remove bugs if any changed

### Full write-back (when project state materially changed):
3. `E:\Coding\Second Brain\Smoke_City_Supplies\CONTEXT.md` — update changed sections only
4. `E:\Coding\Second Brain\Smoke_City_Supplies\PATTERNS.md` — add if you learned something new
5. `E:\Coding\Second Brain\_index\MASTER_INDEX.md` — update if you added new knowledge files
6. `E:\Coding\Second Brain\_index\SKILL_TRANSFERS.md` — add if lesson applies elsewhere

### Notion database updates (use Notion MCP tools):

Database IDs are in `E:\Coding\Second Brain\_system\conventions\notion-config.md`.
Use `data_source_id` (not `database_id`) when creating pages via `notion-create-pages`.

7. **Projects database** — update status/health for Smoke_City_Supplies after significant work
8. **Tasks database** — update status of any tasks you worked on
9. **Bugs database** — add/update bugs found or fixed
10. **Agent Log** — add entry ONLY if important (decision, error, breakthrough, blocker)

If Notion MCP is unavailable, log pending updates to `E:\Coding\Second Brain\Smoke_City_Supplies\SESSION_LOG.md` with `[NOTION_PENDING]` tag.

### If session is interrupted:
Prioritise: SESSION_LOG > KNOWN_ISSUES > CONTEXT > everything else.
Notion updates are non-critical — Obsidian is the source of truth.
