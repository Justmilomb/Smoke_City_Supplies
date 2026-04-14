# Directory Structure — Smoke City Supplies

```
client/               # React frontend (Vite root)
  src/
    pages/            # Route page components
    components/       # Reusable UI components
    hooks/            # Custom React hooks
    lib/              # Utilities (queryClient, etc.)
    App.tsx           # Root component
    main.tsx          # React entry point

server/               # Express backend
  index.ts            # Server entry point (Express bootstrap)
  routes.ts           # API route registration
  auth.ts             # Passport.js strategies
  db.ts               # Database connection (pool)
  storage.ts          # Data access layer (Postgres or in-memory)
  invoice.ts          # Invoice generation (HTML/PDF)
  email.ts            # Transactional email (Resend)
  shippingLogic.ts    # Parcel building, dispatch cutoff
  shipping/
    royalMailManual.ts  # Royal Mail rates + manual labels
  googleMerchantFeed.ts # Google Merchant XML feed
  upload.ts           # Image upload + validation
  security.ts         # CORS + security headers
  vite.ts             # Vite dev server middleware
  static.ts           # Production static file serving

shared/               # Shared between client and server
  schema.ts           # Drizzle ORM schema + types

script/               # Build tooling
  build.ts            # Production build (Vite + esbuild)

dist/                 # Build output (generated)
uploads/              # Local file uploads (ephemeral)
docs/                 # Project documentation
```
