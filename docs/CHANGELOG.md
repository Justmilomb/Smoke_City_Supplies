# Changelog

Architectural decisions and significant changes. Newest first.

---

## 2026-04-18

- Applied MASTER_PROMPT.md scaffold: updated CLAUDE.md with full structure (architecture quick ref, hub files, multi-agent team, phase map, session write-back protocol, CI/CD section)
- Created `docs/ARCHITECTURE.md` — system graph, data flow, subsystem responsibilities, phase map
- Created `docs/systems/` directory with 8 subsystem deep-dives (auth, storage, checkout-payments, shipping, email-invoice, ai-seo, ebay, google-merchant-feed)
- Created `docs/plans/` directory for dated design documents
- Created `.github/workflows/ci.yml` — GitHub Actions CI running TypeScript check on push/PR
- Updated `.gitignore` to include `config/local.*`
- Updated `docs/CODING_STANDARDS.md` with naming table and error handling guidance
- Updated `docs/AGENT_WORKFLOW.md` with MASTER_PROMPT reading order and hub file protection rules
- Updated `docs/TESTING.md`, `docs/LINTING.md`, `docs/DIRECTORY_STRUCTURE.md` to match MASTER_PROMPT standards

## 2026-03-27

- Documentation system created: CONTRACTS, CURRENT_TASKS, CODING_STANDARDS, AGENT_WORKFLOW, TESTING, LINTING, DIRECTORY_STRUCTURE, SYSTEM_OVERVIEW
