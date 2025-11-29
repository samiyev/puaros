# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
