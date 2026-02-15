# SmokeCitySupplies Agent Notes

This repository is intended to be maintainable across human contributors and different AI models/sessions.

## Source Of Truth Docs

- `README.md`: setup, local dev, and deployment notes.
- `docs/ARCHITECTURE.md`: where things live and how requests flow.
- `package.json`: scripts are authoritative; docs should not drift from these.

If you change any of the above (ports, scripts, env vars, build output), update the corresponding docs in the same change.

## Repo Map (High Level)

- `client/`: React app (Vite root lives here).
- `server/`: Express app and API routes.
- `shared/`: shared TypeScript code (notably DB schema).
- `script/`: build tooling (bundles server + builds client into `dist/`).
- `dist/`: build output (generated).
- `uploads/`: local file uploads (ephemeral in many deploy targets).

## Development Rules (For Humans + AI)

- Prefer small, local changes with clear intent; avoid broad refactors unless requested.
- Keep `README.md` and `replit.md` consistent with real behavior in `server/index.ts` and `package.json`.
- Don’t introduce new environment variables without documenting them in `README.md`.
- If you change the DB schema (`shared/schema.ts`), also consider:
  - whether `npm run db:push` still works
  - whether seed scripts should be updated (`server/seed*.ts`)
- If you change routes/handlers, sanity-check with `npm run check` at minimum.

## Quick Commands

```bash
npm install
npm run dev
npm run check
```

## Ports

- Local dev defaults to `3000` unless `PORT` is set.
- Replit defaults to `5000` (detected via `REPL_ID`).
- Render (and similar) set `PORT` externally.

