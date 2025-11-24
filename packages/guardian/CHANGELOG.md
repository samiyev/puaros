# Changelog

All notable changes to @samiyev/guardian will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.3] - 2025-11-24

### Fixed

**🐛 Repository Pattern Detection - Reduced False Positives**

Fixed overly strict repository method name validation that was flagging valid DDD patterns as violations.

- ✅ **Added support for common DDD repository patterns:**
  - `has*()` methods - e.g., `hasProject()`, `hasPermission()`
  - `is*()` methods - e.g., `isCached()`, `isActive()`
  - `exists*()` methods - e.g., `existsById()`, `existsByEmail()`
  - `clear*()` methods - e.g., `clearCache()`, `clearAll()`
  - `store*()` methods - e.g., `storeMetadata()`, `storeFile()`
  - Lifecycle methods: `initialize()`, `close()`, `connect()`, `disconnect()`

- 🎯 **Impact:**
  - Reduced false positives in real-world DDD projects
  - Better alignment with Domain-Driven Design best practices
  - More practical for cache repositories, connection management, and business queries

- 📚 **Why these patterns are valid:**
  - Martin Fowler's Repository Pattern allows domain-specific query methods
  - DDD recommends using ubiquitous language in method names
  - Lifecycle methods are standard for resource management in repositories

### Technical

- Updated `domainMethodPatterns` in `RepositoryPatternDetector.ts` with 11 additional valid patterns
- All existing functionality remains unchanged

## [0.6.2] - 2025-11-24

### Added

**📚 Research-Backed Documentation**

Guardian's detection rules are now backed by scientific research and industry standards!

- ✅ **New Documentation**
  - `docs/WHY.md` - User-friendly explanations for each rule with authoritative sources
  - `docs/RESEARCH_CITATIONS.md` - Complete academic and industry references (551 lines)
  - Organized by detection type with quick navigation

- ✅ **Micro-Citations in README**
  - Each feature now includes one-line citation with "Why?" link
  - Examples: "Based on MIT 6.031, SonarQube RSPEC-109"
  - Non-intrusive, opt-in for users who want to learn more

- ✅ **CLI Help Enhancement**
  - Added "BACKED BY RESEARCH" section to `--help` output
  - Mentions MIT, Martin Fowler, Robert C. Martin, industry standards
  - Link to full documentation

### Changed

- **Documentation Structure**: Moved `RESEARCH_CITATIONS.md` to `docs/` directory for better organization
- **All internal links updated** to reflect new documentation structure

### Backed By

Our rules are supported by:
- 🎓 **Academia**: MIT Course 6.031, ScienceDirect peer-reviewed studies
- 📚 **Books**: Clean Architecture (Martin 2017), DDD (Evans 2003), Enterprise Patterns (Fowler 2002)
- 🏢 **Industry**: Google, Microsoft, Airbnb style guides, SonarQube standards
- 👨‍🏫 **Experts**: Martin Fowler, Robert C. Martin, Eric Evans, Alistair Cockburn

## [0.6.1] - 2025-11-24

### Improved

**📖 Enhanced CLI Help System**

Guardian's `--help` command is now comprehensive and AI-agent-friendly!

- ✅ **Detailed Main Help**
  - Complete detector descriptions with quick fix instructions
  - Severity level explanations (CRITICAL → LOW)
  - Step-by-step workflow guide for fixing violations
  - 7 practical usage examples
  - "HOW TO FIX COMMON ISSUES" reference section

- ✅ **Better Organization**
  - Clear DETECTS section with all 8 violation types
  - Each detector includes → what to do to fix it
  - Severity system with priority guidance
  - Examples cover all major use cases

- ✅ **AI Agent Ready**
  - Help output provides complete context for autonomous agents
  - Actionable instructions for each violation type
  - Clear workflow: run → review → fix → verify

### Fixed

- **Code Quality**: Extracted all hardcoded strings from help text to constants
  - Moved 17 magic strings to `CLI_HELP_TEXT` constant
  - Improved maintainability and i18n readiness
  - Follows Clean Code principles (Single Source of Truth)

### Technical

- All CLI help strings now use `CLI_HELP_TEXT` from constants
- Zero hardcode violations in Guardian's own codebase
- Passes all quality checks (format, lint, build, self-check)

## [0.6.0] - 2025-11-24

### Added

**🎯 Output Limit Control**

Guardian now supports limiting detailed violation output for large codebases!

- ✅ **--limit Option**
  - Limit detailed violation output per category: `guardian check src --limit 10`
  - Short form: `-l <number>`
  - Works with severity filters: `guardian check src --only-critical --limit 5`
  - Shows warning when violations exceed limit
  - Full statistics always displayed

**📋 Severity Display Constants**

- Extracted severity labels and headers to reusable constants
- Improved CLI maintainability and consistency
- `SEVERITY_DISPLAY_LABELS` and `SEVERITY_SECTION_HEADERS`

**📚 Complete Development Workflow**

- Added comprehensive workflow documentation to CLAUDE.md
- 6-phase development process (Planning → Quality → Documentation → Verification → Commit → Publication)
- Quick checklists for new features
- Common workflows and debugging tips

### Changed

- **ESLint Configuration**: Optimized with CLI-specific overrides, reduced warnings from 129 to 0
- **Documentation**: Updated README with all 8 detector types and latest statistics
- **TODO**: Added technical debt tracking for low-coverage files

### Fixed

- Removed unused `SEVERITY_LEVELS` import from AnalyzeProject.ts
- Fixed unused `fileName` variable in HardcodeDetector.ts
- Replaced `||` with `??` for nullish coalescing

### Removed

- Deleted unused `IBaseRepository` interface (dead code)
- Fixed repository pattern violations detected by Guardian on itself

### Technical Details

- All 292 tests passing (100% pass rate)
- Coverage: 90.63% statements, 82.19% branches, 83.51% functions
- ESLint: 0 errors, 0 warnings
- Guardian self-check: ✅ No issues found
- No breaking changes - fully backwards compatible

## [0.5.2] - 2025-11-24

### Added

**🎯 Severity-Based Prioritization**

Guardian now intelligently prioritizes violations by severity, helping teams focus on critical issues first!

- ✅ **Severity Levels**
  - 🔴 **CRITICAL**: Circular dependencies, Repository pattern violations
  - 🟠 **HIGH**: Dependency direction violations, Framework leaks, Entity exposures
  - 🟡 **MEDIUM**: Naming violations, Architecture violations
  - 🟢 **LOW**: Hardcoded values

- ✅ **Automatic Sorting**
  - All violations automatically sorted by severity (most critical first)
  - Applied in AnalyzeProject use case before returning results
  - Consistent ordering across all detection types

- ✅ **CLI Filtering Options**
  - `--min-severity <level>` - Show only violations at specified level and above
  - `--only-critical` - Quick filter for critical issues only
  - Examples:
    - `guardian check src --only-critical`
    - `guardian check src --min-severity high`

- ✅ **Enhanced CLI Output**
  - Color-coded severity labels (🔴🟠🟡🟢)
  - Visual severity group headers with separators
  - Severity displayed for each violation
  - Clear filtering messages when filters active

### Changed

- Updated all violation interfaces to include `severity: SeverityLevel` field
- Improved CLI presentation with grouped severity display
- Enhanced developer experience with visual prioritization

### Technical Details

- All 292 tests passing (100% pass rate)
- Coverage: 90.63% statements, 82.19% branches, 83.51% functions
- No breaking changes - fully backwards compatible
- Clean Architecture principles maintained

---

## [0.5.1] - 2025-11-24

### Changed

**🧹 Code Quality Refactoring**

Major internal refactoring to eliminate hardcoded values and improve maintainability - Guardian now fully passes its own quality checks!

- ✅ **Extracted Constants**
  - All RepositoryViolation messages moved to domain constants (Messages.ts)
  - All framework leak template strings centralized
  - All layer paths moved to infrastructure constants (paths.ts)
  - All regex patterns extracted to IMPORT_PATTERNS constant
  - 30+ new constants added for better maintainability

- ✅ **New Constants Files**
  - `src/infrastructure/constants/paths.ts` - Layer paths, CLI paths, import patterns
  - Extended `src/domain/constants/Messages.ts` - 25+ repository pattern messages
  - Extended `src/shared/constants/rules.ts` - Package placeholder constant

- ✅ **Self-Validation Achievement**
  - Reduced hardcoded values from 37 to 1 (97% improvement)
  - Guardian now passes its own `src/` directory checks with 0 violations
  - Only acceptable hardcode remaining: bin/guardian.js entry point path
  - All 292 tests still passing (100% pass rate)

- ✅ **Improved Code Organization**
  - Better separation of concerns
  - More maintainable codebase
  - Easier to extend with new features
  - Follows DRY principle throughout

### Technical Details

- No breaking changes - fully backwards compatible
- All functionality preserved
- Test suite: 292 tests passing
- Coverage: 96.77% statements, 83.82% branches

---

## [0.5.0] - 2025-11-24

### Added

**📚 Repository Pattern Validation**

Validate proper implementation of the Repository Pattern to ensure domain remains decoupled from infrastructure.

- ✅ **ORM Type Detection in Interfaces**
  - Detects ORM-specific types (Prisma, TypeORM, Mongoose) in domain repository interfaces
  - Ensures repository interfaces remain persistence-agnostic
  - Supports detection of 25+ ORM type patterns
  - Provides fix suggestions with clean domain examples

- ✅ **Concrete Repository Usage Detection**
  - Identifies use cases depending on concrete repository implementations
  - Enforces Dependency Inversion Principle
  - Validates constructor and field dependency types
  - Suggests using repository interfaces instead

- ✅ **Repository Instantiation Detection**
  - Detects `new Repository()` in use cases
  - Enforces Dependency Injection pattern
  - Identifies hidden dependencies
  - Provides DI container setup guidance

- ✅ **Domain Language Validation**
  - Checks repository methods use domain terminology
  - Rejects technical database terms (findOne, insert, query, execute)
  - Promotes ubiquitous language across codebase
  - Suggests business-oriented method names

- ✅ **Smart Violation Reporting**
  - RepositoryViolation value object with detailed context
  - Four violation types: ORM types, concrete repos, new instances, technical names
  - Provides actionable fix suggestions
  - Shows before/after code examples

- ✅ **Comprehensive Test Coverage**
  - 31 new tests for repository pattern detection
  - 292 total tests passing (100% pass rate)
  - Integration tests for multiple violation types
  - 96.77% statement coverage, 83.82% branch coverage

- ✅ **Documentation & Examples**
  - 6 example files (3 bad patterns, 3 good patterns)
  - Comprehensive README with patterns and principles
  - Examples for ORM types, concrete repos, DI, and domain language
  - Demonstrates Clean Architecture and SOLID principles

### Changed

- Updated test count: 261 → 292 tests
- Added REPOSITORY_PATTERN rule to constants
- Extended AnalyzeProject use case with repository pattern detection
- Added REPOSITORY_VIOLATION_TYPES constant with 4 violation types
- ROADMAP updated with completed repository pattern validation (v0.5.0)

---

## [0.4.0] - 2025-11-24

### Added

**🔀 Dependency Direction Enforcement**

Enforce Clean Architecture dependency rules to prevent architectural violations across layers.

- ✅ **Dependency Direction Detector**
  - Validates that dependencies flow in the correct direction
  - Domain layer can only import from Domain and Shared
  - Application layer can only import from Domain, Application, and Shared
  - Infrastructure layer can import from all layers
  - Shared layer can be imported by all layers

- ✅ **Smart Violation Reporting**
  - DependencyViolation value object with detailed context
  - Provides fix suggestions with concrete examples
  - Shows both violating import and suggested layer placement
  - CLI output with severity indicators

- ✅ **Comprehensive Test Coverage**
  - 43 new tests for dependency direction detection
  - 100% test pass rate (261 total tests)
  - Examples for both good and bad architecture patterns

- ✅ **Documentation & Examples**
  - Good architecture examples for all layers
  - Bad architecture examples showing common violations
  - Demonstrates proper layer separation

### Changed

- Updated test count: 218 → 261 tests
- Optimized extractLayerFromImport method to reduce complexity
- Updated getExampleFix to avoid false positives
- ROADMAP updated with completed dependency direction feature

---

## [0.3.0] - 2025-11-24

### Added

**🚫 Entity Exposure Detection**

Prevent domain entities from leaking to API responses, enforcing proper DTO usage at boundaries.

- ✅ **Entity Exposure Detector**
  - Detects when controllers/routes return domain entities instead of DTOs
  - Scans infrastructure layer (controllers, routes, handlers, resolvers, gateways)
  - Identifies PascalCase entities without Dto/Request/Response suffixes
  - Parses async methods with Promise<T> return types

- ✅ **Smart Remediation Suggestions**
  - EntityExposure value object with step-by-step fix guidance
  - Suggests creating DTOs with proper naming
  - Provides mapper implementation examples
  - Shows how to separate domain from presentation concerns

- ✅ **Comprehensive Test Coverage**
  - 24 new tests for entity exposure detection (98% coverage)
  - EntityExposureDetector: 98.07% coverage
  - Overall project: 90.6% statements, 83.97% branches

- ✅ **Documentation & Examples**
  - BadUserController and BadOrderController examples
  - GoodUserController showing proper DTO usage
  - Integration with CLI for helpful output

### Changed

- Updated test count: 194 → 218 tests
- Added entity exposure to violation pipeline
- ROADMAP updated with completed entity exposure feature

---

## [0.2.0] - 2025-11-24

### Added

**🔌 Framework Leak Detection**

Major new feature to detect framework-specific imports in domain layer, ensuring Clean Architecture compliance.

- ✅ **Framework Leak Detector**
  - Detects 250+ framework patterns across 12 categories
  - HTTP frameworks: Express, Fastify, Koa, Hapi, NestJS, etc.
  - ORMs/Databases: Prisma, TypeORM, Sequelize, Mongoose, Drizzle, etc.
  - Loggers: Winston, Pino, Bunyan, Log4js, etc.
  - Caches: Redis, IORedis, Memcached, etc.
  - Message Queues: Bull, BullMQ, KafkaJS, RabbitMQ, etc.
  - And 7 more categories (HTTP clients, validation, DI, email, storage, testing, templates)

- ✅ **Smart Violation Reporting**
  - Framework type categorization
  - Detailed suggestions for proper abstraction
  - CLI output with severity indicators
  - Integration with existing violation pipeline

- ✅ **Comprehensive Test Coverage**
  - 35 new tests for framework leak detection
  - 100% coverage of detection logic
  - Examples for all major framework types

- ✅ **Documentation & Examples**
  - New bad architecture examples showing framework leaks
  - Updated README with framework leak detection section
  - Integration guides for preventing framework coupling

### Changed

- Updated test count: 159 → 194 tests across 7 files
- Updated examples: 36 → 38 files (29 good + 9 bad)
- CLI now reports 5 types of violations (added framework leaks)

---

## [0.1.0] - 2025-11-24

### Added

**🎉 Initial Release of @samiyev/guardian**

Code quality guardian for vibe coders and enterprise teams - your AI coding companion that keeps code clean while you move fast.

#### Core Features

- ✨ **Hardcode Detection**
  - Detects magic numbers (timeouts, ports, limits, retries, delays)
  - Detects magic strings (URLs, connection strings, API endpoints, error messages)
  - Smart context analysis to reduce false positives
  - Automatic constant name suggestions based on context
  - Location suggestions for extracted constants (domain/shared/infrastructure)
  - Ignores allowed numbers: -1, 0, 1, 2, 10, 100, 1000
  - Ignores console.log, imports, tests, and exported constants

- 🔄 **Circular Dependency Detection**
  - Detects import cycles in codebase (A → B → A, A → B → C → A, etc.)
  - Shows complete dependency chain for each cycle
  - CLI output with detailed cycle path and severity
  - Supports detection of multiple independent cycles
  - Handles complex graphs with both cyclic and acyclic parts

- 📝 **Naming Convention Enforcement**
  - Layer-based naming rules for Clean Architecture
  - **Domain Layer:**
    - Entities: PascalCase nouns (User.ts, Order.ts)
    - Services: *Service suffix (UserService.ts)
    - Repository interfaces: I*Repository prefix (IUserRepository.ts)
    - Forbidden patterns: Dto, Controller, Request, Response
  - **Application Layer:**
    - Use cases: Verb + Noun in PascalCase (CreateUser.ts, UpdateProfile.ts)
    - DTOs: *Dto, *Request, *Response suffixes
    - Mappers: *Mapper suffix
  - **Infrastructure Layer:**
    - Controllers: *Controller suffix
    - Repository implementations: *Repository suffix
    - Services: *Service or *Adapter suffixes
  - Smart exclusion system for base classes
  - Support for 26 standard use case verbs

- 🏗️ **Architecture Violations**
  - Clean Architecture layer validation
  - Dependency rules enforcement:
    - Domain → can only import Shared
    - Application → can import Domain, Shared
    - Infrastructure → can import Domain, Application, Shared
    - Shared → cannot import anything
  - Layer detection from file paths
  - Import statement analysis

- 🔌 **Framework Leak Detection**
  - Detects framework-specific imports in domain layer
  - Identifies coupling between domain and infrastructure concerns
  - Checks for HTTP framework leaks (Express, Fastify, Koa, Hapi, NestJS)
  - Checks for ORM/Database leaks (Prisma, TypeORM, Sequelize, Mongoose, Drizzle)
  - Checks for external service leaks (AWS SDK, Firebase, Stripe, Twilio)
  - Reports violations with framework type and suggested fixes
  - Helps maintain clean domain boundaries

#### CLI Interface

- 🛠️ **Command-line tool** (`guardian` command)
  - `guardian check <path>` - analyze project
  - `--exclude <dirs>` - exclude directories
  - `--verbose` - detailed output
  - `--no-hardcode` - skip hardcode detection
  - `--no-architecture` - skip architecture checks
  - `--version` - show version
  - `--help` - show help

#### Reporting & Metrics

- 📊 **Comprehensive metrics**
  - Total files analyzed
  - Total functions count
  - Total imports count
  - Layer distribution statistics (domain/application/infrastructure/shared)
  - Detailed violation reports with file:line:column
  - Context snippets for each violation
  - Smart suggestions for fixing issues

#### Developer Experience

- 🤖 **Built for AI-Assisted Development**
  - Perfect companion for GitHub Copilot, Cursor, Windsurf, Claude, ChatGPT, Cline
  - Catches common AI code smells (hardcoded values, architecture violations)
  - Educational error messages with fix suggestions
  - Designed for vibe coding workflow: AI writes → Guardian reviews → AI fixes → Ship

- 🏢 **Enterprise-Ready**
  - Enforce architectural standards at scale
  - CI/CD integration ready
  - JSON/Markdown output for automation
  - Security: catch hardcoded secrets before production
  - Metrics export for dashboards

#### Examples & Documentation

- 📚 **Comprehensive examples** (38 files)
  - **Good Architecture** (29 files): Complete DDD/Clean Architecture patterns
    - Domain: Aggregates, Entities, Value Objects, Events, Services, Factories, Specifications
    - Application: Use Cases, DTOs, Mappers
    - Infrastructure: Repositories, Controllers
  - **Bad Architecture** (9 files): Anti-patterns to avoid
    - Hardcoded values, Circular dependencies, Framework leaks, Entity exposure, Naming violations
  - All examples fully documented with explanations
  - Can be used as templates for new projects

#### Testing & Quality

- ✅ **Comprehensive test suite**
  - 194 tests across 7 test files
  - All tests passing
  - 80%+ code coverage on all metrics
  - Test fixtures for various scenarios
  - Integration and unit tests

- 🧹 **Self-analyzing**
  - Guardian passes its own checks with **0 violations**
  - All constants extracted (no hardcoded values)
  - Follows Clean Architecture
  - No circular dependencies
  - Proper naming conventions

#### Technical Details

**Architecture:**
- Built with Clean Architecture principles
- Domain-Driven Design (DDD) patterns
- Layered architecture (Domain, Application, Infrastructure, Shared)
- TypeScript with strict type checking
- Tree-sitter based AST parsing

**Dependencies:**
- commander ^12.1.0 - CLI framework
- simple-git ^3.30.0 - Git operations
- tree-sitter ^0.21.1 - Abstract syntax tree parsing
- tree-sitter-javascript ^0.23.0 - JavaScript parser
- tree-sitter-typescript ^0.23.0 - TypeScript parser
- uuid ^13.0.0 - UUID generation

**Development:**
- TypeScript 5.7.3
- Vitest 4.0.10 for testing
- Node.js >= 18.0.0 required
- CommonJS output with full TypeScript declarations
- Source maps included

**Package:**
- Size: ~58 KB compressed
- Unpacked: ~239 KB
- 172 files included
- Public npm package (`@samiyev/guardian`)
- CLI binary: `guardian`

### Documentation

- 📖 **Comprehensive README** (25KB+)
  - Quick start for vibe coders (30-second setup)
  - Enterprise integration guides (CI/CD, pre-commit, metrics)
  - Real-world examples and workflows
  - API documentation
  - FAQ for both vibe coders and enterprise teams
  - Success stories and use cases

- 🗺️ **Roadmap** - Future features and improvements
- 📋 **Contributing guidelines**
- 📝 **TODO list** - Technical debt tracking
- 📄 **MIT License**

### Notes

- First public release on npm
- Production-ready for both individual developers and enterprise teams
- Perfect for AI-assisted development workflows
- Enforces Clean Architecture at scale
- Zero violations in own codebase (self-tested)

---

## Future Releases

Planned features for upcoming versions:
- Configuration file support (.guardianrc)
- Custom rule definitions
- Plugin system
- Multi-language support
- Watch mode
- Auto-fix capabilities
- Git integration (check only changed files)
- Performance optimizations

See [ROADMAP.md](./ROADMAP.md) for detailed feature roadmap.

---

## Version Guidelines

### Semantic Versioning

**MAJOR.MINOR.PATCH** (e.g., 1.2.3)

- **MAJOR** - Incompatible API changes
- **MINOR** - New features, backwards compatible
- **PATCH** - Bug fixes, backwards compatible

### Release Checklist

Before releasing a new version:
- [ ] Update CHANGELOG.md with all changes
- [ ] Update version in package.json
- [ ] Run `pnpm test` - all tests pass
- [ ] Run `pnpm build` - clean build
- [ ] Run `pnpm test:coverage` - coverage >= 80%
- [ ] Update ROADMAP.md if needed
- [ ] Update README.md if API changed
- [ ] Create git tag: `git tag v0.1.0`
- [ ] Push to GitHub: `git push origin main --tags`
- [ ] Publish to npm: `npm publish`

---

**Links:**
- [Official Website](https://puaros.ailabs.uz)
- [GitHub Repository](https://github.com/samiyev/puaros)
- [npm Package](https://www.npmjs.com/package/@samiyev/guardian)
- [Documentation](https://github.com/samiyev/puaros/packages/guardian#readme)
- [Roadmap](./ROADMAP.md)
- [Issues](https://github.com/samiyev/puaros/issues)
