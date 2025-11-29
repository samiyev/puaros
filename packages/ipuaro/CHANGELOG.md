# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 0.3.0 Indexer (complete)

### Added

- **FileScanner (0.3.1)**
  - Recursive directory scanning with async generator
  - `.gitignore` support via `globby` (replaced `ignore` package for ESM compatibility)
  - Filters: binary files, node_modules, dist, default ignore patterns
  - Progress callback for UI integration
  - `isTextFile()` and `readFileContent()` static utilities
  - 22 unit tests

- **ASTParser (0.3.2)**
  - Tree-sitter based parsing for TS, TSX, JS, JSX
  - Extracts: imports, exports, functions, classes, interfaces, type aliases
  - Import classification: internal, external, builtin (using `node:module` builtinModules)
  - Graceful error handling with partial AST on syntax errors
  - 30 unit tests

- **MetaAnalyzer (0.3.3)**
  - Complexity metrics: LOC (excluding comments), nesting depth, cyclomatic complexity, overall score
  - Dependency resolution: internal imports resolved to absolute file paths
  - Dependents calculation: reverse dependency lookup across all project files
  - File type classification: source, test, config, types, unknown
  - Entry point detection: index files, main/app/cli/server patterns, files with no dependents
  - Hub detection: files with >5 dependents
  - Batch analysis via `analyzeAll()` method
  - 54 unit tests

- **IndexBuilder (0.3.4)**
  - SymbolIndex: maps symbol names to locations for quick lookup (functions, classes, interfaces, types, variables)
  - Qualified names for class methods: `ClassName.methodName`
  - DepsGraph: bidirectional import mapping (`imports` and `importedBy`)
  - Import resolution: handles `.js` → `.ts`, index.ts, directory imports
  - `findSymbol()`: exact symbol lookup
  - `searchSymbols()`: regex-based symbol search
  - `findCircularDependencies()`: detect import cycles
  - `getStats()`: comprehensive index statistics (symbols by type, hubs, orphans)
  - 35 unit tests

- **Watchdog (0.3.5)**
  - File watching with chokidar (native events + polling fallback)
  - Debounced change handling (configurable, default 500ms)
  - Event types: add, change, unlink
  - Extension filtering (default: SUPPORTED_EXTENSIONS)
  - Ignore patterns (default: DEFAULT_IGNORE_PATTERNS)
  - Multiple callback support
  - `flushAll()` for immediate processing
  - Silent error handling for stability
  - 21 unit tests

- **Infrastructure Constants**
  - `tree-sitter-types.ts`: NodeType and FieldName constants for tree-sitter
  - Eliminates magic strings in ASTParser

- **Dependencies**
  - Added `globby` for ESM-native file globbing
  - Removed `ignore` package (CJS incompatibility with nodenext)

### Changed

- Refactored ASTParser to use constants instead of magic strings
- Total tests: 321
- Coverage: 96.43%

---

## [0.2.0] - 2025-01-30

### Added

- **Redis Storage (0.2.x milestone)**
  - RedisClient: connection wrapper with AOF persistence configuration
  - RedisStorage: full IStorage implementation with Redis hashes
  - Redis key schema: project files, AST, meta, indexes, config
  - Session keys schema: data, undo stack, sessions list
  - `generateProjectName()` utility for consistent project naming

- **Infrastructure Layer**
  - `src/infrastructure/storage/` module
  - Exports via `src/infrastructure/index.ts`

- **Testing**
  - 68 new unit tests for Redis module
  - 159 total tests
  - 99% code coverage maintained

### Changed

- Updated ESLint config: `@typescript-eslint/no-unnecessary-type-parameters` set to warn

### Notes

Redis Storage milestone complete. Next: 0.3.0 - Indexer (FileScanner, AST Parser, Watchdog)

## [0.1.0] - 2025-01-29

### Added

- **Project Setup**
  - package.json with all dependencies (ink, ioredis, tree-sitter, ollama, etc.)
  - tsconfig.json for ESM + React JSX
  - tsup.config.ts for bundling
  - vitest.config.ts with 80% coverage threshold
  - CLI entry point (bin/ipuaro.js)

- **Domain Layer**
  - Entities: Session, Project
  - Value Objects: FileData, FileAST, FileMeta, ChatMessage, ToolCall, ToolResult, UndoEntry
  - Service Interfaces: IStorage, ILLMClient, ITool, IIndexer
  - Constants: supported extensions, ignore patterns, context limits

- **Application Layer**
  - IToolRegistry interface
  - Placeholder structure for use cases and DTOs

- **Shared Module**
  - Config schema with Zod validation
  - Config loader (default.json + .ipuaro.json)
  - IpuaroError class with typed errors
  - Utility functions: md5 hash, token estimation
  - Result type for error handling

- **CLI**
  - Basic commands: start, init, index (placeholders)
  - Commander.js integration

- **Testing**
  - 91 unit tests
  - 100% code coverage

### Notes

This is the foundation release. The following features are planned for upcoming versions:
- 0.2.0: Redis Storage
- 0.3.0: Indexer
- 0.4.0: LLM Integration
- 0.5.0+: Tools implementation
- 0.10.0+: TUI and session management
