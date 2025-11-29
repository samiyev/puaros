# @samiyev/ipuaro

Local AI agent for codebase operations with "infinite" context feeling through lazy loading.

## Features

- 18 LLM tools for code operations (read, edit, search, analysis, git, run)
- Redis persistence with AOF for durability
- tree-sitter AST parsing (TypeScript, JavaScript)
- Ollama LLM integration (local, private)
- File watching for live index updates
- Session and undo management
- Security (blacklist/whitelist for shell commands)
- Terminal UI with Ink/React

## Installation

```bash
npm install @samiyev/ipuaro
# or
pnpm add @samiyev/ipuaro
```

## Requirements

- Node.js >= 20.0.0
- Redis server (for persistence)
- Ollama (for LLM inference)

## Quick Start

```bash
# Start in current directory
ipuaro

# Start in specific directory
ipuaro /path/to/project

# With auto-apply mode
ipuaro --auto-apply

# With custom model
ipuaro --model qwen2.5-coder:32b-instruct
```

## Commands

| Command | Description |
|---------|-------------|
| `ipuaro [path]` | Start TUI in directory |
| `ipuaro init` | Create .ipuaro.json config |
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
    "edit": {
        "autoApply": false
    }
}
```

## Architecture

Clean Architecture with clear separation:

```
src/
├── domain/          # Business logic (entities, value objects, interfaces)
├── application/     # Use cases, DTOs, orchestration
├── infrastructure/  # External implementations (Redis, Ollama, tools)
├── tui/             # Terminal UI (Ink/React components)
├── cli/             # CLI commands
└── shared/          # Cross-cutting concerns
```

## Tools (18 total)

| Category | Tool | Description |
|----------|------|-------------|
| **Read** | `get_lines` | Get file lines |
| | `get_function` | Get function by name |
| | `get_class` | Get class by name |
| | `get_structure` | Get project tree |
| **Edit** | `edit_lines` | Replace lines |
| | `create_file` | Create new file |
| | `delete_file` | Delete file |
| **Search** | `find_references` | Find symbol usages |
| | `find_definition` | Find symbol definition |
| **Analysis** | `get_dependencies` | File imports |
| | `get_dependents` | Files importing this |
| | `get_complexity` | Complexity metrics |
| | `get_todos` | Find TODO/FIXME |
| **Git** | `git_status` | Repository status |
| | `git_diff` | Uncommitted changes |
| | `git_commit` | Create commit |
| **Run** | `run_command` | Execute shell command |
| | `run_tests` | Run test suite |

## Development Status

Currently at version **0.1.0** (Foundation). See [ROADMAP.md](./ROADMAP.md) for full development plan.

### Completed

- [x] 0.1.1 Project Setup
- [x] 0.1.2 Domain Value Objects
- [x] 0.1.3 Domain Services Interfaces
- [x] 0.1.4 Shared Config

### Next

- [ ] 0.2.0 Redis Storage
- [ ] 0.3.0 Indexer
- [ ] 0.4.0 LLM Integration

## License

MIT
