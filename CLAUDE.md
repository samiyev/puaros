# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Puaros is a TypeScript monorepo using pnpm workspaces. Contains two packages:

- **`@puaros/guardian`** - Code quality guardian for detecting hardcoded values, circular dependencies, framework leaks, naming violations, and architecture violations.

- **`@puaros/ipuaro`** - Local AI agent for codebase operations with "infinite" context feeling. Uses lazy loading, Redis persistence, tree-sitter AST parsing, and Ollama LLM integration.

The project uses Node.js 22.18.0 (see `.nvmrc`).

## Essential Commands

### Build & Development

```bash
# Build all packages
pnpm build:all

# Clean all builds
pnpm clean:all

# Build specific package
cd packages/guardian && pnpm build

# Watch mode for specific package
cd packages/guardian && pnpm watch
```

### Testing

```bash
# Run all tests across packages
pnpm test

# Guardian package testing options
cd packages/guardian
pnpm test              # Run tests in watch mode
pnpm test:run          # Run tests once
pnpm test:coverage     # Generate coverage report (80% threshold)
pnpm test:ui           # Open Vitest UI
pnpm test:watch        # Explicit watch mode
```

Tests use Vitest with coverage thresholds set to 80% for lines, functions, branches, and statements.

### Linting & Formatting

```bash
# Format all TypeScript files
pnpm format

# Lint and auto-fix all TypeScript files
pnpm lint

# Check linting without fixing
pnpm eslint "packages/**/*.ts"
```

## Code Style Requirements

**Critical: This project uses 4-space indentation, not 2 spaces.**

### Key Configuration
- **Indentation:** 4 spaces (enforced by Prettier)
- **Line Length:** 100 characters max
- **Quotes:** Double quotes
- **Semicolons:** Never used
- **Trailing Commas:** Always in multiline
- **TypeScript:** Strict type checking with nodenext modules

### TypeScript Rules to Follow

From `eslint.config.mjs` and detailed in `LINTING.md`:

1. **Type Safety (warnings, must address):**
   - Avoid `any` type - use proper typing
   - Declare explicit function return types
   - No floating promises (always await or handle)
   - No unsafe type operations

2. **Code Quality (errors, must fix):**
   - Use `const` for non-reassigned variables
   - Always use `===` instead of `==`
   - Always use curly braces for conditionals/loops
   - Handle all promises (no floating promises)
   - No `console.log` (use `console.warn`/`console.error` or proper logger)

3. **Complexity Limits (warnings):**
   - Max cyclomatic complexity: 15
   - Max function parameters: 5
   - Max lines per function: 100
   - Max nesting depth: 4

4. **Comments Style:**
   - Single-line comments must have a space after `//` (e.g., `// Comment`)
   - Multi-line comments should use JSDoc style (`/** */`)
   - No section divider comments (e.g., `// Entities`, `// Value Objects`) in code
   - Comments should explain "why", not "what" (code should be self-documenting)
   - TODO/FIXME/HACK comments trigger warnings

## Git Commit Format

Follow Conventional Commits format. See `.gitmessage` for full rules.

Format: `<type>: <subject>` (imperative mood, no caps, max 50 chars)

**IMPORTANT: Do NOT add "Generated with Claude Code" footer or "Co-Authored-By: Claude" to commit messages.**
Commits should only follow the Conventional Commits format without any additional attribution.

## Monorepo Structure

```
puaros/
├── packages/
│   ├── guardian/                # @puaros/guardian - Code quality analyzer
│   │   ├── src/                 # Source files (Clean Architecture)
│   │   │   ├── domain/          # Entities, value objects
│   │   │   ├── application/     # Use cases, DTOs
│   │   │   ├── infrastructure/  # Parsers, analyzers
│   │   │   ├── cli/             # CLI implementation
│   │   │   └── shared/          # Shared utilities
│   │   ├── bin/                 # CLI entry point
│   │   ├── tests/               # Test files
│   │   └── examples/            # Usage examples
│   └── ipuaro/                  # @puaros/ipuaro - Local AI agent
│       ├── src/                 # Source files (Clean Architecture)
│       │   ├── domain/          # Entities, value objects, services
│       │   ├── application/     # Use cases, DTOs, mappers
│       │   ├── infrastructure/  # Storage, LLM, indexer, tools
│       │   ├── tui/             # Terminal UI (Ink/React)
│       │   ├── cli/             # CLI commands
│       │   └── shared/          # Types, constants, utils
│       ├── bin/                 # CLI entry point
│       ├── tests/               # Unit and E2E tests
│       └── examples/            # Demo projects
├── pnpm-workspace.yaml          # Workspace configuration
└── tsconfig.base.json           # Shared TypeScript config
```

### Guardian Package Architecture

The guardian package follows Clean Architecture principles:
- **Domain Layer**: Core business logic (entities, value objects, domain events)
- **Application Layer**: Use cases, DTOs, and mappers
- **Infrastructure Layer**: External concerns (parsers, analyzers, file scanners)
- **CLI Layer**: Command-line interface implementation

Key features:
- Hardcode detection (magic numbers, strings)
- Circular dependency detection
- Framework leak detection (domain importing frameworks)
- Naming convention validation
- Architecture violation detection
- CLI tool with `guardian` command

### ipuaro Package Architecture

The ipuaro package follows Clean Architecture principles:
- **Domain Layer**: Entities (Session, Project), value objects (FileData, FileAST, ChatMessage), service interfaces
- **Application Layer**: Use cases (StartSession, HandleMessage, IndexProject, ExecuteTool), DTOs, mappers
- **Infrastructure Layer**: Redis storage, Ollama client, indexer, 18 tool implementations, security
- **TUI Layer**: Ink/React components (StatusBar, Chat, Input, DiffView, ConfirmDialog)
- **CLI Layer**: Commander.js entry point and commands

Key features:
- 18 LLM tools (read, edit, search, analysis, git, run)
- Redis persistence with AOF
- tree-sitter AST parsing (ts, tsx, js, jsx)
- Ollama LLM integration (qwen2.5-coder:7b-instruct)
- File watching via chokidar
- Session and undo management
- Security (blacklist/whitelist for commands)

**Tools summary:**
| Category | Tools |
|----------|-------|
| Read | get_lines, get_function, get_class, get_structure |
| Edit | edit_lines, create_file, delete_file |
| Search | find_references, find_definition |
| Analysis | get_dependencies, get_dependents, get_complexity, get_todos |
| Git | git_status, git_diff, git_commit |
| Run | run_command, run_tests |

### TypeScript Configuration

Base configuration (`tsconfig.base.json`) uses:
- Module: `nodenext` with `nodenext` resolution
- Target: `ES2023`
- Strict null checks enabled
- Decorators enabled (experimental)
- JSX configured for React

Guardian package (`packages/guardian/tsconfig.json`):
- Module: `CommonJS`
- Module Resolution: `node`
- Target: `ES2023`
- Output to `dist/` from `src/`
- Strict type checking enabled

**Important:** The guardian package uses CommonJS output for compatibility.

## Adding New Packages

1. Create `packages/new-package/` directory
2. Add `package.json` with name `@puaros/new-package`
3. Create `tsconfig.json` extending `../../tsconfig.base.json`
4. Package auto-discovered via `pnpm-workspace.yaml` glob pattern

## Dependencies

**Guardian package:**
- `commander` - CLI framework
- `simple-git` - Git operations
- `tree-sitter` - AST parsing
- `tree-sitter-javascript/typescript` - JS/TS parsers
- `uuid` - UUID generation

**ipuaro package:**
- `ink`, `ink-text-input`, `react` - Terminal UI
- `ioredis` - Redis client
- `tree-sitter` - AST parsing
- `tree-sitter-javascript/typescript` - JS/TS parsers
- `ollama` - LLM client
- `simple-git` - Git operations
- `chokidar` - File watching
- `commander` - CLI framework
- `zod` - Validation
- `ignore` - Gitignore parsing

**Development tools (shared):**
- Vitest for testing (80% coverage threshold)
- ESLint with TypeScript strict rules
- Prettier (4-space indentation)
- `@vitest/ui` - Interactive testing UI
- `@vitest/coverage-v8` - Coverage reporting

## Development Workflow

### Complete Feature Development & Release Workflow

This workflow ensures high quality and consistency from feature implementation to package publication.

#### Phase 1: Feature Planning & Implementation

```bash
# 1. Create feature branch (if needed)
git checkout -b feature/your-feature-name

# 2. Implement feature following Clean Architecture
# - Add to appropriate layer (domain/application/infrastructure/cli)
# - Follow naming conventions
# - Keep functions small and focused

# 3. Update constants if adding CLI options
# Edit: packages/guardian/src/cli/constants.ts
```

#### Phase 2: Quality Checks (Run After Implementation)

```bash
# Navigate to package
cd packages/guardian

# 1. Format code (REQUIRED - 4 spaces indentation)
pnpm format

# 2. Build to check compilation
pnpm build

# 3. Run linter (must pass with 0 errors, 0 warnings)
cd ../.. && pnpm eslint "packages/**/*.ts" --fix

# 4. Run tests (all must pass)
pnpm test:run

# 5. Check coverage (must be ≥80%)
pnpm test:coverage
```

**Quality Gates:**
- ✅ Format: No changes after `pnpm format`
- ✅ Build: TypeScript compiles without errors
- ✅ Lint: 0 errors, 0 warnings
- ✅ Tests: All tests pass (292/292)
- ✅ Coverage: ≥80% on all metrics

#### Phase 3: Documentation Updates

```bash
# 1. Update README.md
# - Add new feature to Features section
# - Update CLI Usage examples if CLI changed
# - Update API documentation if public API changed
# - Update TypeScript interfaces

# 2. Update TODO.md
# - Mark completed tasks as done
# - Add new technical debt if discovered
# - Document coverage issues for new files
# - Update "Recent Updates" section with changes

# 3. Update CHANGELOG.md (for releases)
# - Add entry with version number
# - List all changes (features, fixes, improvements)
# - Follow Keep a Changelog format
```

#### Phase 4: Verification & Testing

```bash
# 1. Test CLI manually with examples
cd packages/guardian
node dist/cli/index.js check ./examples --limit 5

# 2. Test new feature with different options
node dist/cli/index.js check ./examples --only-critical
node dist/cli/index.js check ./examples --min-severity high

# 3. Verify output formatting and messages
# - Check that all violations display correctly
# - Verify severity labels and suggestions
# - Test edge cases and error handling

# 4. Run full quality check suite
pnpm format && pnpm eslint "packages/**/*.ts" && pnpm build && pnpm test:run
```

#### Phase 5: Commit & Version

```bash
# 1. Stage changes
git add .

# 2. Commit with Conventional Commits format
git commit -m "feat: add --limit option for output control"
# or
git commit -m "fix: resolve unused variable in detector"
# or
git commit -m "docs: update README with new features"

# Types: feat, fix, docs, style, refactor, test, chore

# 3. Update package version (if releasing)
cd packages/guardian
npm version patch  # Bug fixes (0.5.2 → 0.5.3)
npm version minor  # New features (0.5.2 → 0.6.0)
npm version major  # Breaking changes (0.5.2 → 1.0.0)

# 4. Push changes
git push origin main  # or your branch
git push --tags      # Push version tags
```

#### Phase 6: Publication (Maintainers Only)

```bash
# 1. Final verification before publish
cd packages/guardian
pnpm build && pnpm test:run && pnpm test:coverage

# 2. Verify package contents
npm pack --dry-run

# 3. Publish to npm
npm publish --access public

# 4. Verify publication
npm info @samiyev/guardian

# 5. Test installation
npm install -g @samiyev/guardian@latest
guardian --version
```

### Quick Checklist for New Features

**Before Committing:**
- [ ] Feature implemented in correct layer
- [ ] Code formatted with `pnpm format`
- [ ] Lint passes: `pnpm eslint "packages/**/*.ts"`
- [ ] Build succeeds: `pnpm build`
- [ ] All tests pass: `pnpm test:run`
- [ ] Coverage ≥80%: `pnpm test:coverage`
- [ ] CLI tested manually if CLI changed
- [ ] README.md updated with examples
- [ ] TODO.md updated with progress
- [ ] No `console.log` in production code
- [ ] TypeScript interfaces documented

**Before Publishing:**
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] All quality gates pass
- [ ] Examples work correctly
- [ ] Git tags pushed

### Common Workflows

**Adding a new CLI option:**
```bash
# 1. Add to cli/constants.ts (CLI_OPTIONS, CLI_DESCRIPTIONS)
# 2. Add option in cli/index.ts (.option() call)
# 3. Parse and use option in action handler
# 4. Test with: node dist/cli/index.js check ./examples --your-option
# 5. Update README.md CLI Usage section
# 6. Run quality checks
```

**Adding a new detector:**
```bash
# 1. Create value object in domain/value-objects/
# 2. Create detector in infrastructure/analyzers/
# 3. Add detector interface to domain/services/
# 4. Integrate in application/use-cases/AnalyzeProject.ts
# 5. Add CLI output in cli/index.ts
# 6. Write tests (aim for >90% coverage)
# 7. Update README.md Features section
# 8. Run full quality suite
```

**Fixing technical debt:**
```bash
# 1. Find issue in TODO.md
# 2. Implement fix
# 3. Run quality checks
# 4. Update TODO.md (mark as completed)
# 5. Commit with type: "refactor:" or "fix:"
```

### Debugging Tips

**Build errors:**
```bash
# Check TypeScript errors in detail
pnpm tsc --noEmit

# Check specific file
pnpm tsc --noEmit packages/guardian/src/path/to/file.ts
```

**Test failures:**
```bash
# Run single test file
pnpm vitest tests/path/to/test.test.ts

# Run tests with UI
pnpm test:ui

# Run tests in watch mode for debugging
pnpm test
```

**Coverage issues:**
```bash
# Generate detailed coverage report
pnpm test:coverage

# View HTML report
open coverage/index.html

# Check specific file coverage
pnpm vitest --coverage --reporter=verbose
```

## Important Notes

- **Always run `pnpm format` before committing** to ensure 4-space indentation
- **Fix ESLint warnings incrementally** - they indicate real type safety issues
- **Coverage is enforced** - maintain 80% coverage for all metrics when running `pnpm test:coverage`
- **Test CLI manually** - automated tests don't cover CLI output formatting
- **Update documentation** - README.md and TODO.md should always reflect current state
- **Follow Clean Architecture** - keep layers separate and dependencies flowing inward