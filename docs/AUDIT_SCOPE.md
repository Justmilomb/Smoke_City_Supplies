# Audit Scope (Current Pass)

This pass focused on full-stack application code and deployment configuration:

- `server/*.ts`
- `shared/*.ts`
- `client/src/pages/*.tsx`
- `client/src/components/site/*.tsx`
- `client/src/lib/*.ts*`
- `render.yaml`
- `README.md`

Notes:

- `client/src/components/ui/*` are library-style UI primitives and were not deeply refactored to avoid breaking generated/shared component behavior.
- Validation/auth hardening was applied to high-impact mutation endpoints and shared sanitization utilities.
