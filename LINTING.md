# Linting & Code Style Guide

## Overview

This project uses **ESLint** + **Prettier** with strict TypeScript rules and **4-space indentation**.

## Quick Start

```bash
# Format all code
pnpm format

# Lint and auto-fix
pnpm lint

# Check only (no fix)
pnpm eslint "packages/**/*.ts"
```

## Configuration Files

- **`.prettierrc`** - Prettier code formatting (4 spaces, single quotes, etc.)
- **`eslint.config.mjs`** - ESLint rules (TypeScript strict mode + best practices)
- **`.editorconfig`** - Editor settings (consistent across IDEs)

## Key Rules

### TypeScript Strictness

| Rule | Level | Description |
|------|-------|-------------|
| `@typescript-eslint/no-explicit-any` | warn | Avoid `any` type - use proper typing |
| `@typescript-eslint/explicit-function-return-type` | warn | Functions must declare return types |
| `@typescript-eslint/no-floating-promises` | error | Always handle promises |
| `@typescript-eslint/no-unsafe-*` | warn | Strict type safety checks |

### Code Quality

| Rule | Level | Description |
|------|-------|-------------|
| `no-console` | warn | Use logger instead (except `console.warn/error`) |
| `prefer-const` | error | Use `const` for non-reassigned variables |
| `eqeqeq` | error | Always use `===` instead of `==` |
| `curly` | error | Always use curly braces for if/for/while |
| `complexity` | warn | Max cyclomatic complexity: 15 |
| `max-params` | warn | Max function parameters: 5 |
| `max-lines-per-function` | warn | Max 100 lines per function |

### Code Style

- **Indentation:** 4 spaces (not tabs)
- **Line Length:** 100 characters max
- **Quotes:** Single quotes `'string'`
- **Semicolons:** Always required `;`
- **Trailing Commas:** Always in multiline
- **Arrow Functions:** Always use parentheses `(x) => x`

## Handling Warnings

### `any` Type Usage

**Before:**
```typescript
function process(data: any) {
    return data.value;
}
```

**After:**
```typescript
interface ProcessData {
    value: string;
}

function process(data: ProcessData): string {
    return data.value;
}
```

### Missing Return Types

**Before:**
```typescript
async function fetchData() {
    return await api.get('/data');
}
```

**After:**
```typescript
async function fetchData(): Promise<DataResponse> {
    return await api.get('/data');
}
```

### Floating Promises

**Before:**
```typescript
async function init() {
    startServer(); // ❌ Promise not handled
}
```

**After:**
```typescript
async function init(): Promise<void> {
    await startServer(); // ✅ Promise awaited
}
```

## Ignoring Rules (Use Sparingly)

```typescript
// Disable specific rule for next line
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const legacyData: any = getLegacyApi();

// Disable for entire file (add at top)
/* eslint-disable @typescript-eslint/no-explicit-any */
```

**Note:** Only use `eslint-disable` for legacy code or when type safety is genuinely impossible.

## Pre-commit Hooks (Optional)

To automatically format on commit, install Husky:

```bash
pnpm add -D husky lint-staged
npx husky init

# Add to .husky/pre-commit:
pnpm lint-staged
```

Create `lint-staged` config in `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "prettier --write",
      "eslint --fix"
    ]
  }
}
```

## IDE Setup

### VS Code

Install extensions:
- **ESLint** (`dbaeumer.vscode-eslint`)
- **Prettier** (`esbenp.prettier-vscode`)

Add to `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": ["typescript", "javascript"]
}
```

### WebStorm / IntelliJ IDEA

1. **Settings → Languages & Frameworks → JavaScript → Prettier**
   - Enable "On save"
   - Set "Run for files": `{**/*,*}.{ts,js,tsx,jsx}`

2. **Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint**
   - Enable "Automatic ESLint configuration"
   - Enable "Run eslint --fix on save"

## Common Issues

### "Parsing error: ESLint was configured to run..."

**Solution:** Make sure `tsconfig.json` exists in the project root.

### "Rule 'indent' conflicts with Prettier"

**Solution:** Already handled - ESLint `indent` rule is disabled in favor of Prettier.

### Too many warnings after upgrade

**Solution:** Run auto-fix first, then address remaining issues:

```bash
pnpm lint
# Review warnings, fix manually
```

## Best Practices

1. **Run `pnpm format` before committing** - ensures consistent formatting
2. **Fix warnings incrementally** - don't disable rules without reason
3. **Add types instead of `any`** - improves code quality and IDE support
4. **Use ESLint ignore comments sparingly** - only for edge cases

## Resources

- [TypeScript ESLint Rules](https://typescript-eslint.io/rules/)
- [Prettier Options](https://prettier.io/docs/en/options.html)
- [ESLint Rules](https://eslint.org/docs/latest/rules/)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)

---

**Last Updated:** 2025-01-19
