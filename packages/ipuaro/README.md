# @samiyev/ipuaro 🎩

**Local AI Agent for Codebase Operations**

"Infinite" context feeling through lazy loading - work with your entire codebase using local LLM.

[![npm version](https://badge.fury.io/js/@samiyev%2Fipuaro.svg)](https://www.npmjs.com/package/@samiyev/ipuaro)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Status:** 🎉 Release Candidate (v0.16.0 → v1.0.0)
>
> All core features complete. Production-ready release coming soon.

## Vision

Work with codebases of any size using local AI:
- 📂 **Lazy Loading**: Load code on-demand, not all at once
- 🧠 **Smart Context**: AST-based understanding of your code structure
- 🔒 **100% Local**: Your code never leaves your machine
- ⚡ **Fast**: Redis persistence + tree-sitter parsing

## Features

### 18 LLM Tools (All Implemented ✅)

| Category | Tools | Description |
|----------|-------|-------------|
| **Read** | `get_lines`, `get_function`, `get_class`, `get_structure` | Read code without loading everything into context |
| **Edit** | `edit_lines`, `create_file`, `delete_file` | Make changes with confirmation and undo support |
| **Search** | `find_references`, `find_definition` | Find symbol definitions and usages across codebase |
| **Analysis** | `get_dependencies`, `get_dependents`, `get_complexity`, `get_todos` | Analyze code structure, complexity, and TODOs |
| **Git** | `git_status`, `git_diff`, `git_commit` | Git operations with safety checks |
| **Run** | `run_command`, `run_tests` | Execute commands and tests with security validation |

See [Tools Documentation](#tools-reference) below for detailed usage examples.

### Terminal UI

```
┌─ ipuaro ──────────────────────────────────────────────────┐
│ [ctx: 12%] [project: myapp] [main] [47m] ✓ Ready          │
├───────────────────────────────────────────────────────────┤
│ You: How does the authentication flow work?               │
│                                                           │
│ Assistant: Let me analyze the auth module...              │
│ [get_structure src/auth/]                                 │
│ [get_function src/auth/service.ts login]                  │
│                                                           │
│ The authentication flow works as follows:                 │
│ 1. User calls POST /auth/login                            │
│ 2. AuthService.login() validates credentials...           │
│                                                           │
│ ⏱ 3.2s │ 1,247 tokens │ 2 tool calls                     │
├───────────────────────────────────────────────────────────┤
│ > _                                                       │
└───────────────────────────────────────────────────────────┘
```

### Slash Commands

Control your session with built-in commands:

| Command | Description |
|---------|-------------|
| `/help` | Show all commands and hotkeys |
| `/clear` | Clear chat history (keeps session) |
| `/undo` | Revert last file change from undo stack |
| `/sessions [list\|load\|delete] [id]` | Manage sessions |
| `/status` | Show system status (LLM, context, stats) |
| `/reindex` | Force full project reindexation |
| `/eval` | LLM self-check for hallucinations |
| `/auto-apply [on\|off]` | Toggle auto-apply mode for edits |

### Hotkeys

| Hotkey | Action |
|--------|--------|
| `Ctrl+C` | Interrupt generation (1st press) / Exit (2nd press within 1s) |
| `Ctrl+D` | Exit and save session |
| `Ctrl+Z` | Undo last file change |
| `↑` / `↓` | Navigate input history |
| `Tab` | Path autocomplete (coming soon) |

### Key Capabilities

🔍 **Smart Code Understanding**
- tree-sitter AST parsing (TypeScript, JavaScript)
- Symbol index for fast lookups
- Dependency graph analysis

💾 **Persistent Sessions**
- Redis storage with AOF persistence
- Session history across restarts
- Undo stack for file changes

🛡️ **Security**
- Command blacklist (dangerous operations blocked)
- Command whitelist (safe commands auto-approved)
- Path validation (no access outside project)

## Installation

```bash
npm install @samiyev/ipuaro
# or
pnpm add @samiyev/ipuaro
```

## Requirements

- **Node.js** >= 20.0.0
- **Redis** (for persistence)
- **Ollama** (for local LLM inference)

### Setup Ollama

```bash
# Install Ollama (macOS)
brew install ollama

# Start Ollama
ollama serve

# Pull recommended model
ollama pull qwen2.5-coder:7b-instruct
```

### Setup Redis

```bash
# Install Redis (macOS)
brew install redis

# Start Redis with persistence
redis-server --appendonly yes
```

## Usage

```bash
# Start ipuaro in current directory
ipuaro

# Start in specific directory
ipuaro /path/to/project

# With custom model
ipuaro --model qwen2.5-coder:32b-instruct

# With auto-apply mode (skip edit confirmations)
ipuaro --auto-apply
```

## Quick Start

Try ipuaro with our demo project:

```bash
# Navigate to demo project
cd examples/demo-project

# Install dependencies
npm install

# Start ipuaro
npx @samiyev/ipuaro
```

See [examples/demo-project](./examples/demo-project) for detailed usage guide and example conversations.

## Commands

| Command | Description |
|---------|-------------|
| `ipuaro [path]` | Start TUI in directory |
| `ipuaro init` | Create `.ipuaro.json` config |
| `ipuaro index` | Index project without TUI |

## Configuration

Create `.ipuaro.json` in your project root:

```json
{
    "redis": {
        "host": "localhost",
        "port": 6379
    },
    "llm": {
        "model": "qwen2.5-coder:7b-instruct",
        "temperature": 0.1
    },
    "project": {
        "ignorePatterns": ["node_modules", "dist", ".git"]
    },
    "edit": {
        "autoApply": false
    }
}
```

## Architecture

Clean Architecture with clear separation:

```
@samiyev/ipuaro/
├── domain/              # Business logic (no dependencies)
│   ├── entities/        # Session, Project
│   ├── value-objects/   # FileData, FileAST, ChatMessage, etc.
│   └── services/        # IStorage, ILLMClient, ITool, IIndexer
├── application/         # Use cases & orchestration
│   ├── use-cases/       # StartSession, HandleMessage, etc.
│   └── interfaces/      # IToolRegistry
├── infrastructure/      # External implementations
│   ├── storage/         # Redis client & storage
│   ├── llm/             # Ollama client & prompts
│   ├── indexer/         # File scanner, AST parser
│   └── tools/           # 18 tool implementations
├── tui/                 # Terminal UI (Ink/React)
│   └── components/      # StatusBar, Chat, Input, etc.
├── cli/                 # CLI entry point
└── shared/              # Config, errors, utils
```

## Development Status

### ✅ Completed (v0.1.0 - v0.16.0)

- [x] **v0.1.0 - v0.4.0**: Foundation (domain, storage, indexer, LLM integration)
- [x] **v0.5.0 - v0.9.0**: All 18 tools implemented
- [x] **v0.10.0**: Session management with undo support
- [x] **v0.11.0 - v0.12.0**: Full TUI with all components
- [x] **v0.13.0**: Security (PathValidator, command validation)
- [x] **v0.14.0**: 8 slash commands
- [x] **v0.15.0**: CLI entry point with onboarding
- [x] **v0.16.0**: Comprehensive error handling system
- [x] **1420 tests, 98% coverage**

### 🔜 v1.0.0 - Production Ready

- [ ] Performance optimizations
- [ ] Complete documentation
- [ ] Working examples

See [ROADMAP.md](./ROADMAP.md) for detailed development plan and [CHANGELOG.md](./CHANGELOG.md) for release history.

## Tools Reference

The AI agent has access to 18 tools for working with your codebase. Here are the most commonly used ones:

### Read Tools

**`get_lines(path, start?, end?)`**
Read specific lines from a file.

```
You: Show me the authentication logic
Assistant: [get_lines src/auth/service.ts 45 67]
# Returns lines 45-67 with line numbers
```

**`get_function(path, name)`**
Get a specific function's source code and metadata.

```
You: How does the login function work?
Assistant: [get_function src/auth/service.ts login]
# Returns function code, params, return type, and metadata
```

**`get_class(path, name)`**
Get a specific class's source code and metadata.

```
You: Show me the UserService class
Assistant: [get_class src/services/user.ts UserService]
# Returns class code, methods, properties, and inheritance info
```

**`get_structure(path?, depth?)`**
Get directory tree structure.

```
You: What's in the src/auth directory?
Assistant: [get_structure src/auth]
# Returns ASCII tree with files and folders
```

### Edit Tools

**`edit_lines(path, start, end, content)`**
Replace lines in a file (requires confirmation).

```
You: Update the timeout to 5000ms
Assistant: [edit_lines src/config.ts 23 23 "  timeout: 5000,"]
# Shows diff, asks for confirmation
```

**`create_file(path, content)`**
Create a new file (requires confirmation).

```
You: Create a new utility for date formatting
Assistant: [create_file src/utils/date.ts "export function formatDate..."]
# Creates file after confirmation
```

**`delete_file(path)`**
Delete a file (requires confirmation).

```
You: Remove the old test file
Assistant: [delete_file tests/old-test.test.ts]
# Deletes after confirmation
```

### Search Tools

**`find_references(symbol, path?)`**
Find all usages of a symbol across the codebase.

```
You: Where is getUserById used?
Assistant: [find_references getUserById]
# Returns all files/lines where it's called
```

**`find_definition(symbol)`**
Find where a symbol is defined.

```
You: Where is ApiClient defined?
Assistant: [find_definition ApiClient]
# Returns file, line, and context
```

### Analysis Tools

**`get_dependencies(path)`**
Get files that a specific file imports.

```
You: What does auth.ts depend on?
Assistant: [get_dependencies src/auth/service.ts]
# Returns list of imported files
```

**`get_dependents(path)`**
Get files that import a specific file.

```
You: What files use the database module?
Assistant: [get_dependents src/db/index.ts]
# Returns list of files importing this
```

**`get_complexity(path?, limit?)`**
Get complexity metrics for files.

```
You: Which files are most complex?
Assistant: [get_complexity null 10]
# Returns top 10 most complex files with metrics
```

**`get_todos(path?, type?)`**
Find TODO/FIXME/HACK comments.

```
You: What TODOs are there?
Assistant: [get_todos]
# Returns all TODO comments with locations
```

### Git Tools

**`git_status()`**
Get current git repository status.

```
You: What files have changed?
Assistant: [git_status]
# Returns branch, staged, modified, untracked files
```

**`git_diff(path?, staged?)`**
Get uncommitted changes.

```
You: Show me what changed in auth.ts
Assistant: [git_diff src/auth/service.ts]
# Returns diff output
```

**`git_commit(message, files?)`**
Create a git commit (requires confirmation).

```
You: Commit these auth changes
Assistant: [git_commit "feat: add password reset flow" ["src/auth/service.ts"]]
# Creates commit after confirmation
```

### Run Tools

**`run_command(command, timeout?)`**
Execute shell commands (with security validation).

```
You: Run the build
Assistant: [run_command "npm run build"]
# Checks security, then executes
```

**`run_tests(path?, filter?, watch?)`**
Run project tests.

```
You: Test the auth module
Assistant: [run_tests "tests/auth" null false]
# Auto-detects test runner and executes
```

For complete tool documentation with all parameters and options, see [TOOLS.md](./TOOLS.md).

## Programmatic API

You can use ipuaro as a library in your own Node.js applications:

```typescript
import {
    createRedisClient,
    RedisStorage,
    OllamaClient,
    ToolRegistry,
    StartSession,
    HandleMessage
} from "@samiyev/ipuaro"

// Initialize dependencies
const redis = await createRedisClient({ host: "localhost", port: 6379 })
const storage = new RedisStorage(redis, "my-project")
const llm = new OllamaClient({
    model: "qwen2.5-coder:7b-instruct",
    contextWindow: 128000,
    temperature: 0.1
})
const tools = new ToolRegistry()

// Register tools
tools.register(new GetLinesTool(storage, "/path/to/project"))
// ... register other tools

// Start a session
const startSession = new StartSession(storage)
const session = await startSession.execute("my-project")

// Handle a message
const handleMessage = new HandleMessage(storage, llm, tools)
await handleMessage.execute(session, "Show me the auth flow")

// Session is automatically updated in Redis
```

For full API documentation, see the TypeScript definitions in `src/` or explore the [source code](./src/).

## How It Works

### 1. Project Indexing

When you start ipuaro, it scans your project and builds an index:

```
1. File Scanner → Recursively scans files (.ts, .js, .tsx, .jsx)
2. AST Parser → Parses with tree-sitter (extracts functions, classes, imports)
3. Meta Analyzer → Calculates complexity, dependencies, hub detection
4. Index Builder → Creates symbol index and dependency graph
5. Redis Storage → Persists everything for instant startup next time
6. Watchdog → Watches files for changes and updates index in background
```

### 2. Lazy Loading Context

Instead of loading entire codebase into context:

```
Traditional approach:
├── Load all files → 500k tokens → ❌ Exceeds context window

ipuaro approach:
├── Load project structure → ~2k tokens
├── Load AST metadata → ~10k tokens
├── On demand: get_function("auth.ts", "login") → ~200 tokens
├── Total: ~12k tokens → ✅ Fits in 128k context window
```

Context automatically compresses when usage exceeds 80% by summarizing old messages.

### 3. Tool-Based Code Access

The LLM doesn't see your code initially. It only sees structure and metadata. When it needs code, it uses tools:

```
You: "How does user creation work?"

Agent reasoning:
1. [get_structure src/] → sees user/ folder exists
2. [get_function src/user/service.ts createUser] → loads specific function
3. [find_references createUser] → finds all usages
4. Synthesizes answer with only relevant code loaded

Total tokens used: ~2k (vs loading entire src/ which could be 50k+)
```

### 4. Session Persistence

Everything is saved to Redis:
- Chat history and context state
- Undo stack (last 10 file changes)
- Session metadata and statistics

Resume your session anytime with `/sessions load <id>`.

### 5. Security Model

Three-layer security:
1. **Blacklist**: Dangerous commands always blocked (rm -rf, sudo, etc.)
2. **Whitelist**: Safe commands auto-approved (npm, git status, etc.)
3. **Confirmation**: Unknown commands require user approval

File operations are restricted to project directory only (path traversal prevention).

## Troubleshooting

### Redis Connection Errors

**Error**: `Redis connection failed`

**Solutions**:
```bash
# Check if Redis is running
redis-cli ping  # Should return "PONG"

# Start Redis with AOF persistence
redis-server --appendonly yes

# Check Redis logs
tail -f /usr/local/var/log/redis.log  # macOS
```

### Ollama Model Not Found

**Error**: `Model qwen2.5-coder:7b-instruct not found`

**Solutions**:
```bash
# Pull the model
ollama pull qwen2.5-coder:7b-instruct

# List installed models
ollama list

# Check Ollama is running
ollama serve
```

### Large Project Performance

**Issue**: Indexing takes too long or uses too much memory

**Solutions**:
```bash
# Index only a subdirectory
ipuaro ./src

# Add more ignore patterns to .ipuaro.json
{
    "project": {
        "ignorePatterns": ["node_modules", "dist", ".git", "coverage", "build"]
    }
}

# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" ipuaro
```

### Context Window Exceeded

**Issue**: `Context window exceeded` errors

**Solutions**:
- Context auto-compresses at 80%, but you can manually `/clear` history
- Use more targeted questions instead of asking about entire codebase
- The agent will automatically use tools to load only what's needed

### File Changes Not Detected

**Issue**: Made changes but agent doesn't see them

**Solutions**:
```bash
# Force reindex
/reindex

# Or restart with fresh index
rm -rf ~/.ipuaro/cache
ipuaro
```

### Undo Not Working

**Issue**: `/undo` says no changes to undo

**Explanation**: Undo stack only tracks the last 10 file edits made through ipuaro. Manual file edits outside ipuaro cannot be undone.

## FAQ

**Q: Does ipuaro send my code to any external servers?**

A: No. Everything runs locally. Ollama runs on your machine, Redis stores data locally, and no network requests are made except to your local Ollama instance.

**Q: What languages are supported?**

A: Currently TypeScript, JavaScript (including TSX/JSX). More languages planned for future versions.

**Q: Can I use OpenAI/Anthropic/other LLM providers?**

A: Currently only Ollama is supported. OpenAI/Anthropic support is planned for v1.2.0.

**Q: How much disk space does Redis use?**

A: Depends on project size. A typical mid-size project (1000 files) uses ~50-100MB. Redis uses AOF persistence, so data survives restarts.

**Q: Can I use ipuaro in a CI/CD pipeline?**

A: Yes, but it's designed for interactive use. For automated code analysis, consider the programmatic API.

**Q: What's the difference between ipuaro and GitHub Copilot?**

A: Copilot is an autocomplete tool. ipuaro is a conversational agent that can read, analyze, modify files, run commands, and has full codebase understanding through AST parsing.

**Q: Why Redis instead of SQLite or JSON files?**

A: Redis provides fast in-memory access, AOF persistence, and handles concurrent access well. The session model fits Redis's data structures perfectly.

## Contributing

Contributions welcome! This project is in early development.

```bash
# Clone
git clone https://github.com/samiyev/puaros.git
cd puaros/packages/ipuaro

# Install
pnpm install

# Build
pnpm build

# Test
pnpm test:run

# Coverage
pnpm test:coverage
```

## License

MIT © Fozilbek Samiyev

## Links

- [GitHub Repository](https://github.com/samiyev/puaros/tree/main/packages/ipuaro)
- [Issues](https://github.com/samiyev/puaros/issues)
- [Changelog](./CHANGELOG.md)
- [Roadmap](./ROADMAP.md)
