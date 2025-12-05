# ipuaro Roadmap

Local AI agent for codebase operations with "infinite" context feeling through lazy loading.

## Project Structure (Clean Architecture)

```
packages/ipuaro/
├── bin/
│   └── ipuaro.js               # CLI entry point
├── src/
│   ├── domain/                 # Business logic (no dependencies)
│   │   ├── entities/
│   │   │   ├── Session.ts
│   │   │   └── Project.ts
│   │   ├── value-objects/
│   │   │   ├── FileData.ts
│   │   │   ├── FileAST.ts
│   │   │   ├── FileMeta.ts
│   │   │   ├── ChatMessage.ts
│   │   │   ├── ToolCall.ts
│   │   │   ├── ToolResult.ts
│   │   │   └── UndoEntry.ts
│   │   ├── services/           # Interfaces (ports)
│   │   │   ├── IStorage.ts
│   │   │   ├── ILLMClient.ts
│   │   │   ├── ITool.ts
│   │   │   └── IIndexer.ts
│   │   └── constants/
│   │       └── index.ts
│   ├── application/            # Use cases & orchestration
│   │   ├── use-cases/
│   │   │   ├── StartSession.ts
│   │   │   ├── HandleMessage.ts
│   │   │   ├── IndexProject.ts
│   │   │   ├── ExecuteTool.ts
│   │   │   └── UndoChange.ts
│   │   ├── dtos/
│   │   │   ├── SessionDto.ts
│   │   │   ├── MessageDto.ts
│   │   │   └── ToolCallDto.ts
│   │   ├── mappers/
│   │   │   └── SessionMapper.ts
│   │   └── interfaces/
│   │       └── IToolRegistry.ts
│   ├── infrastructure/         # External implementations
│   │   ├── storage/
│   │   │   ├── RedisClient.ts
│   │   │   ├── RedisStorage.ts
│   │   │   └── schema.ts
│   │   ├── llm/
│   │   │   ├── OllamaClient.ts
│   │   │   ├── prompts.ts
│   │   │   └── ResponseParser.ts
│   │   ├── indexer/
│   │   │   ├── FileScanner.ts
│   │   │   ├── ASTParser.ts
│   │   │   ├── MetaAnalyzer.ts
│   │   │   ├── IndexBuilder.ts
│   │   │   └── Watchdog.ts
│   │   ├── tools/
│   │   │   ├── registry.ts
│   │   │   ├── read/
│   │   │   │   ├── GetLinesTool.ts
│   │   │   │   ├── GetFunctionTool.ts
│   │   │   │   ├── GetClassTool.ts
│   │   │   │   └── GetStructureTool.ts
│   │   │   ├── edit/
│   │   │   │   ├── EditLinesTool.ts
│   │   │   │   ├── CreateFileTool.ts
│   │   │   │   └── DeleteFileTool.ts
│   │   │   ├── search/
│   │   │   │   ├── FindReferencesTool.ts
│   │   │   │   └── FindDefinitionTool.ts
│   │   │   ├── analysis/
│   │   │   │   ├── GetDependenciesTool.ts
│   │   │   │   ├── GetDependentsTool.ts
│   │   │   │   ├── GetComplexityTool.ts
│   │   │   │   └── GetTodosTool.ts
│   │   │   ├── git/
│   │   │   │   ├── GitStatusTool.ts
│   │   │   │   ├── GitDiffTool.ts
│   │   │   │   └── GitCommitTool.ts
│   │   │   └── run/
│   │   │       ├── RunCommandTool.ts
│   │   │       └── RunTestsTool.ts
│   │   ├── security/
│   │   │   ├── Blacklist.ts
│   │   │   ├── Whitelist.ts
│   │   │   └── PathValidator.ts
│   │   └── constants/
│   │       ├── blacklist.ts
│   │       └── whitelist.ts
│   ├── shared/                 # Cross-cutting concerns
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── constants/
│   │   │   ├── config.ts
│   │   │   └── messages.ts
│   │   ├── utils/
│   │   │   ├── hash.ts
│   │   │   └── tokens.ts
│   │   └── errors/
│   │       └── IpuaroError.ts
│   ├── tui/                    # Terminal UI (Ink/React)
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── StatusBar.tsx
│   │   │   ├── Chat.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── DiffView.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── ErrorDialog.tsx
│   │   │   └── Progress.tsx
│   │   └── hooks/
│   │       ├── useSession.ts
│   │       ├── useHotkeys.ts
│   │       └── useAutocomplete.ts
│   └── cli/                    # CLI commands
│       ├── index.ts
│       └── commands/
│           ├── start.ts
│           ├── init.ts
│           └── index-cmd.ts
├── tests/
│   ├── unit/
│   │   ├── domain/
│   │   ├── application/
│   │   └── infrastructure/
│   ├── e2e/
│   │   ├── cli.test.ts
│   │   └── full-flow.test.ts
│   └── fixtures/
│       └── sample-project/
├── examples/
│   └── demo-project/
├── config/
│   ├── default.json
│   ├── blacklist.json
│   └── whitelist.json
├── CHANGELOG.md
├── TODO.md
├── README.md
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## Version 0.1.0 - Foundation ⚙️ ✅

**Priority:** CRITICAL
**Status:** Complete (v0.1.0 released)

### 0.1.1 - Project Setup

**Dependencies:**
```json
{
  "dependencies": {
    "ink": "^4.0.0",
    "ink-text-input": "^5.0.0",
    "react": "^18.0.0",
    "ioredis": "^5.0.0",
    "tree-sitter": "^0.20.0",
    "tree-sitter-typescript": "^0.20.0",
    "tree-sitter-javascript": "^0.20.0",
    "ollama": "^0.5.0",
    "simple-git": "^3.0.0",
    "chokidar": "^3.0.0",
    "commander": "^11.0.0",
    "zod": "^3.0.0",
    "ignore": "^5.0.0"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/coverage-v8": "^1.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.0.0"
  }
}
```

**Deliverables:**
- [ ] package.json with all dependencies
- [ ] tsconfig.json (strict, jsx react, nodenext)
- [ ] tsup.config.ts (bundle ESM + CJS)
- [ ] vitest.config.ts (coverage 80%)
- [ ] bin/ipuaro.js entry point

### 0.1.2 - Domain Value Objects

```typescript
// src/domain/value-objects/FileData.ts
interface FileData {
    lines: string[]
    hash: string           // MD5
    size: number
    lastModified: number
}

// src/domain/value-objects/FileAST.ts
interface FileAST {
    imports: ImportInfo[]
    exports: ExportInfo[]
    functions: FunctionInfo[]
    classes: ClassInfo[]
    parseError: boolean
}

interface ImportInfo {
    name: string
    from: string
    line: number
    type: "internal" | "external" | "builtin"
    isDefault: boolean
}

interface FunctionInfo {
    name: string
    lineStart: number
    lineEnd: number
    params: string[]
    isAsync: boolean
    isExported: boolean
}

interface ClassInfo {
    name: string
    lineStart: number
    lineEnd: number
    methods: MethodInfo[]
    extends?: string
    isExported: boolean
}

// src/domain/value-objects/ChatMessage.ts
interface ChatMessage {
    role: "user" | "assistant" | "tool"
    content: string
    timestamp: number
    toolCalls?: ToolCall[]
    toolResults?: ToolResult[]
    stats?: { tokens: number; timeMs: number; toolCalls: number }
}

// src/domain/value-objects/UndoEntry.ts
interface UndoEntry {
    id: string
    timestamp: number
    filePath: string
    previousContent: string[]
    newContent: string[]
    description: string
}
```

### 0.1.3 - Domain Services (Interfaces)

```typescript
// src/domain/services/IStorage.ts
interface IStorage {
    getFile(path: string): Promise<FileData | null>
    setFile(path: string, data: FileData): Promise<void>
    deleteFile(path: string): Promise<void>
    getAllFiles(): Promise<Map<string, FileData>>
    getAST(path: string): Promise<FileAST | null>
    setAST(path: string, ast: FileAST): Promise<void>
    getSymbolIndex(): Promise<SymbolIndex>
    setSymbolIndex(index: SymbolIndex): Promise<void>
}

// src/domain/services/ILLMClient.ts
interface ILLMClient {
    chat(messages: ChatMessage[], tools?: ToolDef[]): Promise<LLMResponse>
    countTokens(text: string): Promise<number>
    isAvailable(): Promise<boolean>
}

// src/domain/services/ITool.ts
interface ITool {
    name: string
    description: string
    parameters: ToolParameter[]
    requiresConfirmation: boolean
    execute(params: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult>
}
```

### 0.1.4 - Shared Config

```typescript
// src/shared/constants/config.ts
interface Config {
    redis: { host: string; port: number; db: number }
    llm: { model: string; contextWindow: number; temperature: number }
    project: { ignorePatterns: string[]; binaryExtensions: string[] }
    watchdog: { debounceMs: number }
    undo: { stackSize: number }
    edit: { autoApply: boolean }
}

// loadConfig(): reads config/default.json + .ipuaro.json
// validates with zod schema
```

**Tests:**
- [ ] Unit tests for value objects
- [ ] Unit tests for config loader

---

## Version 0.2.0 - Redis Storage 🗄️ ✅

**Priority:** CRITICAL
**Status:** Complete (v0.2.0 released)

### 0.2.1 - Redis Client

```typescript
// src/infrastructure/storage/RedisClient.ts
class RedisClient {
    connect(): Promise<void>      // AOF config on connect
    disconnect(): Promise<void>
    isConnected(): boolean
    getClient(): Redis
}

// Redis config for AOF persistence
// appendonly yes
// appendfsync everysec
```

### 0.2.2 - Redis Schema

```
project:{name}:files      # Hash<path, FileData>
project:{name}:ast        # Hash<path, FileAST>
project:{name}:meta       # Hash<path, FileMeta>
project:{name}:indexes    # Hash<symbols|deps_graph, JSON>
project:{name}:config     # Hash<settings|last_indexed, JSON>

session:{id}:data         # Hash<history|context|stats>
session:{id}:undo         # List<UndoEntry> (max 10)
sessions:list             # List<session_id>
```

**Project name format:** `{parent-folder}-{project-folder}`

### 0.2.3 - Redis Storage Implementation

```typescript
// src/infrastructure/storage/RedisStorage.ts
class RedisStorage implements IStorage {
    constructor(private client: RedisClient, private projectName: string)

    async getFile(path: string): Promise<FileData | null>
    async setFile(path: string, data: FileData): Promise<void>
    async deleteFile(path: string): Promise<void>
    async getAllFiles(): Promise<Map<string, FileData>>
    // ... all IStorage methods
}
```

**Tests:**
- [ ] Unit tests for RedisStorage (mock Redis)
- [ ] Integration tests with real Redis

---

## Version 0.3.0 - Indexer 📂 ✅

**Priority:** CRITICAL
**Status:** Complete (v0.3.0, v0.3.1 released)

### 0.3.1 - File Scanner

```typescript
// src/infrastructure/indexer/FileScanner.ts
class FileScanner {
    scan(root: string): AsyncGenerator<ScanResult>
}

interface ScanResult {
    path: string
    type: "file" | "dir" | "symlink"
    stats: Stats
}

// Filters: .gitignore (via ignore lib), node_modules, dist
// Supports: .ts, .tsx, .js, .jsx, .json, .yaml
// Only UTF-8 files (skip binary)
// Progress callback: onProgress(current, total, file)
```

### 0.3.2 - AST Parser

```typescript
// src/infrastructure/indexer/ASTParser.ts
class ASTParser {
    parse(content: string, lang: "ts" | "tsx" | "js" | "jsx"): FileAST
}

// Uses tree-sitter
// Extracts: imports, exports, functions, classes
// On error: parseError: true, continue with partial data
```

### 0.3.3 - Meta Analyzer

```typescript
// src/infrastructure/indexer/MetaAnalyzer.ts
class MetaAnalyzer {
    analyze(path: string, ast: FileAST, allASTs: Map<string, FileAST>): FileMeta
}

interface FileMeta {
    complexity: { loc: number; nesting: number; score: number }
    dependencies: string[]    // files this imports
    dependents: string[]      // files importing this
    isHub: boolean            // >5 dependents
    isEntryPoint: boolean     // index.ts or 0 dependents
}
```

### 0.3.4 - Index Builder

```typescript
// src/infrastructure/indexer/IndexBuilder.ts
class IndexBuilder {
    buildSymbolIndex(asts: Map<string, FileAST>): SymbolIndex
    buildDepsGraph(asts: Map<string, FileAST>): DepsGraph
}

// SymbolIndex: { [name]: { path, line, type } }
// DepsGraph: { [path]: { imports: [], importedBy: [] } }
```

### 0.3.5 - Watchdog

```typescript
// src/infrastructure/indexer/Watchdog.ts
class Watchdog {
    start(root: string, storage: IStorage): void
    stop(): void
    onFileChange(callback: (path: string) => void): void
}

// chokidar with 500ms debounce
// On change: recalc hash → update lines/AST/meta if changed
// Silent updates (no UI notification)
```

**Tests:**
- [ ] Unit tests for ASTParser (fixtures)
- [ ] Unit tests for MetaAnalyzer
- [ ] Integration tests for full indexing

---

## Version 0.4.0 - LLM Integration 🤖 ✅

**Priority:** CRITICAL
**Status:** Complete (v0.4.0 released)

### 0.4.1 - Ollama Client

```typescript
// src/infrastructure/llm/OllamaClient.ts
class OllamaClient implements ILLMClient {
    constructor(config: { model: string; contextWindow: number; temperature: number })

    async chat(messages: ChatMessage[], tools?: ToolDef[]): Promise<LLMResponse>
    async countTokens(text: string): Promise<number>
    async isAvailable(): Promise<boolean>
    async pullModel(model: string): Promise<void>
}

interface LLMResponse {
    content: string
    toolCalls?: ToolCall[]
    tokens: number
    timeMs: number
}
```

### 0.4.2 - System Prompt

```typescript
// src/infrastructure/llm/prompts.ts
const SYSTEM_PROMPT: string  // EN, role + rules + tools

function buildInitialContext(
    structure: ProjectStructure,
    asts: Map<string, FileAST>
): string

// Returns: project structure + AST metadata (NO code)
// Code loaded lazily via tools
```

### 0.4.3 - Tool Definitions

```typescript
// src/infrastructure/llm/toolDefs.ts
const TOOL_DEFINITIONS: ToolDef[]  // 18 tools

interface ToolDef {
    name: string
    description: string
    parameters: {
        type: "object"
        properties: Record<string, { type: string; description: string }>
        required: string[]
    }
}

// XML format in prompt: <tool_call name="..."><param>...</param></tool_call>
```

### 0.4.4 - Response Parser

```typescript
// src/infrastructure/llm/ResponseParser.ts
function parseToolCalls(response: string): ToolCall[]

// Parses XML tool calls from model response
// Handles multiple tool calls in one response
```

**Tests:**
- [ ] Unit tests for ResponseParser
- [ ] Mock tests for OllamaClient

---

## Version 0.5.0 - Read Tools 📖 ✅

**Priority:** HIGH
**Status:** Complete (v0.5.0 released)

4 tools for reading code without modification.

### 0.5.1 - Tool Registry

```typescript
// src/infrastructure/tools/registry.ts
class ToolRegistry implements IToolRegistry {
    register(tool: ITool): void
    get(name: string): ITool | undefined
    getAll(): ITool[]
    execute(name: string, params: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult>
}
```

### 0.5.2 - get_lines

```typescript
// src/infrastructure/tools/read/GetLinesTool.ts
class GetLinesTool implements ITool {
    name = "get_lines"
    requiresConfirmation = false

    // get_lines(path, start?, end?)
    // Returns lines from Redis (or file if not indexed)
    // Default: entire file
}
```

### 0.5.3 - get_function

```typescript
// src/infrastructure/tools/read/GetFunctionTool.ts
class GetFunctionTool implements ITool {
    name = "get_function"
    requiresConfirmation = false

    // get_function(path, name)
    // Uses AST lineStart/lineEnd to return function code
}
```

### 0.5.4 - get_class

```typescript
// src/infrastructure/tools/read/GetClassTool.ts
class GetClassTool implements ITool {
    name = "get_class"
    requiresConfirmation = false

    // get_class(path, name)
    // Uses AST lineStart/lineEnd to return class code
}
```

### 0.5.5 - get_structure

```typescript
// src/infrastructure/tools/read/GetStructureTool.ts
class GetStructureTool implements ITool {
    name = "get_structure"
    requiresConfirmation = false

    // get_structure(path?)
    // Returns folder/file tree
    // Default: entire project
}
```

**Tests:**
- [ ] Unit tests for each read tool
- [ ] Integration tests with real storage

---

## Version 0.6.0 - Edit Tools ✏️ ✅

**Priority:** HIGH
**Status:** Complete (v0.6.0 released)

3 tools for file modifications. All require confirmation (unless autoApply).

### 0.6.1 - edit_lines

```typescript
// src/infrastructure/tools/edit/EditLinesTool.ts
class EditLinesTool implements ITool {
    name = "edit_lines"
    requiresConfirmation = true

    // edit_lines(path, start, end, content)
    // Replaces lines start-end with content
    // Checks hash conflict before apply
}
```

### 0.6.2 - create_file

```typescript
// src/infrastructure/tools/edit/CreateFileTool.ts
class CreateFileTool implements ITool {
    name = "create_file"
    requiresConfirmation = true

    // create_file(path, content)
    // Creates new file
    // Validates path inside project
}
```

### 0.6.3 - delete_file

```typescript
// src/infrastructure/tools/edit/DeleteFileTool.ts
class DeleteFileTool implements ITool {
    name = "delete_file"
    requiresConfirmation = true

    // delete_file(path)
    // Deletes file from filesystem and Redis
}
```

**Tests:**
- [ ] Unit tests for each edit tool
- [ ] Integration tests with filesystem

---

## Version 0.7.0 - Search Tools 🔍 ✅

**Priority:** HIGH
**Status:** Complete (v0.7.0 released)

### 0.7.1 - find_references

```typescript
// src/infrastructure/tools/search/FindReferencesTool.ts
class FindReferencesTool implements ITool {
    name = "find_references"
    requiresConfirmation = false

    // find_references(symbol)
    // Searches SymbolIndex for all usages
    // Returns: [{ path, line, context }]
}
```

### 0.7.2 - find_definition

```typescript
// src/infrastructure/tools/search/FindDefinitionTool.ts
class FindDefinitionTool implements ITool {
    name = "find_definition"
    requiresConfirmation = false

    // find_definition(symbol)
    // Finds where symbol is defined
    // Returns: { path, line, type }
}
```

**Tests:**
- [ ] Unit tests for search tools

---

## Version 0.8.0 - Analysis Tools 📊 ✅

**Priority:** MEDIUM
**Status:** Complete (v0.8.0 released)

### 0.8.1 - get_dependencies

```typescript
// src/infrastructure/tools/analysis/GetDependenciesTool.ts
// get_dependencies(path)
// Returns files this file imports (from FileMeta)
```

### 0.8.2 - get_dependents

```typescript
// src/infrastructure/tools/analysis/GetDependentsTool.ts
// get_dependents(path)
// Returns files that import this file
```

### 0.8.3 - get_complexity

```typescript
// src/infrastructure/tools/analysis/GetComplexityTool.ts
// get_complexity(path?)
// Returns complexity metrics
// Default: all files sorted by score
```

### 0.8.4 - get_todos

```typescript
// src/infrastructure/tools/analysis/GetTodosTool.ts
// get_todos(path?)
// Finds TODO/FIXME comments in code
// Returns: [{ path, line, text }]
```

**Tests:**
- [ ] Unit tests for analysis tools

---

## Version 0.9.0 - Git & Run Tools 🚀 ✅

**Priority:** MEDIUM
**Status:** Complete (v0.9.0 released) — includes CommandSecurity (Blacklist/Whitelist)

### 0.9.1 - git_status

```typescript
// src/infrastructure/tools/git/GitStatusTool.ts
// git_status()
// Returns: { branch, staged, modified, untracked }
```

### 0.9.2 - git_diff

```typescript
// src/infrastructure/tools/git/GitDiffTool.ts
// git_diff(path?)
// Returns uncommitted changes
// Default: all changes
```

### 0.9.3 - git_commit

```typescript
// src/infrastructure/tools/git/GitCommitTool.ts
// git_commit(message, files?)
// Creates commit
// requiresConfirmation: true
```

### 0.9.4 - run_command

```typescript
// src/infrastructure/tools/run/RunCommandTool.ts
// run_command(command)
// Executes shell command with security checks:
// 1. Check blacklist → reject
// 2. Check whitelist → allow
// 3. Unknown → ask user confirmation
```

### 0.9.5 - run_tests

```typescript
// src/infrastructure/tools/run/RunTestsTool.ts
// run_tests(path?, filter?)
// Detects test runner (vitest/jest/npm test)
// Runs tests and returns results
```

**Tests:**
- [ ] Unit tests for git tools
- [ ] Unit tests for run tools

---

## Version 0.10.0 - Session Management 💾 ✅

**Priority:** HIGH
**Status:** Complete (v0.10.0 released) — includes HandleMessage orchestrator (originally planned for 0.14.0)

### 0.10.1 - Session Entity

```typescript
// src/domain/entities/Session.ts
class Session {
    id: string
    projectName: string
    createdAt: number
    lastActivityAt: number
    history: ChatMessage[]
    context: ContextState
    undoStack: UndoEntry[]
    stats: SessionStats
    inputHistory: string[]
}

interface SessionStats {
    totalTokens: number
    totalTime: number
    toolCalls: number
    editsApplied: number
    editsRejected: number
}
```

### 0.10.2 - Session Use Cases

```typescript
// src/application/use-cases/StartSession.ts
class StartSession {
    execute(projectName: string): Promise<Session>
    // Creates new or loads latest session
}

// src/application/use-cases/HandleMessage.ts
class HandleMessage {
    execute(session: Session, message: string): Promise<void>
    // Main message flow
}
```

### 0.10.3 - Undo Use Case

```typescript
// src/application/use-cases/UndoChange.ts
class UndoChange {
    execute(session: Session): Promise<UndoResult>
    // Reverts last file change from undo stack
}
```

### 0.10.4 - Context Manager

```typescript
// src/application/use-cases/pipeline/ContextManager.ts
class ContextManager {
    addToContext(file: string, tokens: number): void
    getUsage(): number  // 0-1
    needsCompression(): boolean  // >80%
    compress(llm: ILLMClient): Promise<void>
}

// Compression: LLM summarizes old messages + removes tool results
```

**Tests:**
- [ ] Unit tests for session use cases
- [ ] Integration tests for full session flow

---

## Version 0.11.0 - TUI Basic 🖥️ ✅

**Priority:** CRITICAL
**Status:** Complete (v0.11.0 released) — includes useHotkeys (originally planned for 0.16.0)

### 0.11.1 - App Shell

```typescript
// src/tui/App.tsx
function App({ projectPath }: { projectPath: string }) {
    const [session, setSession] = useState<Session | null>(null)
    const [status, setStatus] = useState<"ready" | "thinking" | "error">("ready")
    const [messages, setMessages] = useState<ChatMessage[]>([])

    return (
        <Box flexDirection="column" height="100%">
            <StatusBar ... />
            <Chat messages={messages} isThinking={status === "thinking"} />
            <Input onSubmit={handleSubmit} disabled={status === "thinking"} />
        </Box>
    )
}
```

### 0.11.2 - StatusBar

```typescript
// src/tui/components/StatusBar.tsx
// [ipuaro] [ctx: 12%] [project: myapp] [main] [47m] ✓

interface Props {
    contextUsage: number
    projectName: string
    branch: string
    sessionTime: number
    status: "ready" | "thinking" | "error"
}
```

### 0.11.3 - Chat

```typescript
// src/tui/components/Chat.tsx
// Displays message history
// Tool calls as: [tool_name params...]
// Stats after response: ⏱ 3.2s │ 1,247 tokens │ 1 tool call

interface Props {
    messages: ChatMessage[]
    isThinking: boolean
}
```

### 0.11.4 - Input

```typescript
// src/tui/components/Input.tsx
// Prompt: > _
// ↑/↓ for history
// Tab for path autocomplete

interface Props {
    onSubmit: (text: string) => void
    history: string[]
    disabled: boolean
}
```

**Tests:**
- [ ] Component tests for TUI

---

## Version 0.12.0 - TUI Advanced 🎨 ✅

**Priority:** HIGH
**Status:** Complete (v0.12.0 released)

### 0.12.1 - DiffView

```typescript
// src/tui/components/DiffView.tsx
// Inline highlights: green added, red removed
// Header: ┌─── path (lines X-Y) ───┐

interface Props {
    filePath: string
    oldLines: string[]
    newLines: string[]
    startLine: number
}
```

### 0.12.2 - ConfirmDialog

```typescript
// src/tui/components/ConfirmDialog.tsx
// [Y] Apply  [N] Cancel  [E] Edit

interface Props {
    message: string
    diff?: DiffProps
    onSelect: (choice: "apply" | "cancel" | "edit") => void
}
```

### 0.12.3 - ErrorDialog

```typescript
// src/tui/components/ErrorDialog.tsx
// ❌ type: message
// [R] Retry  [S] Skip  [A] Abort

interface Props {
    error: { type: string; message: string; recoverable: boolean }
    onChoice: (choice: "retry" | "skip" | "abort") => void
}
```

### 0.12.4 - Progress

```typescript
// src/tui/components/Progress.tsx
// [=====>    ] 45% (120/267 files)
// Used during indexing

interface Props {
    current: number
    total: number
    label: string
}
```

**Tests:**
- [ ] Component tests for dialogs

---

## Version 0.13.0 - Security 🔒 ✅

**Priority:** HIGH
**Status:** Complete (v0.13.0 released) — Blacklist/Whitelist done in v0.9.0, PathValidator in v0.13.0

### 0.13.1 - Blacklist

```typescript
// src/infrastructure/security/Blacklist.ts
const BLACKLIST = [
    "rm -rf", "rm -r",
    "git push --force", "git reset --hard", "git clean -fd",
    "npm publish", "sudo", "chmod", "chown"
]

function isBlacklisted(command: string): boolean
// Substring match - always reject
```

### 0.13.2 - Whitelist

```typescript
// src/infrastructure/security/Whitelist.ts
const DEFAULT_WHITELIST = [
    "npm", "pnpm", "yarn", "git",
    "node", "npx", "tsx",
    "vitest", "jest", "tsc", "eslint", "prettier"
]

function isWhitelisted(command: string): boolean
// First word match
// User can extend via config.whitelist.user
```

### 0.13.3 - Path Validator

```typescript
// src/infrastructure/security/PathValidator.ts
function validatePath(path: string, projectRoot: string): boolean
// Rejects: .., absolute paths outside project
```

**Tests:**
- [ ] Unit tests for security validators

---

## [DONE] Original 0.14.0 - Orchestrator 🎭 ✅

> **Note:** This was implemented in v0.10.0 as part of Session Management

<details>
<summary>Originally planned (click to expand)</summary>

### HandleMessage Use Case (Done in v0.10.5)

```typescript
// src/application/use-cases/HandleMessage.ts
class HandleMessage {
    constructor(
        private storage: IStorage,
        private llm: ILLMClient,
        private tools: IToolRegistry
    )

    async execute(session: Session, message: string): Promise<void> {
        // 1. Add user message to history
        // 2. Build context: system prompt + structure + AST + history
        // 3. Send to LLM
        // 4. Parse tool calls
        // 5. For each tool:
        //    - if requiresConfirmation → emit onEdit
        //    - else → execute
        // 6. If tool results → repeat from step 3
        // 7. Show final response with stats
    }

    // Events
    onMessage: (msg: ChatMessage) => void
    onToolCall: (call: ToolCall) => void
    onEdit: (edit: EditRequest) => Promise<EditChoice>
    onError: (error: IpuaroError) => Promise<ErrorChoice>
    onStatusChange: (status: Status) => void
}
```

### Edit Flow (Done in v0.10.5)

```typescript
// Edit handling inside HandleMessage:
// 1. Check hash conflict (file changed during generation?)
// 2. If conflict → onEdit with choices: apply/skip/regenerate
// 3. If not autoApply → onEdit with diff
// 4. On "apply":
//    - Save to undo stack
//    - Apply changes to file
//    - Update storage (lines, AST, meta)
```

</details>

---

## [DONE] Original 0.16.0 - Hotkeys & Polish ⌨️ ✅

> **Note:** useHotkeys done in v0.11.0, ContextManager auto-compression in v0.10.3

<details>
<summary>Originally planned (click to expand)</summary>

### Hotkeys (Done in v0.11.0)

```typescript
// src/tui/hooks/useHotkeys.ts

Ctrl+C  // Interrupt generation (1st), exit (2nd)
Ctrl+D  // Exit with session save
Ctrl+Z  // Undo (= /undo)
↑/↓     // Input history
Tab     // Path autocomplete
```

### Auto-compression (Done in v0.10.3)

```typescript
// Triggered at >80% context:
// 1. LLM summarizes old messages
// 2. Remove tool results older than 5 messages
// 3. Update status bar (ctx% changes)
// No modal notification - silent
```

</details>

---

## Version 0.14.0 - Commands 📝 ✅

**Priority:** HIGH
**Status:** Complete (v0.14.0 released)

8 slash commands for TUI.

```typescript
// src/tui/hooks/useCommands.ts

/help       // Shows all commands and hotkeys
/clear      // Clears chat history (keeps session)
/undo       // Reverts last file change from undo stack
/sessions   // list | load <id> | delete <id>
/status     // Shows: Redis, context, model, session stats
/reindex    // Forces full project reindexation
/eval       // LLM self-check for hallucinations
/auto-apply // on | off - toggle auto-apply mode
```

**Tests:**
- [x] Unit tests for command handlers (38 tests)

---

## Version 0.15.0 - CLI Entry Point 🚪 ✅

**Priority:** HIGH
**Status:** Complete (v0.15.0 released)

### 0.15.1 - CLI Commands

```typescript
// src/cli/index.ts

ipuaro [path]           // Start TUI in directory (default: cwd)
ipuaro init             // Create .ipuaro.json config
ipuaro index            // Index only (no TUI)
```

### 0.15.2 - CLI Options

```bash
--auto-apply            # Enable auto-apply mode
--model <name>          # Override model (default: qwen2.5-coder:7b-instruct)
--help                  # Show help
--version               # Show version
```

### 0.15.3 - Onboarding

```typescript
// src/cli/commands/start.ts

// On first run:
// 1. Check Redis → error with install instructions if missing
// 2. Check Ollama → error if unavailable
// 3. Check model → offer to pull if missing
// 4. Check project size → warn if >10K files, offer subdirectory
```

**Tests:**
- [x] Unit tests for CLI commands (29 tests)

---

## Version 0.16.0 - Error Handling ⚠️ ✅

**Priority:** HIGH
**Status:** Complete (v0.16.0 released)

### 0.16.1 - Error Types ✅

```typescript
// src/shared/errors/IpuaroError.ts
type ErrorType = "redis" | "parse" | "llm" | "file" | "command" | "conflict" | "validation" | "timeout" | "unknown"
type ErrorOption = "retry" | "skip" | "abort" | "confirm" | "regenerate"

interface ErrorMeta {
    type: ErrorType
    recoverable: boolean
    options: ErrorOption[]
    defaultOption: ErrorOption
}

class IpuaroError extends Error {
    type: ErrorType
    recoverable: boolean
    suggestion?: string
    options: ErrorOption[]
    defaultOption: ErrorOption
    context?: Record<string, unknown>

    getMeta(): ErrorMeta
    hasOption(option: ErrorOption): boolean
    toDisplayString(): string
}
```

### 0.16.2 - Error Handling Matrix ✅

| Error | Recoverable | Options | Default |
|-------|-------------|---------|---------|
| Redis unavailable | No | Retry / Abort | Abort |
| AST parse failed | Yes | Skip / Abort | Skip |
| LLM timeout | Yes | Retry / Skip / Abort | Retry |
| File not found | Yes | Skip / Abort | Skip |
| Command not in whitelist | Yes | Confirm / Skip / Abort | Confirm |
| Edit conflict | Yes | Skip / Regenerate / Abort | Skip |
| Validation error | Yes | Skip / Abort | Skip |
| Timeout | Yes | Retry / Skip / Abort | Retry |
| Unknown | No | Abort | Abort |

### 0.16.3 - ErrorHandler Service ✅

```typescript
// src/shared/errors/ErrorHandler.ts
class ErrorHandler {
    handle(error: IpuaroError, contextKey?: string): Promise<ErrorHandlingResult>
    handleSync(error: IpuaroError, contextKey?: string): ErrorHandlingResult
    wrap<T>(fn: () => Promise<T>, errorType: ErrorType, contextKey?: string): Promise<Result>
    withRetry<T>(fn: () => Promise<T>, errorType: ErrorType, contextKey: string): Promise<T>
    resetRetries(contextKey?: string): void
    getRetryCount(contextKey: string): number
    isMaxRetriesExceeded(contextKey: string): boolean
}
```

**Tests:**
- [x] Unit tests for IpuaroError (27 tests)
- [x] Unit tests for ErrorHandler (32 tests)

---

## Version 0.17.0 - Documentation Complete 📚 ✅

**Priority:** HIGH
**Status:** Complete (v0.17.0 released)

### Documentation

- [x] README.md comprehensive update with all features
- [x] ARCHITECTURE.md explaining design and decisions
- [x] TOOLS.md complete reference for all 18 tools
- [x] Troubleshooting guide
- [x] FAQ section
- [x] API examples
- [x] ~2500 lines of documentation added

---

## Version 0.18.0 - Working Examples 📦 ✅

**Priority:** HIGH
**Status:** Complete (v0.18.0 released)

### Examples

- [x] Demo project with TypeScript application (336 LOC)
- [x] User management service (UserService)
- [x] Authentication service (AuthService)
- [x] Utilities (Logger, Validation)
- [x] Unit tests (Vitest)
- [x] Configuration files (package.json, tsconfig.json, .ipuaro.json)
- [x] Comprehensive README with 35+ example queries
- [x] Workflow scenarios (bug fix, refactoring, code review)
- [x] Demonstrates all 18 tools
- [x] 15 files, 977 total lines

---

## Version 0.19.0 - XML Tool Format Refactor 🔄 ✅

**Priority:** HIGH
**Status:** Complete (v0.19.0 released)

Refactoring: transition to pure XML format for tool calls (as in CONCEPT.md).

### Current Problem

OllamaClient uses Ollama native tool calling (JSON Schema), while ResponseParser implements XML parsing. This creates confusion and doesn't match CONCEPT.md.

### 0.19.1 - OllamaClient Refactor

```typescript
// src/infrastructure/llm/OllamaClient.ts

// BEFORE:
// - Pass tools in Ollama SDK format
// - Extract tool_calls from response.message.tool_calls

// AFTER:
// - DON'T pass tools to SDK
// - Tools described in system prompt as XML
// - LLM returns XML in content
// - Parse via ResponseParser
```

**Changes:**
- [x] Remove `convertTools()` method
- [x] Remove `extractToolCalls()` method
- [x] Remove `tools` from `client.chat()` call
- [x] Return only `content` without `toolCalls`

### 0.19.2 - System Prompt Update

```typescript
// src/infrastructure/llm/prompts.ts

// Add full XML format description to SYSTEM_PROMPT:

const TOOL_FORMAT_INSTRUCTIONS = `
## Tool Calling Format

When you need to use a tool, format your call as XML:

<tool_call name="tool_name">
  <param_name>value</param_name>
  <another_param>value</another_param>
</tool_call>

Examples:
<tool_call name="get_lines">
  <path>src/index.ts</path>
  <start>1</start>
  <end>50</end>
</tool_call>

<tool_call name="edit_lines">
  <path>src/utils.ts</path>
  <start>10</start>
  <end>15</end>
  <content>const newCode = "hello";</content>
</tool_call>

You can use multiple tool calls in one response.
Always wait for tool results before making conclusions.
`
```

**Changes:**
- [x] Add `TOOL_FORMAT_INSTRUCTIONS` to prompts.ts
- [x] Include in `SYSTEM_PROMPT`
- [x] Add examples for all 18 tools

### 0.19.3 - HandleMessage Simplification

```typescript
// src/application/use-cases/HandleMessage.ts

// BEFORE:
// const response = await this.llm.chat(messages)
// const parsed = parseToolCalls(response.content)

// AFTER:
// const response = await this.llm.chat(messages)  // without tools
// const parsed = parseToolCalls(response.content) // single source
```

**Changes:**
- [x] Remove tool definitions from `llm.chat()`
- [x] ResponseParser — single source of tool calls
- [x] Simplify processing logic

### 0.19.4 - ILLMClient Interface Update

```typescript
// src/domain/services/ILLMClient.ts

// BEFORE:
interface ILLMClient {
    chat(messages: ChatMessage[], tools?: ToolDef[]): Promise<LLMResponse>
}

// AFTER:
interface ILLMClient {
    chat(messages: ChatMessage[]): Promise<LLMResponse>
    // tools no longer passed - they're in system prompt
}
```

**Changes:**
- [x] Remove `tools` parameter from `chat()`
- [x] Remove `toolCalls` from `LLMResponse` (parsed from content)
- [x] Update all implementations

### 0.19.5 - ResponseParser Enhancements

```typescript
// src/infrastructure/llm/ResponseParser.ts

// Improvements:
// - Better error handling for parsing
// - CDATA support for multiline content
// - Tool name validation
```

**Changes:**
- [x] Add `<![CDATA[...]]>` support for content
- [x] Validation: tool name must be from known list
- [x] Improve parsing error messages

**Tests:**
- [x] Update OllamaClient tests
- [x] Update HandleMessage tests
- [x] Add ResponseParser tests for edge cases
- [ ] E2E test for full XML flow (optional, may be in 0.20.0)

---

## Version 0.20.0 - Missing Use Cases 🔧 ✅

**Priority:** HIGH
**Status:** Complete (v0.20.0 released)

### 0.20.1 - IndexProject Use Case ✅

```typescript
// src/application/use-cases/IndexProject.ts
class IndexProject {
    constructor(storage: IStorage, projectRoot: string)

    async execute(
        projectRoot: string,
        options?: IndexProjectOptions
    ): Promise<IndexingStats>
    // Full indexing pipeline:
    // 1. Scan files
    // 2. Parse AST
    // 3. Analyze metadata
    // 4. Build indexes
    // 5. Store in Redis
}
```

**Deliverables:**
- [x] IndexProject use case implementation (184 LOC)
- [x] Progress reporting via callback
- [x] Unit tests (318 LOC)

### 0.20.2 - ExecuteTool Use Case ✅

```typescript
// src/application/use-cases/ExecuteTool.ts
class ExecuteTool {
    constructor(
        storage: IStorage,
        sessionStorage: ISessionStorage,
        tools: IToolRegistry,
        projectRoot: string
    )

    async execute(
        toolCall: ToolCall,
        session: Session,
        options?: ExecuteToolOptions
    ): Promise<ExecuteToolResult>
    // Orchestrates tool execution with:
    // - Parameter validation
    // - Confirmation flow (with edit support)
    // - Undo stack management
    // - Storage updates
}
```

**Deliverables:**
- [x] ExecuteTool use case implementation (225 LOC)
- [x] HandleMessage uses ExecuteTool
- [x] Support for edited content from confirmation dialog
- [ ] Dedicated unit tests (covered indirectly via integration)

**Tests:**
- [x] Unit tests for IndexProject
- [ ] Unit tests for ExecuteTool (optional - covered via integration)

---

## Version 0.21.0 - TUI Enhancements 🎨 ✅

**Priority:** MEDIUM
**Status:** Complete (v0.21.0 released)

### 0.21.1 - useAutocomplete Hook ✅

```typescript
// src/tui/hooks/useAutocomplete.ts
function useAutocomplete(options: {
    storage: IStorage
    projectRoot: string
    enabled?: boolean
    maxSuggestions?: number
}): {
    suggestions: string[]
    complete: (partial: string) => string[]
    accept: (suggestion: string) => string
    reset: () => void
}

// Tab autocomplete for file paths
// Sources: Redis file index
// Fuzzy matching with scoring algorithm
```

**Deliverables:**
- [x] useAutocomplete hook implementation
- [x] Integration with Input component (Tab key)
- [x] Path completion from Redis index
- [x] Fuzzy matching support
- [x] Unit tests (21 tests)
- [x] Visual feedback in Input component
- [x] Real-time suggestion updates

### 0.21.2 - Edit Mode in ConfirmDialog ✅

```typescript
// Enhanced ConfirmDialog with edit mode
// When user presses [E]:
// 1. Show editable text area with proposed changes
// 2. User modifies the content
// 3. Apply modified version

interface ConfirmDialogProps {
    message: string
    diff?: DiffViewProps
    onSelect: (choice: ConfirmChoice, editedContent?: string[]) => void
    editableContent?: string[]
}
```

**Deliverables:**
- [x] EditableContent component for inline editing
- [x] Integration with ConfirmDialog [E] option
- [x] Handler in App.tsx for edit choice
- [x] ExecuteTool support for edited content
- [x] ConfirmationResult type with editedContent field
- [x] All existing tests passing (1484 tests)

### 0.21.3 - Multiline Input ✅

```typescript
// src/tui/components/Input.tsx
interface InputProps {
    multiline?: boolean | "auto"  // auto = detect based on content
}
```

**Deliverables:**
- [x] Multiline support in Input component
- [x] Line navigation support
- [x] Auto-expand based on content
- [x] Unit tests (37 tests)

### 0.21.4 - Syntax Highlighting in DiffView ✅

```typescript
// src/tui/utils/syntax-highlighter.ts (167 LOC)
// Custom tokenizer for TypeScript/JavaScript/JSON/YAML
// Highlights keywords, strings, comments, numbers, operators

interface DiffViewProps {
    language?: Language
    syntaxHighlight?: boolean
}
```

**Deliverables:**
- [x] Syntax highlighter implementation (167 LOC)
- [x] Language detection from file extension
- [x] Integration with DiffView and ConfirmDialog
- [x] Unit tests (24 tests)

**Tests:**
- [x] Unit tests for useAutocomplete (21 tests)
- [x] Unit tests for enhanced ConfirmDialog
- [x] Unit tests for multiline Input (37 tests)
- [x] Unit tests for syntax highlighting (24 tests)

---

## Version 0.22.0 - Extended Configuration ⚙️

**Priority:** MEDIUM
**Status:** Complete (5/5 complete) ✅

### 0.22.1 - Display Configuration ✅

```typescript
// src/shared/constants/config.ts additions
export const DisplayConfigSchema = z.object({
    showStats: z.boolean().default(true),
    showToolCalls: z.boolean().default(true),
    theme: z.enum(["dark", "light"]).default("dark"),
    bellOnComplete: z.boolean().default(false),
    progressBar: z.boolean().default(true),
})
```

**Deliverables:**
- [x] DisplayConfigSchema in config.ts
- [x] Bell notification on response complete
- [x] Theme support (dark/light color schemes)
- [x] Configurable stats display
- [x] Unit tests (46 new tests: 20 schema, 24 theme, 2 bell)

### 0.22.2 - Session Configuration ✅

```typescript
// src/shared/constants/config.ts additions
export const SessionConfigSchema = z.object({
    persistIndefinitely: z.boolean().default(true),
    maxHistoryMessages: z.number().int().positive().default(100),
    saveInputHistory: z.boolean().default(true),
})
```

**Deliverables:**
- [x] SessionConfigSchema in config.ts
- [x] History truncation based on maxHistoryMessages
- [x] Input history persistence toggle
- [x] Unit tests (19 new tests)

### 0.22.3 - Context Configuration ✅

```typescript
// src/shared/constants/config.ts additions
export const ContextConfigSchema = z.object({
    systemPromptTokens: z.number().int().positive().default(2000),
    maxContextUsage: z.number().min(0).max(1).default(0.8),
    autoCompressAt: z.number().min(0).max(1).default(0.8),
    compressionMethod: z.enum(["llm-summary", "truncate"]).default("llm-summary"),
})
```

**Deliverables:**
- [x] ContextConfigSchema in config.ts
- [x] ContextManager reads from config
- [x] Configurable compression threshold
- [x] Unit tests (40 new tests: 32 schema, 8 ContextManager integration)

### 0.22.4 - Autocomplete Configuration ✅

```typescript
// src/shared/constants/config.ts additions
export const AutocompleteConfigSchema = z.object({
    enabled: z.boolean().default(true),
    source: z.enum(["redis-index", "filesystem", "both"]).default("redis-index"),
    maxSuggestions: z.number().int().positive().default(10),
})
```

**Deliverables:**
- [x] AutocompleteConfigSchema in config.ts
- [x] useAutocomplete reads from config
- [x] Unit tests (27 tests)

### 0.22.5 - Commands Configuration ✅

```typescript
// src/shared/constants/config.ts additions
export const CommandsConfigSchema = z.object({
    timeout: z.number().int().positive().nullable().default(null),
})
```

**Deliverables:**
- [x] CommandsConfigSchema in config.ts
- [x] Timeout support for run_command tool
- [x] Unit tests (19 schema tests + 3 RunCommandTool integration tests)

**Tests:**
- [x] Unit tests for CommandsConfigSchema (19 tests)
- [x] Integration tests for RunCommandTool with config (3 tests)

---

## Version 0.23.0 - JSON/YAML & Symlinks 📄 ✅

**Priority:** LOW
**Status:** Complete (v0.23.0 released)

### 0.23.1 - JSON/YAML AST Parsing ✅

```typescript
// src/infrastructure/indexer/ASTParser.ts enhancements
type Language = "ts" | "tsx" | "js" | "jsx" | "json" | "yaml"

// For JSON: extract keys, structure (tree-sitter-json)
// For YAML: extract keys, structure (yaml npm package)
```

**Note:** YAML parsing uses `yaml` npm package instead of `tree-sitter-yaml` due to native binding compatibility issues.

**Deliverables:**
- [x] Add tree-sitter-json dependency
- [x] JSON parsing in ASTParser
- [x] YAML parsing in ASTParser (using `yaml` package)
- [x] Unit tests (2 tests)

### 0.23.2 - Symlinks Metadata ✅

```typescript
// src/domain/services/IIndexer.ts enhancements
export interface ScanResult {
    path: string
    type: "file" | "directory" | "symlink"
    size: number
    lastModified: number
    symlinkTarget?: string  // <-- NEW: target path for symlinks
}
```

**Deliverables:**
- [x] Add symlinkTarget to ScanResult
- [x] FileScanner extracts symlink targets via safeReadlink()
- [x] Unit tests (FileScanner tests)

**Tests:**
- [x] Unit tests for JSON/YAML parsing (2 tests)
- [x] Unit tests for symlink handling (FileScanner tests)

---

## Version 0.24.0 - Rich Initial Context 📋 ✅

**Priority:** HIGH
**Status:** Complete (v0.24.0 released)

Enhance initial context for LLM: add function signatures, interface field types, and enum values. This allows LLM to answer questions about types and parameters without tool calls.

### 0.24.1 - Function Signatures with Types ⭐ ✅

**Problem:** Currently LLM only sees function names: `fn: getUser, createUser`
**Solution:** Show full signatures: `async getUser(id: string): Promise<User>`

```typescript
// src/infrastructure/llm/prompts.ts changes

// BEFORE:
// - src/services/user.ts [fn: getUser, createUser]

// AFTER:
// ### src/services/user.ts
// - async getUser(id: string): Promise<User>
// - async createUser(data: UserDTO): Promise<User>
// - validateEmail(email: string): boolean
```

**Changes:**
- [x] Extend `FunctionInfo` in FileAST for parameter types and return type (already existed)
- [x] Update `ASTParser.ts` to extract parameter types and return types (arrow functions fixed)
- [x] Update `formatFileSummary()` in prompts.ts to output signatures
- [x] Add `includeSignatures: boolean` option to config

**Why:** LLM won't hallucinate parameters and return types.

### 0.24.2 - Interface/Type Field Definitions ⭐ ✅

**Problem:** LLM only sees `interface: User, UserDTO`
**Solution:** Show fields: `User { id: string, name: string, email: string }`

```typescript
// BEFORE:
// - src/types/user.ts [interface: User, UserDTO]

// AFTER:
// ### src/types/user.ts
// - interface User { id: string, name: string, email: string, createdAt: Date }
// - interface UserDTO { name: string, email: string }
// - type UserId = string
```

**Changes:**
- [x] Extend `InterfaceInfo` in FileAST for field types (already existed)
- [x] Update `ASTParser.ts` to extract interface fields (already existed)
- [x] Update `formatFileSummary()` to output fields
- [x] Handle type aliases with their definitions

**Why:** LLM knows data structure, won't invent fields.

### 0.24.3 - Enum Value Definitions ⭐ ✅

**Problem:** LLM only sees `type: Status`
**Solution:** Show values: `Status { Active=1, Inactive=0, Pending=2 }`

```typescript
// BEFORE:
// - src/types/enums.ts [type: Status, Role]

// AFTER:
// ### src/types/enums.ts
// - enum Status { Active=1, Inactive=0, Pending=2 }
// - enum Role { Admin="admin", User="user" }
```

**Changes:**
- [x] Add `EnumInfo` to FileAST with members and values
- [x] Update `ASTParser.ts` to extract enum members
- [x] Update `formatFileSummary()` to output enum values

**Why:** LLM knows valid enum values.

### 0.24.4 - Decorator Extraction ⭐ ✅

**Problem:** LLM doesn't see decorators (important for NestJS, Angular)
**Solution:** Show decorators in context

```typescript
// AFTER:
// ### src/controllers/user.controller.ts
// - @Controller('users') class UserController
// - @Get(':id') async getUser(id: string): Promise<User>
// - @Post() @Body() async createUser(data: UserDTO): Promise<User>
```

**Changes:**
- [x] Add `decorators: string[]` to FunctionInfo, MethodInfo, and ClassInfo
- [x] Update `ASTParser.ts` to extract decorators via `extractNodeDecorators()` and `extractDecoratorsFromSiblings()`
- [x] Update `prompts.ts` to display decorators via `formatDecoratorsPrefix()`

**Why:** LLM understands routing, DI, guards in NestJS/Angular.

**Tests:**
- [x] Unit tests for ASTParser decorator extraction (14 tests)
- [x] Unit tests for prompts decorator formatting (6 tests)

---

## Version 0.27.0 - Inline Dependency Graph 📊

**Priority:** MEDIUM
**Status:** Planned

### Description

**Problem:** LLM doesn't see file relationships without tool calls
**Solution:** Show dependency graph in context

```typescript
// Add to initial context:

// ## Dependency Graph
// src/services/user.ts: → types/user, utils/validation ← controllers/user, api/routes
// src/services/auth.ts: → services/user, utils/jwt ← controllers/auth
// src/utils/validation.ts: ← services/user, services/auth, controllers/*
```

**Changes:**
- [ ] Add `formatDependencyGraph()` to prompts.ts
- [ ] Use data from `FileMeta.dependencies` and `FileMeta.dependents`
- [ ] Group by hub files (many connections)
- [ ] Add `includeDepsGraph: boolean` option to config

**Why:** LLM sees architecture without tool call.

---

## Version 0.28.0 - Circular Dependencies in Context 🔄

**Priority:** MEDIUM
**Status:** Planned

### Description

**Problem:** Circular deps are computed but not shown in context
**Solution:** Show cycles immediately

```typescript
// Add to initial context:

// ## ⚠️ Circular Dependencies
// - services/user → services/auth → services/user
// - utils/a → utils/b → utils/c → utils/a
```

**Changes:**
- [ ] Add `formatCircularDeps()` to prompts.ts
- [ ] Get circular deps from IndexBuilder
- [ ] Store in Redis as separate key or in meta

**Why:** LLM immediately sees architecture problems.

---

## Version 0.29.0 - Impact Score 📈

**Priority:** MEDIUM
**Status:** Planned

### Description

**Problem:** LLM doesn't know which files are critical
**Solution:** Show impact score (% of codebase that depends on file)

```typescript
// Add to initial context:

// ## High Impact Files
// | File | Impact | Dependents |
// |------|--------|------------|
// | src/utils/validation.ts | 67% | 12 files |
// | src/types/user.ts | 45% | 8 files |
// | src/services/user.ts | 34% | 6 files |
```

**Changes:**
- [ ] Add `impactScore: number` to FileMeta (0-100)
- [ ] Compute in MetaAnalyzer: (transitiveDepByCount / totalFiles) * 100
- [ ] Add `formatHighImpactFiles()` to prompts.ts
- [ ] Show top-10 high impact files

**Why:** LLM understands which files are critical for changes.

---

## Version 0.30.0 - Transitive Dependencies Count 🔢

**Priority:** MEDIUM
**Status:** Planned

### Description

**Problem:** Currently only counting direct dependencies
**Solution:** Add transitive dependencies to meta

```typescript
// FileMeta additions:
interface FileMeta {
    // existing...
    transitiveDepCount: number;    // how many files depend on this (transitively)
    transitiveDepByCount: number;  // how many files this depends on (transitively)
}
```

**Changes:**
- [ ] Add `computeTransitiveDeps()` to MetaAnalyzer
- [ ] Use DFS with memoization for efficiency
- [ ] Store in FileMeta

**Tests:**
- [ ] Unit tests for transitive dependencies computation
- [ ] Performance tests for large codebases

---

## Version 1.0.0 - Production Ready 🚀

**Target:** Stable release

**Checklist:**
- [x] All 18 tools implemented and tested ✅ (v0.9.0)
- [x] TUI fully functional ✅ (v0.11.0, v0.12.0)
- [x] Session persistence working ✅ (v0.10.0)
- [x] Error handling complete ✅ (v0.16.0)
- [ ] Performance optimized
- [x] Documentation complete ✅ (v0.17.0)
- [x] Test coverage ≥91% branches, ≥95% lines/functions/statements ✅ (91.21% branches, 97.5% lines, 98.58% functions, 97.5% statements - 1687 tests)
- [x] 0 ESLint errors ✅
- [x] Examples working ✅ (v0.18.0)
- [x] CHANGELOG.md up to date ✅
- [x] Rich initial context (v0.24.0-v0.26.0) — function signatures, interface fields, enum values, decorators ✅
- [ ] Graph metrics in context (v0.27.0-v0.30.0) — dependency graph, circular deps, impact score, transitive deps

---

## Post 1.0 - Future 💡

### 1.1.0 - Performance
- Parallel AST parsing
- Incremental indexing
- Response caching

### 1.2.0 - Features
- Multiple file edits in one operation
- Batch operations
- Custom prompt templates

### 1.3.0 - Extensibility
- Plugin system for tools
- Custom LLM providers (OpenAI, Anthropic)
- IDE integration (LSP?)

---

## Summary Tables

### Tool Summary (18 total)

| Category | Tool | Confirm | Description |
|----------|------|---------|-------------|
| **Read** | get_lines | No | Get file lines |
| | get_function | No | Get function by name |
| | get_class | No | Get class by name |
| | get_structure | No | Get project tree |
| **Edit** | edit_lines | Yes | Replace lines |
| | create_file | Yes | Create new file |
| | delete_file | Yes | Delete file |
| **Search** | find_references | No | Find symbol usages |
| | find_definition | No | Find symbol definition |
| **Analysis** | get_dependencies | No | File imports |
| | get_dependents | No | Files importing this |
| | get_complexity | No | Complexity metrics |
| | get_todos | No | Find TODO/FIXME |
| **Git** | git_status | No | Repository status |
| | git_diff | No | Uncommitted changes |
| | git_commit | Yes | Create commit |
| **Run** | run_command | Conditional | Execute shell command |
| | run_tests | No | Run test suite |

### Redis Schema

```
# Project (5 keys per project)
project:{name}:files      # Hash<path, FileData>
project:{name}:ast        # Hash<path, FileAST>
project:{name}:meta       # Hash<path, FileMeta>
project:{name}:indexes    # Hash<name, JSON>
project:{name}:config     # Hash<key, JSON>

# Sessions (3 keys per session)
session:{id}:data         # Hash<field, JSON>
session:{id}:undo         # List<UndoEntry> max 10
sessions:list             # List<session_id>
```

### Context Budget (128K window)

| Component | Tokens | % |
|-----------|--------|---|
| System prompt | ~2,000 | 1.5% |
| Structure + AST (v0.23) | ~10,000 | 8% |
| Signatures + Types (v0.24) | ~5,000 | 4% |
| Graph Metrics (v0.25) | ~3,000 | 2.5% |
| **Total Initial Context** | ~20,000 | 16% |
| **Available for Chat** | ~108,000 | 84% |

---

**Last Updated:** 2025-12-05
**Target Version:** 1.0.0
**Current Version:** 0.26.0
**Next Milestones:** v0.27.0 (Dependency Graph), v0.28.0 (Circular Deps), v0.29.0 (Impact Score), v0.30.0 (Transitive Deps)

> **Note:** Rich Initial Context complete ✅ (v0.24.0-v0.26.0). Graph Metrics (v0.27.0-v0.30.0) required for 1.0.0 release.