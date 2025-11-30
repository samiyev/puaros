# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.0] - 2025-12-01 - Analysis Tools

### Added

- **GetDependenciesTool (0.8.1)**
  - `get_dependencies(path)`: Get files that a specific file imports
  - Returns internal dependencies resolved to file paths
  - Includes metadata: exists, isHub, isEntryPoint, fileType
  - Sorted by path for consistent output
  - 23 unit tests

- **GetDependentsTool (0.8.2)**
  - `get_dependents(path)`: Get files that import a specific file
  - Shows hub status for the analyzed file
  - Includes metadata: isHub, isEntryPoint, fileType, complexityScore
  - Sorted by path for consistent output
  - 24 unit tests

- **GetComplexityTool (0.8.3)**
  - `get_complexity(path?, limit?)`: Get complexity metrics for files
  - Returns LOC, nesting depth, cyclomatic complexity, and overall score
  - Summary statistics: high/medium/low complexity counts
  - Average score calculation
  - Sorted by complexity score descending
  - Default limit of 20 files
  - 31 unit tests

- **GetTodosTool (0.8.4)**
  - `get_todos(path?, type?)`: Find TODO/FIXME/HACK/XXX/BUG/NOTE comments
  - Supports multiple comment styles: `//`, `/* */`, `#`
  - Filter by type (case-insensitive)
  - Counts by type
  - Includes line context
  - 42 unit tests

### Changed

- Total tests: 853 (was 733)
- Coverage: 97.91% lines, 92.32% branches
- Analysis tools category now fully implemented (4/4 tools)

---

## [0.7.0] - 2025-12-01 - Search Tools

### Added

- **FindReferencesTool (0.7.1)**
  - `find_references(symbol, path?)`: Find all usages of a symbol across the codebase
  - Word boundary matching with support for special characters (e.g., `$value`)
  - Context lines around each reference (1 line before/after)
  - Marks definition vs usage references
  - Optional path filter for scoped searches
  - Returns: path, line, column, context, isDefinition
  - 37 unit tests

- **FindDefinitionTool (0.7.2)**
  - `find_definition(symbol)`: Find where a symbol is defined
  - Uses SymbolIndex for fast lookups
  - Returns multiple definitions (for overloads/re-exports)
  - Suggests similar symbols when not found (Levenshtein distance)
  - Context lines around definition (2 lines before/after)
  - Returns: path, line, type, context
  - 32 unit tests

### Changed

- Total tests: 733 (was 664)
- Coverage: 97.71% lines, 91.84% branches
- Search tools category now fully implemented (2/2 tools)

---

## [0.6.0] - 2025-12-01 - Edit Tools

### Added

- **EditLinesTool (0.6.1)**
  - `edit_lines(path, start, end, content)`: Replace lines in a file
  - Hash conflict detection (prevents editing externally modified files)
  - Confirmation required with diff preview
  - Automatic storage update after edit
  - 35 unit tests

- **CreateFileTool (0.6.2)**
  - `create_file(path, content)`: Create new file with content
  - Automatic directory creation if needed
  - Path validation (must be within project root)
  - Prevents overwriting existing files
  - Confirmation required before creation
  - 26 unit tests

- **DeleteFileTool (0.6.3)**
  - `delete_file(path)`: Delete file from filesystem and storage
  - Removes file data, AST, and meta from Redis
  - Confirmation required with file content preview
  - 20 unit tests

### Changed

- Total tests: 664 (was 540)
- Coverage: 97.71% lines, 91.89% branches
- Coverage thresholds: 95% lines/functions/statements, 90% branches

---

## [0.5.0] - 2025-12-01 - Read Tools

### Added

- **ToolRegistry (0.5.1)**
  - `IToolRegistry` implementation for managing tool lifecycle
  - Methods: `register()`, `unregister()`, `get()`, `getAll()`, `getByCategory()`, `has()`
  - `execute()`: Tool execution with validation and confirmation flow
  - `getToolDefinitions()`: Convert tools to LLM-compatible JSON Schema format
  - Helper methods: `getConfirmationTools()`, `getSafeTools()`, `getNames()`, `clear()`
  - 34 unit tests

- **GetLinesTool (0.5.2)**
  - `get_lines(path, start?, end?)`: Read file lines with line numbers
  - Reads from Redis storage or filesystem fallback
  - Line number formatting with proper padding
  - Path validation (must be within project root)
  - 25 unit tests

- **GetFunctionTool (0.5.3)**
  - `get_function(path, name)`: Get function source by name
  - Uses AST to find exact line range
  - Returns metadata: isAsync, isExported, params, returnType
  - Lists available functions if target not found
  - 20 unit tests

- **GetClassTool (0.5.4)**
  - `get_class(path, name)`: Get class source by name
  - Uses AST to find exact line range
  - Returns metadata: isAbstract, extends, implements, methods, properties
  - Lists available classes if target not found
  - 19 unit tests

- **GetStructureTool (0.5.5)**
  - `get_structure(path?, depth?)`: Get directory tree
  - ASCII tree output with 📁/📄 icons
  - Filters: node_modules, .git, dist, coverage, etc.
  - Directories sorted before files
  - Stats: directory and file counts
  - 23 unit tests

### Changed

- Total tests: 540 (was 419)
- Coverage: 96%+

---

## [0.4.0] - 2025-11-30 - LLM Integration

### Added

- **OllamaClient (0.4.1)**
  - Full `ILLMClient` implementation for Ollama SDK
  - Chat completion with tool/function calling support
  - Token counting via estimation (Ollama has no tokenizer API)
  - Model management: `pullModel()`, `hasModel()`, `listModels()`
  - Connection status check: `isAvailable()`
  - Request abortion support: `abort()`
  - Error handling with `IpuaroError` for connection and model errors
  - 21 unit tests

- **System Prompt & Context Builder (0.4.2)**
  - `SYSTEM_PROMPT`: Comprehensive agent instructions with tool descriptions
  - `buildInitialContext()`: Generates compact project overview from structure and ASTs
  - `buildFileContext()`: Detailed file context with imports, exports, functions, classes
  - `truncateContext()`: Token-aware context truncation
  - Hub/entry point/complexity flags in file summaries
  - 17 unit tests

- **Tool Definitions (0.4.3)**
  - 18 tool definitions across 6 categories:
    - Read: `get_lines`, `get_function`, `get_class`, `get_structure`
    - Edit: `edit_lines`, `create_file`, `delete_file`
    - Search: `find_references`, `find_definition`
    - Analysis: `get_dependencies`, `get_dependents`, `get_complexity`, `get_todos`
    - Git: `git_status`, `git_diff`, `git_commit`
    - Run: `run_command`, `run_tests`
  - Category groupings: `READ_TOOLS`, `EDIT_TOOLS`, etc.
  - `CONFIRMATION_TOOLS` set for tools requiring user approval
  - Helper functions: `requiresConfirmation()`, `getToolDef()`, `getToolsByCategory()`
  - 39 unit tests

- **Response Parser (0.4.4)**
  - XML tool call parsing: `<tool_call name="...">...</tool_call>`
  - Parameter extraction from XML elements
  - Type coercion: boolean, number, null, JSON arrays/objects
  - `extractThinking()`: Extracts `<thinking>...</thinking>` blocks
  - `hasToolCalls()`: Quick check for tool call presence
  - `validateToolCallParams()`: Parameter validation against required list
  - `formatToolCallsAsXml()`: Tool calls to XML for prompt injection
  - 21 unit tests

### Changed

- Total tests: 419 (was 321)
- Coverage: 96.38%

---

## [0.3.1] - 2025-11-30

### Added

- **VERSION export** - Package version is now exported from index.ts, automatically read from package.json via `createRequire`

### Changed

- 🔄 **Refactored ASTParser** - Reduced complexity and nesting depth:
  - Extracted `extractClassHeritage()`, `parseHeritageClause()`, `findTypeIdentifier()`, `collectImplements()` helper methods
  - Max nesting depth reduced from 5 to 4
- 🔄 **Refactored RedisStorage** - Removed unnecessary type parameter from `parseJSON()` method

### Quality

- ✅ **Zero lint warnings** - All ESLint warnings resolved
- ✅ **All 321 tests pass**

## [0.3.0] - 2025-11-30 - Indexer

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
