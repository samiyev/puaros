# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.18.0] - 2025-12-01 - Working Examples

### Added

- **Demo Project (examples/demo-project/)**
  - Complete TypeScript application demonstrating ipuaro capabilities
  - User management service with CRUD operations (UserService)
  - Authentication service with login/logout/verify (AuthService)
  - Validation utilities with intentional TODOs/FIXMEs
  - Logger utility with multiple log levels
  - TypeScript type definitions and interfaces
  - Vitest unit tests for UserService (50+ test cases)

- **Demo Project Structure**
  - 336 lines of TypeScript source code across 7 modules
  - src/auth/service.ts: Authentication logic
  - src/services/user.ts: User CRUD operations
  - src/utils/logger.ts: Logging utility
  - src/utils/validation.ts: Input validation (2 TODOs, 1 FIXME)
  - src/types/user.ts: Type definitions
  - tests/user.test.ts: Comprehensive test suite

- **Configuration Files**
  - package.json: Dependencies and scripts
  - tsconfig.json: TypeScript configuration
  - vitest.config.ts: Test framework configuration
  - .ipuaro.json: Sample ipuaro configuration
  - .gitignore: Git ignore patterns

- **Comprehensive Documentation**
  - README.md: Detailed usage guide with 35+ example queries
  - 4 complete workflow scenarios (bug fix, refactoring, feature addition, code review)
  - Tool demonstration guide for all 18 tools
  - Setup instructions for Redis, Ollama, Node.js
  - Slash commands and hotkeys reference
  - Troubleshooting section
  - Advanced workflow examples
  - EXAMPLE_CONVERSATIONS.md: Realistic conversation scenarios

### Changed

- **Main README.md**
  - Added Quick Start section linking to demo project
  - Updated with examples reference

### Demo Features

The demo project intentionally includes patterns to demonstrate all ipuaro tools:
- Multiple classes and functions for get_class/get_function
- Dependencies chain for get_dependencies/get_dependents
- TODOs and FIXMEs for get_todos
- Moderate complexity for get_complexity analysis
- Type definitions for find_definition
- Multiple imports for find_references
- Test file for run_tests
- Git workflow for git tools

### Statistics

- Total files: 15
- Total lines: 977 (including documentation)
- Source code: 336 LOC
- Test code: ~150 LOC
- Documentation: ~500 LOC

### Technical Details

- No code changes to ipuaro core
- All 1420 tests still passing
- Coverage maintained at 97.59%
- Zero ESLint errors/warnings

This completes the "Examples working" requirement for v1.0.0.

---

## [0.17.0] - 2025-12-01 - Documentation Complete

### Added

- **Complete README.md Documentation**
  - Updated status to Release Candidate (v0.16.0 → v1.0.0)
  - Comprehensive tools reference with 18 tools and usage examples
  - Slash commands documentation (8 commands)
  - Hotkeys reference (5 shortcuts)
  - Programmatic API examples with real code
  - Enhanced "How It Works" section with 5 detailed subsections
  - Troubleshooting guide with 6 common issues and solutions
  - FAQ section with 8 frequently asked questions
  - Updated development status showing all completed milestones

- **ARCHITECTURE.md (New File)**
  - Complete architecture overview with Clean Architecture principles
  - Detailed layer breakdown (Domain, Application, Infrastructure, TUI, CLI)
  - Data flow diagrams for startup, messages, edits, and indexing
  - Key design decisions with rationale (Redis, tree-sitter, Ollama, XML, etc.)
  - Complete tech stack documentation
  - Performance considerations and optimizations
  - Future roadmap (v1.1.0 - v1.3.0)

- **TOOLS.md (New File)**
  - Complete reference for all 18 tools organized by category
  - TypeScript signatures for each tool
  - Parameter descriptions and return types
  - Multiple usage examples per tool
  - Example outputs and use cases
  - Error cases and handling
  - Tool confirmation flow explanation
  - Best practices and common workflow patterns
  - Refactoring, bug fix, and feature development flows

### Changed

- **README.md Improvements**
  - Features table now shows all tools implemented ✅
  - Terminal UI section enhanced with better examples
  - Security section expanded with three-layer security model
  - Development status updated to show 1420 tests with 98% coverage

### Documentation Statistics

- Total documentation: ~2500 lines across 3 files
- Tools documented: 18/18 (100%)
- Slash commands: 8/8 (100%)
- Code examples: 50+ throughout documentation
- Troubleshooting entries: 6 issues covered
- FAQ answers: 8 questions answered

### Technical Details

- No code changes (documentation-only release)
- All 1420 tests passing
- Coverage maintained at 97.59%
- Zero ESLint errors/warnings

---

## [0.16.0] - 2025-12-01 - Error Handling

### Added

- **Error Handling Matrix (0.16.2)**
  - `ERROR_MATRIX`: Defines behavior for each error type
  - Per-type options: retry, skip, abort, confirm, regenerate
  - Per-type defaults and recoverability settings
  - Comprehensive error type support: redis, parse, llm, file, command, conflict, validation, timeout, unknown

- **IpuaroError Enhancements (0.16.1)**
  - `ErrorOption` type: New type for available recovery options
  - `ErrorMeta` interface: Error metadata with type, recoverable flag, options, and default
  - `options` property: Available recovery options from matrix
  - `defaultOption` property: Default option for the error type
  - `context` property: Optional context data for debugging
  - `getMeta()`: Returns full error metadata
  - `hasOption()`: Checks if an option is available
  - `toDisplayString()`: Formatted error message with suggestion
  - New factory methods: `llmTimeout()`, `fileNotFound()`, `commandBlacklisted()`, `unknown()`

- **ErrorHandler Service**
  - `handle()`: Async error handling with user callback
  - `handleSync()`: Sync error handling with defaults
  - `wrap()`: Wraps async functions with error handling
  - `withRetry()`: Wraps functions with automatic retry logic
  - `resetRetries()`: Resets retry counters
  - `getRetryCount()`: Gets current retry count
  - `isMaxRetriesExceeded()`: Checks if max retries reached
  - Configurable options: maxRetries, autoSkipParseErrors, autoRetryLLMErrors

- **Utility Functions**
  - `getErrorOptions()`: Get available options for error type
  - `getDefaultErrorOption()`: Get default option for error type
  - `isRecoverableError()`: Check if error type is recoverable
  - `toIpuaroError()`: Convert any error to IpuaroError
  - `createErrorHandler()`: Factory function for ErrorHandler

### Changed

- **IpuaroError Constructor**
  - New signature: `(type, message, options?)` with options object
  - Options include: recoverable, suggestion, context
  - Matrix-based defaults for all properties

- **ErrorChoice → ErrorOption**
  - `ErrorChoice` type deprecated in shared/types
  - Use `ErrorOption` from shared/errors instead
  - Updated HandleMessage and useSession to use ErrorOption

### Technical Details

- Total tests: 1420 (59 new tests)
- Coverage: 97.59% maintained
- New test files: ErrorHandler.test.ts
- Updated test file: IpuaroError.test.ts

---

## [0.15.0] - 2025-12-01 - CLI Entry Point

### Added

- **Onboarding Module (0.15.3)**
  - `checkRedis()`: Validates Redis connection with helpful error messages
  - `checkOllama()`: Validates Ollama availability with install instructions
  - `checkModel()`: Checks if LLM model is available, offers to pull if missing
  - `checkProjectSize()`: Warns if project has >10K files
  - `runOnboarding()`: Runs all pre-flight checks before starting

- **Start Command (0.15.1)**
  - Full TUI startup with dependency injection
  - Integrates onboarding checks before launch
  - Interactive model pull prompt if model missing
  - Redis, storage, LLM, and tools initialization
  - Clean shutdown with disconnect on exit

- **Init Command (0.15.1)**
  - Creates `.ipuaro.json` configuration file
  - Default template with Redis, LLM, and edit settings
  - `--force` option to overwrite existing config
  - Helpful output showing available options

- **Index Command (0.15.1)**
  - Standalone project indexing without TUI
  - File scanning with progress output
  - AST parsing with error handling
  - Metadata analysis and storage
  - Symbol index and dependency graph building
  - Duration and statistics reporting

- **CLI Options (0.15.2)**
  - `--auto-apply`: Enable auto-apply mode for edits
  - `--model <name>`: Override LLM model
  - `--help`: Show help
  - `--version`: Show version

- **Tools Setup Helper**
  - `registerAllTools()`: Registers all 18 tools with the registry
  - Clean separation from CLI logic

### Changed

- **CLI Architecture**
  - Refactored from placeholder to full implementation
  - Commands in separate modules under `src/cli/commands/`
  - Dynamic version from package.json
  - `start` command is now default (runs with `ipuaro` or `ipuaro start`)

### Technical Details

- Total tests: 1372 (29 new CLI tests)
- Coverage: ~98% maintained (CLI excluded from coverage thresholds)
- New test files: onboarding.test.ts, init.test.ts, tools-setup.test.ts

---

## [0.14.0] - 2025-12-01 - Commands

### Added

- **useCommands Hook**
  - New hook for handling slash commands in TUI
  - `parseCommand()`: Parses command input into name and arguments
  - `isCommand()`: Checks if input is a slash command
  - `executeCommand()`: Executes command and returns result
  - `getCommands()`: Returns all available command definitions

- **8 Slash Commands**
  - `/help` - Shows all commands and hotkeys
  - `/clear` - Clears chat history (keeps session)
  - `/undo` - Reverts last file change from undo stack
  - `/sessions [list|load|delete] [id]` - Manage sessions
  - `/status` - Shows system status (LLM, context, stats)
  - `/reindex` - Forces full project reindexation
  - `/eval` - LLM self-check for hallucinations
  - `/auto-apply [on|off]` - Toggle auto-apply mode

- **Command Result Display**
  - Visual feedback box for command results
  - Green border for success, red for errors
  - Auto-clear after 5 seconds

### Changed

- **App.tsx Integration**
  - Added `useCommands` hook integration
  - Command handling in `handleSubmit`
  - New state for `autoApply` and `commandResult`
  - Reindex placeholder action

### Technical Details

- Total tests: 1343 (38 new useCommands tests)
- Test coverage: ~98% maintained
- Modular command factory functions for maintainability
- Commands extracted to separate functions to stay under line limits

---

## [0.13.0] - 2025-12-01 - Security

### Added

- **PathValidator Utility (0.13.3)**
  - Centralized path validation for all file operations
  - Prevents path traversal attacks (`..`, `~`)
  - Validates paths are within project root
  - Sync (`validateSync`) and async (`validate`) validation methods
  - Quick check method (`isWithin`) for simple validations
  - Resolution methods (`resolve`, `relativize`, `resolveOrThrow`)
  - Detailed validation results with status and reason
  - Options for file existence, directory/file type checks

- **Security Module**
  - New `infrastructure/security` module
  - Exports: `PathValidator`, `createPathValidator`, `validatePath`
  - Type exports: `PathValidationResult`, `PathValidationStatus`, `PathValidatorOptions`

### Changed

- **Refactored All File Tools to Use PathValidator**
  - GetLinesTool: Uses PathValidator for path validation
  - GetFunctionTool: Uses PathValidator for path validation
  - GetClassTool: Uses PathValidator for path validation
  - GetStructureTool: Uses PathValidator for path validation
  - EditLinesTool: Uses PathValidator for path validation
  - CreateFileTool: Uses PathValidator for path validation
  - DeleteFileTool: Uses PathValidator for path validation

- **Improved Error Messages**
  - More specific error messages from PathValidator
  - "Path contains traversal patterns" for `..` attempts
  - "Path is outside project root" for absolute paths outside project
  - "Path is empty" for empty/whitespace paths

### Technical Details

- Total tests: 1305 (51 new PathValidator tests)
- Test coverage: ~98% maintained
- No breaking changes to existing tool APIs
- Security validation is now consistent across all 7 file tools

---

## [0.12.0] - 2025-12-01 - TUI Advanced

### Added

- **DiffView Component (0.12.1)**
  - Inline diff display with green (added) and red (removed) highlighting
  - Header with file path and line range: `┌─── path (lines X-Y) ───┐`
  - Line numbers with proper padding
  - Stats footer showing additions and deletions count

- **ConfirmDialog Component (0.12.2)**
  - Confirmation dialog with [Y] Apply / [N] Cancel / [E] Edit options
  - Optional diff preview integration
  - Keyboard input handling (Y/N/E keys, Escape)
  - Visual selection feedback

- **ErrorDialog Component (0.12.3)**
  - Error dialog with [R] Retry / [S] Skip / [A] Abort options
  - Recoverable vs non-recoverable error handling
  - Disabled buttons for non-recoverable errors
  - Keyboard input with Escape support

- **Progress Component (0.12.4)**
  - Progress bar display: `[=====>    ] 45% (120/267 files)`
  - Color-coded progress (cyan < 50%, yellow < 100%, green = 100%)
  - Configurable width
  - Label support for context

### Changed

- Total tests: 1254 (unchanged - TUI components excluded from coverage)
- TUI layer now has 8 components + 2 hooks
- All v0.12.0 roadmap items complete

---

## [0.11.0] - 2025-12-01 - TUI Basic

### Added

- **TUI Types (0.11.0)**
  - `TuiStatus`: Status type for TUI display (ready, thinking, tool_call, awaiting_confirmation, error)
  - `BranchInfo`: Git branch information (name, isDetached)
  - `AppProps`: Main app component props
  - `StatusBarData`: Status bar display data

- **App Shell (0.11.1)**
  - Main TUI App component with React/Ink
  - Session initialization and state management
  - Loading and error screens
  - Hotkey integration (Ctrl+C, Ctrl+D, Ctrl+Z)
  - Session time tracking

- **StatusBar Component (0.11.2)**
  - Displays: `[ipuaro] [ctx: 12%] [project] [branch] [time] status`
  - Context usage with color warning at >80%
  - Git branch with detached HEAD support
  - Status indicator with colors (ready=green, thinking=yellow, error=red)

- **Chat Component (0.11.3)**
  - Message history display with role-based styling
  - User messages (green), Assistant messages (cyan), System messages (gray)
  - Tool call display with parameters
  - Response stats: time, tokens, tool calls
  - Thinking indicator during LLM processing

- **Input Component (0.11.4)**
  - Prompt with `> ` prefix
  - History navigation with ↑/↓ arrow keys
  - Saved input restoration when navigating past history
  - Disabled state during processing
  - Custom placeholder support

- **useSession Hook (0.11.5)**
  - Session state management with React hooks
  - Message handling integration
  - Status tracking (ready, thinking, tool_call, error)
  - Undo support
  - Clear history functionality
  - Abort/interrupt support

- **useHotkeys Hook (0.11.6)**
  - Ctrl+C: Interrupt (1st), Exit (2nd within 1s)
  - Ctrl+D: Exit with session save
  - Ctrl+Z: Undo last change

### Changed

- Total tests: 1254 (was 1174)
- Coverage: 97.75% lines, 92.22% branches
- TUI layer now has 4 components + 2 hooks
- TUI excluded from coverage thresholds (requires React testing setup)

---

## [0.10.0] - 2025-12-01 - Session Management

### Added

- **ISessionStorage (0.10.1)**
  - Session storage service interface
  - Methods: saveSession, loadSession, deleteSession, listSessions
  - Undo stack management: pushUndoEntry, popUndoEntry, getUndoStack
  - Session lifecycle: getLatestSession, sessionExists, touchSession

- **RedisSessionStorage (0.10.2)**
  - Redis implementation of ISessionStorage
  - Session data in Redis hashes (project, history, context, stats)
  - Undo stack in Redis lists (max 10 entries)
  - Sessions list for project-wide queries
  - 22 unit tests

- **ContextManager (0.10.3)**
  - Manages context window token budget
  - File context tracking with addToContext/removeFromContext
  - Usage monitoring: getUsage, getAvailableTokens, getRemainingTokens
  - Auto-compression at 80% threshold via LLM summarization
  - Context state export for session persistence
  - 23 unit tests

- **StartSession (0.10.4)**
  - Use case for session initialization
  - Creates new session or loads latest for project
  - Optional sessionId for specific session loading
  - forceNew option to always create fresh session
  - 10 unit tests

- **HandleMessage (0.10.5)**
  - Main orchestrator use case for message handling
  - LLM interaction with tool calling support
  - Edit confirmation flow with diff preview
  - Error handling with retry/skip/abort choices
  - Status tracking: ready, thinking, tool_call, awaiting_confirmation, error
  - Event callbacks: onMessage, onToolCall, onToolResult, onConfirmation, onError
  - 21 unit tests

- **UndoChange (0.10.6)**
  - Use case for reverting file changes
  - Validates file hasn't changed since edit
  - Restores original content from undo entry
  - Updates storage after successful undo
  - 12 unit tests

### Changed

- Total tests: 1174 (was 1086)
- Coverage: 97.73% lines, 92.21% branches
- Application layer now has 4 use cases implemented
- All planned session management features complete

---

## [0.9.0] - 2025-12-01 - Git & Run Tools

### Added

- **GitStatusTool (0.9.1)**
  - `git_status()`: Get current git repository status
  - Returns branch name, tracking branch, ahead/behind counts
  - Lists staged, modified, untracked, and conflicted files
  - Detects detached HEAD state
  - 29 unit tests

- **GitDiffTool (0.9.2)**
  - `git_diff(path?, staged?)`: Get uncommitted changes
  - Returns file-by-file diff summary with insertions/deletions
  - Full diff text output
  - Optional path filter for specific files/directories
  - Staged-only mode (`--cached`)
  - Handles binary files
  - 25 unit tests

- **GitCommitTool (0.9.3)**
  - `git_commit(message, files?)`: Create a git commit
  - Requires user confirmation before commit
  - Optional file staging before commit
  - Returns commit hash, summary, author info
  - Validates staged files exist
  - 26 unit tests

- **CommandSecurity**
  - Security module for shell command validation
  - Blacklist: dangerous commands always blocked (rm -rf, sudo, git push --force, etc.)
  - Whitelist: safe commands allowed without confirmation (npm, node, git status, etc.)
  - Classification: `allowed`, `blocked`, `requires_confirmation`
  - Git subcommand awareness (safe read operations vs write operations)
  - Extensible via `addToBlacklist()` and `addToWhitelist()`
  - 65 unit tests

- **RunCommandTool (0.9.4)**
  - `run_command(command, timeout?)`: Execute shell commands
  - Security-first design with blacklist/whitelist checks
  - Blocked commands rejected immediately
  - Unknown commands require user confirmation
  - Configurable timeout (default 30s, max 10min)
  - Output truncation for large outputs
  - Returns stdout, stderr, exit code, duration
  - 40 unit tests

- **RunTestsTool (0.9.5)**
  - `run_tests(path?, filter?, watch?)`: Run project tests
  - Auto-detects test runner: vitest, jest, mocha, npm test
  - Detects by config files and package.json dependencies
  - Path filtering for specific test files/directories
  - Name pattern filtering (`-t` / `--grep`)
  - Watch mode support
  - Returns pass/fail status, exit code, output
  - 48 unit tests

### Changed

- Total tests: 1086 (was 853)
- Coverage: 98.08% lines, 92.21% branches
- Git tools category now fully implemented (3/3 tools)
- Run tools category now fully implemented (2/2 tools)
- All 18 planned tools now implemented

---

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
