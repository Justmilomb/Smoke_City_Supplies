# Directory Structure — Smoke City Supplies

```
project-root/
├── client/                         ← React frontend (Vite root)
│   └── src/
│       ├── pages/                  ← Route page components (leaf)
│       ├── components/             ← Reusable UI components (leaf)
│       ├── hooks/                  ← Custom React hooks (leaf)
│       ├── lib/                    ← Utilities, queryClient, cart context
│       ├── App.tsx                 ← Root component + Wouter routing (hub)
│       └── main.tsx                ← React entry point
│
├── server/                         ← Express backend
│   ├── index.ts                    ← Server bootstrap, middleware (hub)
│   ├── routes.ts                   ← All API endpoints (~1500 lines) (hub)
│   ├── storage.ts                  ← Data access layer (hub)
│   ├── db.ts                       ← PostgreSQL connection pool (leaf)
│   ├── auth.ts                     ← Passport.js strategy (leaf)
│   ├── stripe.ts                   ← Stripe SDK init (leaf)
│   ├── email.ts                    ← Resend transactional email (leaf)
│   ├── invoice.ts                  ← Invoice numbering + HTML/PDF (leaf)
│   ├── shippingLogic.ts            ← Parcel building, dispatch cutoff (leaf)
│   ├── shipping/
│   │   └── royalMailManual.ts      ← Royal Mail rates + labels (leaf)
│   ├── ebay.ts                     ← eBay listing integration (leaf)
│   ├── ai.ts                       ← AI provider selection (leaf)
│   ├── seo.ts                      ← AI-assisted SEO generation (leaf)
│   ├── googleMerchantFeed.ts       ← Google Merchant XML feed (leaf)
│   ├── upload.ts                   ← Image upload + validation (leaf)
│   ├── security.ts                 ← CORS + security headers (leaf)
│   ├── rateLimit.ts                ← Rate limiting middleware (leaf)
│   ├── vite.ts                     ← Vite dev server middleware (leaf)
│   └── static.ts                   ← Production static file serving (leaf)
│
├── shared/                         ← Shared between client and server
│   └── schema.ts                   ← Drizzle table defs + Zod schemas (hub)
│
├── script/                         ← Build tooling
│   └── build.ts                    ← Production build (Vite + esbuild)
│
├── docs/                           ← Project documentation (authoritative)
│   ├── ARCHITECTURE.md             ← System graph + subsystem table
│   ├── SYSTEM_OVERVIEW.md          ← Goal, stack, constraints
│   ├── CURRENT_TASKS.md            ← Work status (done / in-progress / next)
│   ├── CONTRACTS.md                ← Interface contracts
│   ├── CODING_STANDARDS.md         ← Naming + style rules
│   ├── AGENT_WORKFLOW.md           ← Reading order + change process
│   ├── TESTING.md                  ← Build commands + smoke test checklist
│   ├── LINTING.md                  ← Tool list + manual review checklist
│   ├── DIRECTORY_STRUCTURE.md      ← This file
│   ├── CHANGELOG.md                ← Architectural decision log
│   ├── plans/                      ← Design docs (YYYY-MM-DD-name.md)
│   └── systems/                    ← Per-system deep-dives (~150 words each)
│       ├── auth.md
│       ├── storage.md
│       ├── checkout-payments.md
│       ├── shipping.md
│       ├── email-invoice.md
│       ├── ai-seo.md
│       ├── ebay.md
│       └── google-merchant-feed.md
│
├── .github/
│   └── workflows/
│       └── ci.yml                  ← GitHub Actions CI (TypeScript check)
│
├── dist/                           ← Build output (generated, not committed)
├── uploads/                        ← Local file uploads (ephemeral, not committed)
├── .env.example                    ← Committed: all keys, no values
├── .env                            ← NOT committed (in .gitignore)
├── package.json                    ← Dependencies + scripts
├── tsconfig.json                   ← TypeScript config (strict mode)
├── vite.config.ts                  ← Vite build config
├── drizzle.config.ts               ← Drizzle Kit config
├── render.yaml                     ← Render deployment config
└── CLAUDE.md                       ← AI agent entry point
```

## Rules

- Server directories are flat — avoid deep nesting under `server/`.
- `docs/` is the authoritative knowledge base. Code comments supplement, never replace.
- `docs/systems/` contains one ~150-word doc per subsystem.
- `docs/plans/` contains dated design documents for major features.
- Secrets never appear anywhere in the repository.
