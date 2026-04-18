# Smoke City Supplies

Full-stack e-commerce platform for motorcycle and scooter parts. React 19 + Express 5 + TypeScript + Drizzle ORM + PostgreSQL + Stripe + Resend. Built for a real family-run UK bike shop. Target runtime: Node 20+, deployed on Render.

**Tech stack:** TypeScript, React 19, Express 5, Drizzle ORM, PostgreSQL, Stripe, Resend, Vite, TailwindCSS, Wouter, TanStack Query, Zod
**Platform:** Windows 10
**Language(s):** English British

---

## 1 — Rules (non-negotiable)

- **Don't ask permission.** Just execute. User trusts technical decisions.
- **No git operations.** User commits manually.
- **No hardcoded secrets.** API keys go in environment variables only. Never commit `.env`.
- **No over-engineering.** Implement what's asked. Three similar lines beats a premature abstraction.
- **Strict TypeScript.** No `any`, no `@ts-ignore`. Run `npm run check` before considering any change complete.
- **No new env vars** without adding to both `.env.example` and the Configuration section of `README.md`.
- **Schema changes** in `shared/schema.ts` require verifying `npm run db:push` still works and updating seed scripts if affected.
- **No `package.json` script changes** without updating `README.md`.
- **All prices in GBP** — pence internally, pounds in UI.
- **UK-only shipping** assumptions throughout.
- **No TODO comments in code** — track in `docs/CURRENT_TASKS.md`.
- **Comments explain *why*, not *what*.** Never comment what the code already says.
- **No backwards-compatibility shims** for removed code. Delete it; git has the history.
- **Validate at boundaries, trust internals.** Validate user input and external API responses only.
- **File size guideline:** Leaf modules under ~400 lines. Hub files may exceed this.

---

## 2 — Reading Order (Cold Start)

Every agent reads these in order before touching code.

1. This file (`CLAUDE.md`)
2. `docs/ARCHITECTURE.md` — system graph + subsystem table
3. `docs/CURRENT_TASKS.md` — what's done, what's next
4. `docs/CONTRACTS.md` — interface contracts (do not break these)
5. `docs/systems/<relevant>.md` — deep-dive on the system you'll touch
6. `shared/schema.ts` — database schema and Zod validators
7. `server/routes.ts` — all API endpoints
8. `.env.example` — all configuration knobs

---

## 3 — Architecture Quick Reference

```
Smoke City Supplies
  ├─ client/src/App.tsx              (frontend root, Wouter routing)     ← hub
  │   ├─ pages/                      (route page components)             ← leaf
  │   ├─ components/                 (reusable UI)                       ← leaf
  │   └─ lib/
  │       ├─ cart.tsx                (cart context + localStorage)       ← leaf
  │       └─ queryClient.ts          (TanStack Query config)             ← leaf
  │
  ├─ server/index.ts                 (Express bootstrap + middleware)     ← hub
  │   ├─ server/routes.ts            (all API endpoints, ~1500 lines)    ← hub
  │   ├─ server/storage.ts           (data access layer)                 ← hub
  │   │   └─ server/db.ts            (PostgreSQL connection pool)        ← leaf
  │   ├─ server/auth.ts              (Passport.js local strategy)        ← leaf
  │   ├─ server/stripe.ts            (Stripe SDK init)                   ← leaf
  │   ├─ server/email.ts             (Resend transactional email)        ← leaf
  │   ├─ server/invoice.ts           (invoice number + HTML/PDF)         ← leaf
  │   ├─ server/shippingLogic.ts     (parcel building, dispatch cutoff)  ← leaf
  │   │   └─ server/shipping/
  │   │       └─ royalMailManual.ts  (RM rates + label flow)             ← leaf
  │   ├─ server/ebay.ts              (eBay listing integration)          ← leaf
  │   ├─ server/ai.ts                (AI provider selection)             ← leaf
  │   ├─ server/seo.ts               (AI-assisted SEO generation)        ← leaf
  │   ├─ server/googleMerchantFeed.ts (Google Merchant XML feed)         ← leaf
  │   ├─ server/upload.ts            (image upload + validation)         ← leaf
  │   ├─ server/security.ts          (CORS + security headers)           ← leaf
  │   └─ server/rateLimit.ts         (rate limiting middleware)          ← leaf
  │
  └─ shared/schema.ts                (Drizzle table defs + Zod schemas)  ← hub
```

---

## 4 — Hub Files (BOSS ONLY — agents must not touch)

Hub files wire everything together. Only the orchestrator modifies these.

- `server/index.ts` — Express bootstrap, middleware wiring
- `server/routes.ts` — all route registrations (~1500 lines)
- `server/storage.ts` — data access layer (wires Postgres + in-memory)
- `shared/schema.ts` — all Drizzle schemas and Zod validators
- `client/src/App.tsx` — frontend routing and providers
- `package.json` — dependency manifest
- `.env.example` — environment variable schema

---

## 5 — Multi-Agent Team

| Role | Model | Responsibilities | Owns |
|------|-------|-----------------|------|
| **Boss / Orchestrator** | opus | Plans, owns hub files, integrates, reviews | Hub files, architecture decisions |
| **Feature Agent** | sonnet | Implements one system at a time (2–6 files) | Leaf system files |
| **Support Agent** | haiku | Docs, review checklists, search | `docs/systems/*.md`, changelogs |

### Dispatch Protocol

**Phase 1 — Prepare (Boss, sequential):**
1. Update `shared/schema.ts` with any new structures
2. Update `package.json` if adding dependencies
3. Define public API signatures in route stubs
4. Write dispatch prompts with only the context each agent needs

**Phase 2 — Parallel Work (Feature agents):**
- Each agent receives ONLY its owned files + read-only deps
- Use `isolation: "worktree"` in the Agent tool for conflict avoidance

**Phase 3 — Integrate (Boss, sequential):**
1. Review each agent's output against contracts
2. Wire new systems into `server/routes.ts` / `server/index.ts`
3. Final TypeScript check: `npm run check`

---

## 6 — Key Conventions

### TypeScript
- Strict mode enabled (`tsconfig.json`). All source files `.ts` / `.tsx`.
- No `any`, no `@ts-ignore`.
- Types: PascalCase. Functions/variables: camelCase. Constants: UPPER_SNAKE.
- Interfaces: PascalCase, no `I` prefix.
- Components: PascalCase filenames matching export name.

### Imports
- Client: use path aliases (`@/` → `client/src/`, `@shared/` → `shared/`, `@assets/` → `attached_assets/`)
- Server: use relative imports

### Components
- React functional components + hooks only. No class components.
- TailwindCSS utility classes. No CSS-in-JS, no `.css` files.

### Database
- Drizzle ORM. Schema in `shared/schema.ts`. Always run `npm run db:push` after schema changes.
- `server/storage.ts` is the only layer allowed to query the database directly.

### API
- All Express route handlers live in `server/routes.ts`.
- All endpoints return JSON.
- Stripe webhook handler is authoritative for payment status — never override it client-side.

### Environment Variables
- Always accessed via validated config — never `process.env.X` inline in business logic.
- `DATABASE_URL` controls Postgres vs in-memory mode.

---

## 7 — Current Phase

- **Phase 1 — Foundation** (project setup, auth, data layer) — Done
- **Phase 2 — Core E-commerce** (catalogue, cart, checkout, Stripe) — Done
- **Phase 3 — Operations** (shipping, invoices, email, admin) — Done
- **Phase 4 — Integrations** (eBay, Google Merchant, AI/SEO) — Done
- **Phase 5 — Quality & DevEx** (CI/CD, automated tests, monitoring, docs) — **In Progress**

---

## 8 — Key Modules

- `server/routes.ts` — API route registration (main controller surface, ~1500 lines)
- `server/storage.ts` — data access layer (Postgres or in-memory fallback)
- `server/index.ts` — server bootstrap, sessions, security middleware
- `server/stripe.ts` — Stripe SDK init
- `server/email.ts` — transactional email via Resend (invoice, confirmation, shipped, admin alert)
- `server/invoice.ts` — invoice number generation + HTML/PDF rendering
- `server/shipping/royalMailManual.ts` — Royal Mail shipping rates and label flow
- `server/shippingLogic.ts` — parcel building, dispatch cutoff, packing slip HTML
- `server/ebay.ts` — eBay listing integration
- `server/ai.ts` — AI provider selection (Perplexity / NVIDIA)
- `server/seo.ts` — AI-assisted SEO generation
- `server/googleMerchantFeed.ts` — Google Merchant XML feed builder
- `server/auth.ts` — Passport local strategy
- `server/db.ts` — PostgreSQL connection pool
- `server/upload.ts` — image upload intake + validation
- `server/security.ts` — CORS + security headers
- `server/rateLimit.ts` — rate limiting middleware
- `shared/schema.ts` — Drizzle table definitions + Zod validation schemas
- `client/src/App.tsx` — frontend route definitions (Wouter)
- `client/src/lib/cart.tsx` — cart context + localStorage persistence

---

## 9 — Quick Commands

```
npm install          # install dependencies
npm run dev          # start dev server (port 3000)
npm run check        # TypeScript type check
npm run build        # production build to dist/
npm run start        # run production server from dist/index.cjs
npm run db:push      # push schema to database (requires DATABASE_URL)
npm run seed:parts   # seed product data
```

## Ports

- Local default: `3000`
- Replit (`REPL_ID` present): `5000`
- Production: `PORT` env var (set by platform)

---

## 10 — Before You Finish (Session Write-Back)

Every agent session must leave the project in a state where the next agent can pick up without archaeology.

### Minimum write-back (every session):
1. `docs/CURRENT_TASKS.md` — mark completed tasks, update "In Progress", add new "Up Next" items
2. `docs/CHANGELOG.md` — one-line entry for anything architecturally significant

### Full write-back (when project state materially changed):
3. `docs/ARCHITECTURE.md` — update graph if a module was added, removed, or rewired
4. `docs/CONTRACTS.md` — update if any interface changed
5. `docs/systems/<system>.md` — update for any system whose behaviour changed
6. `E:\Coding\Second Brain\Smoke_City_Supplies\CONTEXT.md` — update project brain
7. Notion Command Center — update project status (use Notion MCP tools)

### If the session is interrupted:
Prioritise: CURRENT_TASKS > CHANGELOG > everything else.

---

## 11 — Source of Truth

- `README.md` — setup, architecture, deployment, configuration
- `package.json` — scripts are authoritative
- `.env.example` — canonical list of all environment variables
- `shared/schema.ts` — database schema

If `README.md` and code disagree, code wins — but fix the README.
