# ipuaro TODO

## In Progress

### Version 0.2.0 - Redis Storage
- [ ] RedisClient with AOF config
- [ ] Redis schema implementation
- [ ] RedisStorage class

## Planned

### Version 0.3.0 - Indexer
- [ ] FileScanner with gitignore support
- [ ] ASTParser with tree-sitter
- [ ] MetaAnalyzer for complexity
- [ ] IndexBuilder for symbols
- [ ] Watchdog for file changes

### Version 0.4.0 - LLM Integration
- [ ] OllamaClient implementation
- [ ] System prompt design
- [ ] Tool definitions (XML format)
- [ ] Response parser

### Version 0.5.0+ - Tools
- [ ] Read tools (get_lines, get_function, get_class, get_structure)
- [ ] Edit tools (edit_lines, create_file, delete_file)
- [ ] Search tools (find_references, find_definition)
- [ ] Analysis tools (get_dependencies, get_dependents, get_complexity, get_todos)
- [ ] Git tools (git_status, git_diff, git_commit)
- [ ] Run tools (run_command, run_tests)

### Version 0.10.0+ - Session & TUI
- [ ] Session management
- [ ] Context compression
- [ ] TUI components (StatusBar, Chat, Input, DiffView)
- [ ] Slash commands (/help, /clear, /undo, etc.)

## Technical Debt

_None at this time._

## Ideas for Future

- Plugin system for custom tools
- Multiple LLM providers (OpenAI, Anthropic)
- IDE integration (LSP)
- Web UI option
- Parallel AST parsing
- Response caching

---

**Last Updated:** 2025-01-29
