# Puaros

A TypeScript monorepo for Puaros project.

## Prerequisites

- Node.js 22.18.0 (use `nvm use` to automatically switch to the correct version)
- pnpm (package manager)

## Getting Started

### Installation

```bash
# Install dependencies
pnpm install
```

### Development

```bash
# Build all packages
pnpm build:all

# Clean all build outputs
pnpm clean:all

# Run CLI in development mode
pnpm dev:cli
```

### Testing

```bash
# Run all tests across packages
pnpm test

# Run tests with coverage (80% threshold required)
cd packages/core && pnpm test:coverage

# Run tests with UI
cd packages/core && pnpm test:ui

# Run tests once (no watch mode)
cd packages/core && pnpm test:run
```

The project uses Vitest for testing with coverage thresholds set to 80% for all metrics (lines, functions, branches, statements).

### Code Quality

```bash
# Format all code (IMPORTANT: uses 4-space indentation)
pnpm format

# Lint and auto-fix
pnpm lint

# Check linting without fixing
pnpm eslint "packages/**/*.ts"
```

## Project Structure

```
puaros/
├── packages/
│   └── core/              # @puaros/core - Core business logic
│       ├── src/           # Source files
│       ├── dist/          # Build output (generated)
│       └── package.json
├── pnpm-workspace.yaml    # Workspace configuration
├── tsconfig.base.json     # Shared TypeScript config
├── eslint.config.mjs      # ESLint configuration
├── .prettierrc            # Prettier configuration
├── LINTING.md             # Code style guidelines
├── CLAUDE.md              # AI assistant guidance
└── CHANGELOG.md           # Project changelog
```

## Code Style

This project follows strict TypeScript and code quality standards:

- **Indentation:** 4 spaces (enforced by Prettier)
- **Line Length:** 100 characters maximum
- **Quotes:** Single quotes
- **Semicolons:** Always required
- **TypeScript:** Strict type checking enabled

### Key Rules

- No `any` type without explicit reasoning
- Explicit function return types required
- No floating promises - always await or handle
- Use `const` for non-reassigned variables
- Always use `===` instead of `==`
- Curly braces required for all control structures
- No `console.log` (use `console.warn`/`console.error` or proper logger)

See [LINTING.md](./LINTING.md) for detailed code style guidelines.

## Monorepo Structure

This project uses pnpm workspaces for managing multiple packages:

- **Packages** are located in `packages/*`
- All packages share TypeScript configuration via `tsconfig.base.json`
- Dependencies are hoisted and shared when possible

### Adding a New Package

1. Create `packages/your-package/` directory
2. Add `package.json` with name `@puaros/your-package`
3. Create `tsconfig.json` extending `../../tsconfig.base.json`
4. The package will be auto-discovered via workspace configuration

## Dependencies

Core package uses:

- `simple-git` - Git operations
- `tree-sitter`, `tree-sitter-javascript`, `tree-sitter-typescript` - Code parsing
- `uuid` - UUID generation

Development tools:

- Vitest - Testing framework
- ESLint + TypeScript ESLint - Strict type checking and linting
- Prettier - Code formatting

## Contributing

1. Ensure Node.js version matches `.nvmrc` (22.18.0)
2. Run `pnpm format` before committing to ensure consistent formatting
3. All tests must pass with 80% coverage
4. Fix all ESLint warnings - they indicate real type safety issues

## License

MIT - Copyright (c) Fozilbek Samiyev