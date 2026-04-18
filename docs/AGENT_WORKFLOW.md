# Agent Workflow — Smoke City Supplies

How any agent (AI or human) should orient and safely make changes.

## Reading Order (Cold Start)

1. `CLAUDE.md` — rules, architecture overview, hub files
2. `docs/ARCHITECTURE.md` — system graph + subsystem table
3. `docs/CURRENT_TASKS.md` — what is in progress
4. `docs/CONTRACTS.md` — interface contracts
5. `docs/systems/<relevant>.md` — the system you'll touch
6. The source file(s) you'll modify

Secondary context (cross-project awareness):
- `E:\Coding\Second Brain\Smoke_City_Supplies\CONTEXT.md` — project brain
- `E:\Coding\Second Brain\_index\SKILL_TRANSFERS.md` — applicable lessons from other projects

## Before Touching a File

1. Read the full implementation for the module you'll change.
2. Search for all callers of any function you'll modify or rename.
3. Check `docs/CURRENT_TASKS.md` — is another task already touching this?
4. Check `docs/CONTRACTS.md` — do not break call sequences or return types.

## Making a Change

1. Edit implementation, then update types in `shared/schema.ts` if needed.
2. Run `npm run check` after any TypeScript change — must pass with 0 errors.
3. If `shared/schema.ts` changed, run `npm run db:push`.
4. Update docs in the same change:
   - `docs/systems/<system>.md` if behaviour changed
   - `docs/CONTRACTS.md` if any interface changed
   - `docs/ARCHITECTURE.md` if a module was added or removed
   - `docs/CHANGELOG.md` with a one-line entry
   - `docs/CURRENT_TASKS.md` to check off completed work

## Adding a New Module

1. Create the new file in the correct directory.
2. Create `docs/systems/<system-name>.md` (~150 words).
3. Add to the graph in `docs/ARCHITECTURE.md`.
4. Add call contracts to `docs/CONTRACTS.md`.
5. Wire into hub files (`server/routes.ts` or `server/index.ts`).
6. Add a `docs/CHANGELOG.md` entry.
7. Update `docs/CURRENT_TASKS.md`.

## Never

- Modify hub files (`server/routes.ts`, `server/index.ts`, `server/storage.ts`, `shared/schema.ts`, `client/src/App.tsx`) without Boss/orchestrator review.
- Skip `npm run check` after TypeScript changes.
- Add dependencies without updating `package.json` and `README.md`.
- Introduce new env vars without updating `.env.example` and `README.md`.
- Commit `.env`, credentials, or API keys.
