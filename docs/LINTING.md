# Linting & Static Analysis — Smoke City Supplies

## Automated Tools

| Tool | Config File | Command |
|------|------------|---------|
| TypeScript compiler | `tsconfig.json` | `npm run check` |

No dedicated linter (ESLint, Prettier) is currently configured. TypeScript strict mode is the primary quality gate.

## TypeScript Strict Mode

`tsconfig.json` has `strict: true`. This enforces:
- No implicit `any`
- Null/undefined safety (`strictNullChecks`)
- Unused variable detection
- Strict function types

## Manual Review Checklist

- [ ] No dead code (unused functions, unreachable branches)
- [ ] No hardcoded secrets, keys, or credentials
- [ ] No TODO/FIXME without a `docs/CURRENT_TASKS.md` entry
- [ ] Error paths handled — no silent swallows (no empty `.catch(() => {})`)
- [ ] No `any` or `@ts-ignore` in business logic
- [ ] New env vars added to `.env.example` and `README.md`
- [ ] No `process.env.X` inline in business logic — use validated config
- [ ] Schema changes accompanied by `npm run db:push` verification
