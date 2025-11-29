# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Puaros is a TypeScript monorepo using pnpm workspaces. Contains two packages:

- **`@puaros/guardian`** - Code quality guardian for detecting hardcoded values, circular dependencies, framework leaks, naming violations, and architecture violations.

- **`@puaros/ipuaro`** - Local AI agent for codebase operations with "infinite" context feeling. Uses lazy loading, Redis persistence, tree-sitter AST parsing, and Ollama LLM integration.

The project uses Node.js 22.18.0 (see `.nvmrc`).

## Path Reference

**Root:** `/Users/fozilbeksamiyev/projects/ailabs/puaros`

### Key Paths

| Description | Path |
|-------------|------|
| **Root** | `.` |
| **Guardian package** | `packages/guardian` |
| **Guardian src** | `packages/guardian/src` |
| **Guardian tests** | `packages/guardian/tests` |
| **Guardian CLI** | `packages/guardian/src/cli` |
| **Guardian domain** | `packages/guardian/src/domain` |
| **Guardian infrastructure** | `packages/guardian/src/infrastructure` |
| **ipuaro package** | `packages/ipuaro` |
| **ipuaro docs** | `packages/ipuaro/docs` |

### File Locations

| File | Location |
|------|----------|
| Root package.json | `./package.json` |
| Guardian package.json | `packages/guardian/package.json` |
| Guardian tsconfig | `packages/guardian/tsconfig.json` |
| Guardian TODO | `packages/guardian/TODO.md` |
| Guardian CHANGELOG | `packages/guardian/CHANGELOG.md` |
| ipuaro ROADMAP | `packages/ipuaro/ROADMAP.md` |
| ESLint config | `./eslint.config.mjs` |
| Prettier config | `./.prettierrc` |
| Base tsconfig | `./tsconfig.base.json` |

### Path Rules

1. **Always use relative paths from project root** (not absolute)
2. **Package paths start with** `packages/<name>/`
3. **Source code is in** `packages/<name>/src/`
4. **Tests are in** `packages/<name>/tests/`
5. **Docs are in** `packages/<name>/docs/` or `./docs/`

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

**Monorepo format:** `<type>(<package>): <subject>`

Examples:
- `feat(guardian): add circular dependency detector`
- `fix(ipuaro): resolve memory leak in indexer`
- `docs(guardian): update CLI usage examples`
- `refactor(ipuaro): extract tool registry`

**Root-level changes:** `<type>: <subject>` (no scope)
- `chore: update eslint config`
- `docs: update root README`

**Types:** feat, fix, docs, style, refactor, test, chore

**Rules:**
- Imperative mood, no caps, max 50 chars
- Do NOT add "Generated with Claude Code" footer
- Do NOT add "Co-Authored-By: Claude"

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

## Monorepo Versioning Strategy

### Git Tag Format

**Prefixed tags for each package:**
```
guardian-v0.5.0
ipuaro-v0.1.0
```

**Why prefixed tags:**
- Independent versioning per package
- Clear release history for each package
- Works with npm publish and CI/CD
- Easy to filter: `git tag -l "guardian-*"`

**Legacy tags:** Tags before monorepo (v0.1.0, v0.2.0, etc.) are kept as-is for historical reference.

### Semantic Versioning

All packages follow SemVer: `MAJOR.MINOR.PATCH`

- **MAJOR** (1.0.0) - Breaking API changes
- **MINOR** (0.1.0) - New features, backwards compatible
- **PATCH** (0.0.1) - Bug fixes, backwards compatible

**Pre-1.0 policy:** Minor bumps (0.x.0) may include breaking changes.

## Release Pipeline

**Quick reference:** Say "run pipeline for [package]" to execute full release flow.

The pipeline has 6 phases. Each phase must pass before proceeding.

### Phase 1: Quality Gates

```bash
cd packages/<package>

# All must pass:
pnpm format                              # 4-space indentation
pnpm build                               # TypeScript compiles
cd ../.. && pnpm eslint "packages/**/*.ts" --fix  # 0 errors, 0 warnings
cd packages/<package>
pnpm test:run                            # All tests pass
pnpm test:coverage                       # Coverage ≥80%
```

### Phase 2: Documentation

Update these files in `packages/<package>/`:

| File | Action |
|------|--------|
| `README.md` | Add feature docs, update CLI usage, update API |
| `TODO.md` | Mark completed tasks, add new tech debt if any |
| `CHANGELOG.md` | Add version entry with all changes |
| `ROADMAP.md` | Update if milestone completed |

**Tech debt rule:** If implementation leaves known issues, shortcuts, or future improvements needed — add them to TODO.md before committing.

### Phase 3: Manual Testing

```bash
cd packages/<package>

# Test CLI/API manually
node dist/cli/index.js <command> ./examples

# Verify output, edge cases, error handling
```

### Phase 4: Commit

```bash
git add .
git commit -m "<type>(<package>): <description>"

# Examples:
# feat(guardian): add --limit option
# fix(ipuaro): resolve memory leak in indexer
# docs(guardian): update API examples
```

**Commit types:** feat, fix, docs, style, refactor, test, chore

### Phase 5: Version & Tag

```bash
cd packages/<package>

# Bump version
npm version patch  # 0.5.2 → 0.5.3 (bug fix)
npm version minor  # 0.5.2 → 0.6.0 (new feature)
npm version major  # 0.5.2 → 1.0.0 (breaking change)

# Create prefixed git tag
git tag <package>-v<version>
# Example: git tag guardian-v0.6.0

# Push
git push origin main
git push origin <package>-v<version>
```

### Phase 6: Publish (Maintainers Only)

```bash
cd packages/<package>

# Final verification
pnpm build && pnpm test:run && pnpm test:coverage

# Check package contents
npm pack --dry-run

# Publish
npm publish --access public

# Verify
npm info @puaros/<package>
```

## Pipeline Checklist

Copy and use for each release:

```markdown
## Release: <package> v<version>

### Quality Gates
- [ ] `pnpm format` - no changes
- [ ] `pnpm build` - compiles
- [ ] `pnpm eslint` - 0 errors, 0 warnings
- [ ] `pnpm test:run` - all pass
- [ ] `pnpm test:coverage` - ≥80%

### Documentation
- [ ] README.md updated
- [ ] TODO.md - completed tasks marked, new debt added
- [ ] CHANGELOG.md - version entry added
- [ ] ROADMAP.md updated (if needed)

### Testing
- [ ] CLI/API tested manually
- [ ] Edge cases verified

### Release
- [ ] Commit with conventional format
- [ ] Version bumped in package.json
- [ ] Git tag created: <package>-v<version>
- [ ] Pushed to origin
- [ ] Published to npm (if public release)
```

## Common Workflows

### Adding a new CLI option

```bash
# 1. Add to cli/constants.ts (CLI_OPTIONS, CLI_DESCRIPTIONS)
# 2. Add option in cli/index.ts (.option() call)
# 3. Parse and use option in action handler
# 4. Test: node dist/cli/index.js <command> --your-option
# 5. Run pipeline
```

### Adding a new detector (guardian)

```bash
# 1. Create value object in domain/value-objects/
# 2. Create detector in infrastructure/analyzers/
# 3. Add interface to domain/services/
# 4. Integrate in application/use-cases/AnalyzeProject.ts
# 5. Add CLI output in cli/index.ts
# 6. Write tests (aim for >90% coverage)
# 7. Run pipeline
```

### Adding a new tool (ipuaro)

```bash
# 1. Define tool schema in infrastructure/tools/schemas/
# 2. Implement tool in infrastructure/tools/
# 3. Register in infrastructure/tools/index.ts
# 4. Add tests
# 5. Run pipeline
```

### Fixing technical debt

```bash
# 1. Find issue in TODO.md
# 2. Implement fix
# 3. Update TODO.md (mark as completed)
# 4. Run pipeline with type: "refactor:" or "fix:"
```

## Debugging Tips

**Build errors:**
```bash
pnpm tsc --noEmit
pnpm tsc --noEmit packages/<package>/src/path/to/file.ts
```

**Test failures:**
```bash
pnpm vitest tests/path/to/test.test.ts
pnpm test:ui
```

**Coverage issues:**
```bash
pnpm test:coverage
open coverage/index.html
```

## Important Notes

- **Always run `pnpm format` before committing** to ensure 4-space indentation
- **Fix ESLint warnings incrementally** - they indicate real type safety issues
- **Coverage is enforced** - maintain 80% coverage for all metrics when running `pnpm test:coverage`
- **Test CLI manually** - automated tests don't cover CLI output formatting
- **Update documentation** - README.md and TODO.md should always reflect current state
- **Follow Clean Architecture** - keep layers separate and dependencies flowing inward