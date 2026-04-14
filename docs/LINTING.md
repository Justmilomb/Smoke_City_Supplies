# Linting — Smoke City Supplies

## Primary Check

```bash
npm run check    # TypeScript compiler (tsc --noEmit)
```

This is the main code quality gate. No dedicated linter (ESLint, Prettier) is configured.

## TypeScript Strict Mode

The `tsconfig.json` has strict mode enabled. The compiler catches:
- Type errors
- Unused variables
- Missing return types
- Null/undefined safety
