# ipuaro Architecture

This document describes the architecture, design decisions, and implementation details of ipuaro.

## Table of Contents

- [Overview](#overview)
- [Clean Architecture](#clean-architecture)
- [Layer Details](#layer-details)
- [Data Flow](#data-flow)
- [Key Design Decisions](#key-design-decisions)
- [Tech Stack](#tech-stack)
- [Performance Considerations](#performance-considerations)

## Overview

ipuaro is a local AI agent for codebase operations built on Clean Architecture principles. It enables "infinite" context feeling through lazy loading and AST-based code understanding.

### Core Concepts

1. **Lazy Loading**: Load code on-demand via tools, not all at once
2. **AST-Based Understanding**: Parse and index code structure for fast lookups
3. **100% Local**: Ollama LLM + Redis storage, no cloud dependencies
4. **Session Persistence**: Resume conversations across restarts
5. **Tool-Based Interface**: LLM accesses code through 18 specialized tools

## Clean Architecture

The project follows Clean Architecture with strict dependency rules:

```
┌─────────────────────────────────────────────────┐
│                     TUI Layer                    │  ← Ink/React components
│                   (Framework)                    │
├─────────────────────────────────────────────────┤
│                   CLI Layer                      │  ← Commander.js entry
│                  (Interface)                     │
├─────────────────────────────────────────────────┤
│              Infrastructure Layer                │  ← External adapters
│  (Storage, LLM, Indexer, Tools, Security)       │
├─────────────────────────────────────────────────┤
│              Application Layer                   │  ← Use cases & DTOs
│     (StartSession, HandleMessage, etc.)          │
├─────────────────────────────────────────────────┤
│                 Domain Layer                     │  ← Business logic
│  (Entities, Value Objects, Service Interfaces)  │
└─────────────────────────────────────────────────┘
```

**Dependency Rule**: Outer layers depend on inner layers, never the reverse.

## Layer Details

### Domain Layer (Core Business Logic)

**Location**: `src/domain/`

**Responsibilities**:
- Define business entities and value objects
- Declare service interfaces (ports)
- No external dependencies (pure TypeScript)

**Components**:

```
domain/
├── entities/
│   ├── Session.ts           # Session entity with history and stats
│   └── Project.ts           # Project entity with metadata
├── value-objects/
│   ├── FileData.ts          # File content with hash and size
│   ├── FileAST.ts           # Parsed AST structure
│   ├── FileMeta.ts          # Complexity, dependencies, hub detection
│   ├── ChatMessage.ts       # Message with role, content, tool calls
│   ├── ToolCall.ts          # Tool invocation with parameters
│   ├── ToolResult.ts        # Tool execution result
│   └── UndoEntry.ts         # File change for undo stack
├── services/
│   ├── IStorage.ts          # Storage interface (port)
│   ├── ILLMClient.ts        # LLM interface (port)
│   ├── ITool.ts             # Tool interface (port)
│   └── IIndexer.ts          # Indexer interface (port)
└── constants/
    └── index.ts             # Domain constants
```

**Key Design**:
- Value objects are immutable
- Entities have identity and lifecycle
- Interfaces define contracts, not implementations

### Application Layer (Use Cases)

**Location**: `src/application/`

**Responsibilities**:
- Orchestrate domain logic
- Implement use cases (application-specific business rules)
- Define DTOs for data transfer
- Coordinate between domain and infrastructure

**Components**:

```
application/
├── use-cases/
│   ├── StartSession.ts      # Initialize or load session
│   ├── HandleMessage.ts     # Main message orchestrator
│   ├── IndexProject.ts      # Project indexing workflow
│   ├── ExecuteTool.ts       # Tool execution with validation
│   └── UndoChange.ts        # Revert file changes
├── dtos/
│   ├── SessionDto.ts        # Session data transfer object
│   ├── MessageDto.ts        # Message DTO
│   └── ToolCallDto.ts       # Tool call DTO
├── mappers/
│   └── SessionMapper.ts     # Domain ↔ DTO conversion
└── interfaces/
    └── IToolRegistry.ts     # Tool registry interface
```

**Key Use Cases**:

1. **StartSession**: Creates new session or loads latest
2. **HandleMessage**: Main flow (LLM → Tools → Response)
3. **IndexProject**: Scan → Parse → Analyze → Store
4. **UndoChange**: Restore file from undo stack

### Infrastructure Layer (External Implementations)

**Location**: `src/infrastructure/`

**Responsibilities**:
- Implement domain interfaces
- Handle external systems (Redis, Ollama, filesystem)
- Provide concrete tool implementations
- Security and validation

**Components**:

```
infrastructure/
├── storage/
│   ├── RedisClient.ts       # Redis connection wrapper
│   ├── RedisStorage.ts      # IStorage implementation
│   └── schema.ts            # Redis key schema
├── llm/
│   ├── OllamaClient.ts      # ILLMClient implementation
│   ├── prompts.ts           # System prompts
│   └── ResponseParser.ts    # Parse XML tool calls
├── indexer/
│   ├── FileScanner.ts       # Recursive file scanning
│   ├── ASTParser.ts         # tree-sitter parsing
│   ├── MetaAnalyzer.ts      # Complexity and dependencies
│   ├── IndexBuilder.ts      # Symbol index + deps graph
│   └── Watchdog.ts          # File watching (chokidar)
├── tools/                   # 18 tool implementations
│   ├── registry.ts
│   ├── read/                # GetLines, GetFunction, GetClass, GetStructure
│   ├── edit/                # EditLines, CreateFile, DeleteFile
│   ├── search/              # FindReferences, FindDefinition
│   ├── analysis/            # GetDependencies, GetDependents, GetComplexity, GetTodos
│   ├── git/                 # GitStatus, GitDiff, GitCommit
│   └── run/                 # RunCommand, RunTests
└── security/
    ├── Blacklist.ts         # Dangerous commands
    ├── Whitelist.ts         # Safe commands
    └── PathValidator.ts     # Path traversal prevention
```

**Key Implementations**:

1. **RedisStorage**: Uses Redis hashes for files/AST/meta, lists for undo
2. **OllamaClient**: HTTP API client with tool calling support
3. **ASTParser**: tree-sitter for TS/JS/TSX/JSX parsing
4. **ToolRegistry**: Manages tool lifecycle and execution

### TUI Layer (Terminal UI)

**Location**: `src/tui/`

**Responsibilities**:
- Render terminal UI with Ink (React for terminal)
- Handle user input and hotkeys
- Display chat history and status

**Components**:

```
tui/
├── App.tsx                  # Main app shell
├── components/
│   ├── StatusBar.tsx        # Top status bar
│   ├── Chat.tsx             # Message history display
│   ├── Input.tsx            # User input with history
│   ├── DiffView.tsx         # Inline diff display
│   ├── ConfirmDialog.tsx    # Edit confirmation
│   ├── ErrorDialog.tsx      # Error handling
│   └── Progress.tsx         # Progress bar (indexing)
└── hooks/
    ├── useSession.ts        # Session state management
    ├── useHotkeys.ts        # Keyboard shortcuts
    └── useCommands.ts       # Slash command handling
```

**Key Features**:

- Real-time status updates (context usage, session time)
- Input history with ↑/↓ navigation
- Hotkeys: Ctrl+C (interrupt), Ctrl+D (exit), Ctrl+Z (undo)
- Diff preview for edits with confirmation
- Error recovery with retry/skip/abort options

### CLI Layer (Entry Point)

**Location**: `src/cli/`

**Responsibilities**:
- Command-line interface with Commander.js
- Dependency injection and initialization
- Onboarding checks (Redis, Ollama, model)

**Components**:

```
cli/
├── index.ts                 # Commander.js setup
└── commands/
    ├── start.ts             # Start TUI (default command)
    ├── init.ts              # Create .ipuaro.json config
    └── index-cmd.ts         # Index-only command
```

**Commands**:

1. `ipuaro [path]` - Start TUI in directory
2. `ipuaro init` - Create config file
3. `ipuaro index` - Index without TUI

### Shared Module

**Location**: `src/shared/`

**Responsibilities**:
- Cross-cutting concerns
- Configuration management
- Error handling
- Utility functions

**Components**:

```
shared/
├── types/
│   └── index.ts             # Shared TypeScript types
├── constants/
│   ├── config.ts            # Config schema and loader
│   └── messages.ts          # User-facing messages
├── utils/
│   ├── hash.ts              # MD5 hashing
│   └── tokens.ts            # Token estimation
└── errors/
    ├── IpuaroError.ts       # Custom error class
    └── ErrorHandler.ts      # Error handling service
```

## Data Flow

### 1. Startup Flow

```
CLI Entry (bin/ipuaro.js)
    ↓
Commander.js parses arguments
    ↓
Onboarding checks (Redis, Ollama, Model)
    ↓
Initialize dependencies:
    - RedisClient connects
    - RedisStorage initialized
    - OllamaClient created
    - ToolRegistry with 18 tools
    ↓
StartSession use case:
    - Load latest session or create new
    - Initialize ContextManager
    ↓
Launch TUI (App.tsx)
    - Render StatusBar, Chat, Input
    - Set up hotkeys
```

### 2. Message Flow

```
User types message in Input.tsx
    ↓
useSession.handleMessage()
    ↓
HandleMessage use case:
    1. Add user message to history
    2. Build context (system prompt + structure + AST)
    3. Send to OllamaClient.chat()
    4. Parse tool calls from response
    5. For each tool call:
        - If requiresConfirmation: show ConfirmDialog
        - Execute tool via ToolRegistry
        - Collect results
    6. If tool results: goto step 3 (continue loop)
    7. Add assistant response to history
    8. Update session in Redis
    ↓
Display response in Chat.tsx
```

### 3. Edit Flow

```
LLM calls edit_lines tool
    ↓
ToolRegistry.execute()
    ↓
EditLinesTool.execute():
    1. Validate path (PathValidator)
    2. Check hash conflict
    3. Build diff
    ↓
ConfirmDialog shows diff
    ↓
User chooses:
    - Apply: Continue
    - Cancel: Return error to LLM
    - Edit: Manual edit (future)
    ↓
If Apply:
    1. Create UndoEntry
    2. Push to undo stack (Redis list)
    3. Write to filesystem
    4. Update RedisStorage (lines, hash, AST, meta)
    ↓
Return success to LLM
```

### 4. Indexing Flow

```
FileScanner.scan()
    - Recursively walk directory
    - Filter via .gitignore + ignore patterns
    - Detect binary files (skip)
    ↓
For each file:
    ASTParser.parse()
        - tree-sitter parse
        - Extract imports, exports, functions, classes
        ↓
    MetaAnalyzer.analyze()
        - Calculate complexity (LOC, nesting, cyclomatic)
        - Resolve dependencies (imports → file paths)
        - Detect hubs (>5 dependents)
        ↓
    RedisStorage.setFile(), .setAST(), .setMeta()
    ↓
IndexBuilder.buildSymbolIndex()
    - Map symbol names → locations
    ↓
IndexBuilder.buildDepsGraph()
    - Build bidirectional import graph
    ↓
Store indexes in Redis
    ↓
Watchdog.start()
    - Watch for file changes
    - On change: Re-parse and update indexes
```

## Key Design Decisions

### 1. Why Redis?

**Pros**:
- Fast in-memory access for frequent reads
- AOF persistence (append-only file) for durability
- Native support for hashes, lists, sets
- Simple key-value model fits our needs
- Excellent for session data

**Alternatives considered**:
- SQLite: Slower, overkill for our use case
- JSON files: No concurrent access, slow for large data
- PostgreSQL: Too heavy, we don't need relational features

### 2. Why tree-sitter?

**Pros**:
- Incremental parsing (fast re-parsing)
- Error-tolerant (works with syntax errors)
- Multi-language support
- Used by GitHub, Neovim, Atom

**Alternatives considered**:
- TypeScript Compiler API: TS-only, not error-tolerant
- Babel: JS-focused, heavy dependencies
- Regex: Fragile, inaccurate

### 3. Why Ollama?

**Pros**:
- 100% local, no API keys
- Easy installation (brew install ollama)
- Good model selection (qwen2.5-coder, deepseek-coder)
- Tool calling support

**Alternatives considered**:
- OpenAI: Costs money, sends code to cloud
- Anthropic Claude: Same concerns as OpenAI
- llama.cpp: Lower level, requires more setup

Planned: Support for OpenAI/Anthropic in v1.2.0 as optional providers.

### 4. Why XML for Tool Calls?

**Pros**:
- LLMs trained on XML (very common format)
- Self-describing (parameter names in tags)
- Easy to parse with regex
- More reliable than JSON for smaller models

**Alternatives considered**:
- JSON: Smaller models struggle with exact JSON syntax
- Function calling API: Not all models support it

### 5. Why Clean Architecture?

**Pros**:
- Testability (domain has no external dependencies)
- Flexibility (easy to swap Redis for SQLite)
- Maintainability (clear separation of concerns)
- Scalability (layers can evolve independently)

**Cost**: More files and indirection, but worth it for long-term maintenance.

### 6. Why Lazy Loading Instead of RAG?

**RAG (Retrieval Augmented Generation)**:
- Pre-computes embeddings
- Searches embeddings for relevant chunks
- Adds chunks to context

**Lazy Loading (our approach)**:
- Agent requests specific code via tools
- More precise control over what's loaded
- Simpler implementation (no embeddings)
- Works with any LLM (no embedding model needed)

**Trade-off**: RAG might be better for semantic search ("find error handling code"), but tool-based approach gives agent explicit control.

## Tech Stack

### Core Dependencies

| Package | Purpose | Why? |
|---------|---------|------|
| `ioredis` | Redis client | Most popular, excellent TypeScript support |
| `ollama` | LLM client | Official SDK, simple API |
| `tree-sitter` | AST parsing | Fast, error-tolerant, multi-language |
| `tree-sitter-typescript` | TS/TSX parser | Official TypeScript grammar |
| `tree-sitter-javascript` | JS/JSX parser | Official JavaScript grammar |
| `ink` | Terminal UI | React for terminal, declarative |
| `ink-text-input` | Input component | Maintained ink component |
| `react` | UI framework | Required by Ink |
| `simple-git` | Git operations | Simple API, well-tested |
| `chokidar` | File watching | Cross-platform, reliable |
| `commander` | CLI framework | Industry standard |
| `zod` | Validation | Type-safe validation |
| `globby` | File globbing | ESM-native, .gitignore support |

### Development Dependencies

| Package | Purpose |
|---------|---------|
| `vitest` | Testing framework |
| `@vitest/coverage-v8` | Coverage reporting |
| `@vitest/ui` | Interactive test UI |
| `tsup` | TypeScript bundler |
| `typescript` | Type checking |

## Performance Considerations

### 1. Indexing Performance

**Problem**: Large projects (10k+ files) take time to index.

**Optimizations**:
- Incremental parsing with tree-sitter (only changed files)
- Parallel parsing (planned for v1.1.0)
- Ignore patterns (.gitignore, node_modules, dist)
- Skip binary files early

**Current**: ~1000 files/second on M1 Mac

### 2. Memory Usage

**Problem**: Entire AST in memory could be 100s of MB.

**Optimizations**:
- Store ASTs in Redis (out of Node.js heap)
- Load ASTs on-demand from Redis
- Lazy-load file content (not stored in session)

**Current**: ~200MB for 5000 files indexed

### 3. Context Window Management

**Problem**: 128k token context window fills up.

**Optimizations**:
- Auto-compression at 80% usage
- LLM summarizes old messages
- Remove tool results older than 5 messages
- Only load structure + metadata initially (~10k tokens)

### 4. Redis Performance

**Problem**: Redis is single-threaded.

**Optimizations**:
- Pipeline commands where possible
- Use hashes for related data (fewer keys)
- AOF every second (not every command)
- Keep undo stack limited (10 entries)

**Current**: <1ms latency for most operations

### 5. Tool Execution

**Problem**: Tool execution could block LLM.

**Current**: Synchronous execution (simpler)

**Future**: Async tool execution with progress callbacks (v1.1.0)

## Future Improvements

### v1.1.0 - Performance
- Parallel AST parsing
- Incremental indexing (only changed files)
- Response caching
- Stream LLM responses

### v1.2.0 - Features
- Multiple file edits in one operation
- Batch operations
- Custom prompt templates
- OpenAI/Anthropic provider support

### v1.3.0 - Extensibility
- Plugin system for custom tools
- LSP integration
- Multi-language support (Python, Go, Rust)
- Custom indexing rules

---

**Last Updated**: 2025-12-01
**Version**: 0.16.0
