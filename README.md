# Puaros

A TypeScript monorepo for code quality and analysis tools.

## Packages

- **[@puaros/guardian](./packages/guardian)** - Research-backed code quality guardian for vibe coders and enterprise teams. Detects hardcoded values, secrets, circular dependencies, architecture violations, and anemic domain models. Every rule is based on academic research, industry standards (OWASP, SonarQube), and authoritative books (Martin Fowler, Uncle Bob, Eric Evans). Perfect for AI-assisted development and enforcing Clean Architecture at scale.

- **[@puaros/ipuaro](./packages/ipuaro)** - Local AI agent for codebase operations with "infinite" context feeling. Uses lazy loading and smart context management to work with codebases of any size. Features 18 LLM tools for reading, editing, searching, and analyzing code. Built with Ink/React TUI, Redis persistence, tree-sitter AST parsing, and Ollama integration.

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

# Guardian package testing
cd packages/guardian

# Run tests with coverage (80% threshold required)
pnpm test:coverage

# Run tests with UI
pnpm test:ui

# Run tests once (no watch mode)
pnpm test:run

# Run tests in watch mode
pnpm test:watch
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
│   ├── guardian/              # @puaros/guardian - Code quality analyzer
│   │   ├── src/               # Source files (Clean Architecture)
│   │   │   ├── domain/        # Domain layer
│   │   │   ├── application/   # Application layer
│   │   │   ├── infrastructure/# Infrastructure layer
│   │   │   ├── cli/           # CLI implementation
│   │   │   └── shared/        # Shared utilities
│   │   ├── bin/               # CLI entry point
│   │   ├── tests/             # Unit and integration tests
│   │   └── examples/          # Usage examples
│   └── ipuaro/                # @puaros/ipuaro - Local AI agent
│       ├── src/               # Source files (Clean Architecture)
│       │   ├── domain/        # Entities, value objects, services
│       │   ├── application/   # Use cases, DTOs, mappers
│       │   ├── infrastructure/# Storage, LLM, indexer, tools
│       │   ├── tui/           # Terminal UI (Ink/React)
│       │   ├── cli/           # CLI commands
│       │   └── shared/        # Types, constants, utils
│       ├── bin/               # CLI entry point
│       ├── tests/             # Unit and E2E tests
│       └── examples/          # Demo projects
├── pnpm-workspace.yaml        # Workspace configuration
├── tsconfig.base.json         # Shared TypeScript config
├── eslint.config.mjs          # ESLint configuration
├── .prettierrc                # Prettier configuration
├── LINTING.md                 # Code style guidelines
├── CLAUDE.md                  # AI assistant guidance
└── README.md                  # This file
```

## Code Style

This project follows strict TypeScript and code quality standards:

- **Indentation:** 4 spaces (enforced by Prettier)
- **Line Length:** 100 characters maximum
- **Quotes:** Double quotes
- **Semicolons:** Never used
- **Trailing Commas:** Always in multiline
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

## Guardian Package

The `@puaros/guardian` package is a code quality analyzer for both individual developers and enterprise teams:

### Features

- **Hardcode Detection**: Detects magic numbers and magic strings with context-aware analysis
- **Circular Dependency Detection**: Finds import cycles in your codebase
- **Naming Convention Validation**: Enforces layer-based naming rules (Domain, Application, Infrastructure)
- **Architecture Governance**: Enforces Clean Architecture boundaries across teams
- **CLI Tool**: Command-line interface with `guardian` command
- **CI/CD Integration**: JSON/Markdown output for automation pipelines

### 📚 Research-Backed Rules

Guardian's detection rules are based on decades of software engineering research and industry best practices:

- **Academic Research**: MIT Course 6.031, ScienceDirect peer-reviewed studies (2020-2023), IEEE papers on Technical Debt
- **Industry Standards**: SonarQube (400,000+ organizations), Google/Airbnb/Microsoft style guides, OWASP security standards
- **Authoritative Books**:
  - Clean Architecture (Robert C. Martin, 2017)
  - Implementing Domain-Driven Design (Vaughn Vernon, 2013)
  - Domain-Driven Design (Eric Evans, 2003)
  - Patterns of Enterprise Application Architecture (Martin Fowler, 2002)
- **Security Standards**: OWASP Secrets Management, GitHub Secret Scanning (350+ patterns)

**Every rule links to research citations** - see [Why Guardian's Rules Matter](./packages/guardian/docs/WHY.md) and [Full Research Citations](./packages/guardian/docs/RESEARCH_CITATIONS.md) for complete academic papers, books, and expert references.

### Use Cases

**For Vibe Coders:**
- ⚡ AI writes code → Guardian reviews → AI fixes → Ship
- 🎯 Catch hardcoded secrets before production
- 📚 Learn Clean Architecture patterns as you code

**For Enterprise Teams:**
- 🏢 Enforce architectural standards across 100+ developers
- 🔒 Prevent security incidents (hardcoded credentials)
- 📊 Track technical debt metrics over time
- 👥 Faster onboarding with automated feedback
- 🤖 Safe AI adoption with quality gates

### Architecture

Built with Clean Architecture principles:
- **Domain Layer**: Core business logic (entities, value objects, domain services)
- **Application Layer**: Use cases, DTOs, and mappers
- **Infrastructure Layer**: External concerns (parsers, analyzers, file scanners)
- **CLI Layer**: Command-line interface

### Usage

```bash
# Install dependencies
cd packages/guardian && pnpm install

# Build the package
pnpm build

# Run tests
pnpm test

# Use the CLI (after building)
node bin/guardian.js analyze <project-path>

# CI/CD integration
guardian check ./src --format json > report.json
guardian check ./src --fail-on hardcode --fail-on circular
```

## ipuaro Package

The `@puaros/ipuaro` package is a local AI agent for codebase operations:

### Features

- **Infinite Context Feeling**: Lazy loading and smart context management for any codebase size
- **18 LLM Tools**: Read, edit, search, analyze code through natural language
- **Terminal UI**: Full-featured TUI built with Ink/React
- **Redis Persistence**: Sessions, undo stack, and project index stored in Redis
- **AST Parsing**: tree-sitter for TypeScript/JavaScript analysis
- **File Watching**: Real-time index updates via chokidar
- **Security**: Blacklist/whitelist for command execution

### Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js + TypeScript |
| TUI | Ink (React for terminal) |
| Storage | Redis with AOF persistence |
| AST | tree-sitter (ts, tsx, js, jsx) |
| LLM | Ollama (qwen2.5-coder:7b-instruct) |
| Git | simple-git |
| File watching | chokidar |

### Tools (18 total)

| Category | Tools |
|----------|-------|
| **Read** | get_lines, get_function, get_class, get_structure |
| **Edit** | edit_lines, create_file, delete_file |
| **Search** | find_references, find_definition |
| **Analysis** | get_dependencies, get_dependents, get_complexity, get_todos |
| **Git** | git_status, git_diff, git_commit |
| **Run** | run_command, run_tests |

### Architecture

Built with Clean Architecture principles:
- **Domain Layer**: Entities, value objects, service interfaces
- **Application Layer**: Use cases, DTOs, mappers
- **Infrastructure Layer**: Redis storage, Ollama client, indexer, tools
- **TUI Layer**: Ink/React components and hooks
- **CLI Layer**: Commander.js entry point

### Usage

```bash
# Start TUI in current directory
ipuaro

# Start in specific directory
ipuaro /path/to/project

# Index only (no TUI)
ipuaro index

# With auto-apply mode
ipuaro --auto-apply
```

### Commands

| Command | Description |
|---------|-------------|
| `/help` | Show all commands |
| `/clear` | Clear chat history |
| `/undo` | Revert last file change |
| `/sessions` | Manage sessions |
| `/status` | System status |
| `/reindex` | Force reindexation |

## Dependencies

Guardian package uses:

- `commander` - CLI framework
- `simple-git` - Git operations
- `tree-sitter` - Abstract syntax tree parsing
- `tree-sitter-javascript` - JavaScript parser
- `tree-sitter-typescript` - TypeScript parser
- `uuid` - UUID generation

Development tools:

- Vitest - Testing framework with 80% coverage thresholds
- `@vitest/ui` - Interactive testing UI
- `@vitest/coverage-v8` - Coverage reporting
- ESLint + TypeScript ESLint - Strict type checking and linting
- Prettier - Code formatting (4-space indentation)

## Contributing

1. Ensure Node.js version matches `.nvmrc` (22.18.0)
2. Run `pnpm format` before committing to ensure consistent formatting
3. All tests must pass with 80% coverage
4. Fix all ESLint warnings - they indicate real type safety issues

## License

MIT - Copyright (c) Fozilbek Samiyev