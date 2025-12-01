import type { FileAST } from "../../domain/value-objects/FileAST.js"
import type { FileMeta } from "../../domain/value-objects/FileMeta.js"

/**
 * Project structure for context building.
 */
export interface ProjectStructure {
    name: string
    rootPath: string
    files: string[]
    directories: string[]
}

/**
 * System prompt for the ipuaro AI agent.
 */
export const SYSTEM_PROMPT = `You are ipuaro, a local AI code assistant specialized in helping developers understand and modify their codebase. You operate within a single project directory and have access to powerful tools for reading, searching, analyzing, and editing code.

## Core Principles

1. **Lazy Loading**: You don't have the full code in context. Use tools to fetch exactly what you need.
2. **Precision**: Always verify file paths and line numbers before making changes.
3. **Safety**: Confirm destructive operations. Never execute dangerous commands.
4. **Efficiency**: Minimize context usage. Request only necessary code sections.

## Tool Calling Format

When you need to use a tool, format your call as XML:

<tool_call name="tool_name">
  <param_name>value</param_name>
  <another_param>value</another_param>
</tool_call>

You can call multiple tools in one response. Always wait for tool results before making conclusions.

**Examples:**

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

<tool_call name="find_references">
  <symbol>getUserById</symbol>
</tool_call>

## Available Tools

### Reading Tools
- \`get_lines(path, start?, end?)\`: Get specific lines from a file
- \`get_function(path, name)\`: Get a function by name
- \`get_class(path, name)\`: Get a class by name
- \`get_structure(path?, depth?)\`: Get project directory structure

### Editing Tools (require confirmation)
- \`edit_lines(path, start, end, content)\`: Replace specific lines in a file
- \`create_file(path, content)\`: Create a new file
- \`delete_file(path)\`: Delete a file

### Search Tools
- \`find_references(symbol, path?)\`: Find all usages of a symbol
- \`find_definition(symbol)\`: Find where a symbol is defined

### Analysis Tools
- \`get_dependencies(path)\`: Get files this file imports
- \`get_dependents(path)\`: Get files that import this file
- \`get_complexity(path?, limit?)\`: Get complexity metrics
- \`get_todos(path?, type?)\`: Find TODO/FIXME comments

### Git Tools
- \`git_status()\`: Get repository status
- \`git_diff(path?, staged?)\`: Get uncommitted changes
- \`git_commit(message, files?)\`: Create a commit (requires confirmation)

### Run Tools
- \`run_command(command, timeout?)\`: Execute a shell command (security checked)
- \`run_tests(path?, filter?, watch?)\`: Run the test suite

## Response Guidelines

1. **Be concise**: Don't repeat information already in context.
2. **Show your work**: Explain what tools you're using and why.
3. **Verify before editing**: Always read the target code before modifying it.
4. **Handle errors gracefully**: If a tool fails, explain what went wrong and suggest alternatives.

## Code Editing Rules

1. Always use \`get_lines\` or \`get_function\` before \`edit_lines\`.
2. Provide exact line numbers for edits.
3. For large changes, break into multiple small edits.
4. After editing, suggest running tests if available.

## Safety Rules

1. Never execute commands that could harm the system.
2. Never expose sensitive data (API keys, passwords).
3. Always confirm file deletions and destructive git operations.
4. Stay within the project directory.

When you need to perform an action, use the appropriate tool. Think step by step about what information you need and which tools will provide it most efficiently.`

/**
 * Build initial context from project structure and AST metadata.
 * Returns a compact representation without actual code.
 */
export function buildInitialContext(
    structure: ProjectStructure,
    asts: Map<string, FileAST>,
    metas?: Map<string, FileMeta>,
): string {
    const sections: string[] = []

    sections.push(formatProjectHeader(structure))
    sections.push(formatDirectoryTree(structure))
    sections.push(formatFileOverview(asts, metas))

    return sections.join("\n\n")
}

/**
 * Format project header section.
 */
function formatProjectHeader(structure: ProjectStructure): string {
    const fileCount = String(structure.files.length)
    const dirCount = String(structure.directories.length)
    return `# Project: ${structure.name}
Root: ${structure.rootPath}
Files: ${fileCount} | Directories: ${dirCount}`
}

/**
 * Format directory tree.
 */
function formatDirectoryTree(structure: ProjectStructure): string {
    const lines: string[] = ["## Structure", ""]

    const sortedDirs = [...structure.directories].sort()
    for (const dir of sortedDirs) {
        const depth = dir.split("/").length - 1
        const indent = "  ".repeat(depth)
        const name = dir.split("/").pop() ?? dir
        lines.push(`${indent}${name}/`)
    }

    return lines.join("\n")
}

/**
 * Format file overview with AST summaries.
 */
function formatFileOverview(asts: Map<string, FileAST>, metas?: Map<string, FileMeta>): string {
    const lines: string[] = ["## Files", ""]

    const sortedPaths = [...asts.keys()].sort()
    for (const path of sortedPaths) {
        const ast = asts.get(path)
        if (!ast) {
            continue
        }

        const meta = metas?.get(path)
        lines.push(formatFileSummary(path, ast, meta))
    }

    return lines.join("\n")
}

/**
 * Format a single file's AST summary.
 */
function formatFileSummary(path: string, ast: FileAST, meta?: FileMeta): string {
    const parts: string[] = []

    if (ast.functions.length > 0) {
        const names = ast.functions.map((f) => f.name).join(", ")
        parts.push(`fn: ${names}`)
    }

    if (ast.classes.length > 0) {
        const names = ast.classes.map((c) => c.name).join(", ")
        parts.push(`class: ${names}`)
    }

    if (ast.interfaces.length > 0) {
        const names = ast.interfaces.map((i) => i.name).join(", ")
        parts.push(`interface: ${names}`)
    }

    if (ast.typeAliases.length > 0) {
        const names = ast.typeAliases.map((t) => t.name).join(", ")
        parts.push(`type: ${names}`)
    }

    const summary = parts.length > 0 ? ` [${parts.join(" | ")}]` : ""
    const flags = formatFileFlags(meta)

    return `- ${path}${summary}${flags}`
}

/**
 * Format file metadata flags.
 */
function formatFileFlags(meta?: FileMeta): string {
    if (!meta) {
        return ""
    }

    const flags: string[] = []

    if (meta.isHub) {
        flags.push("hub")
    }

    if (meta.isEntryPoint) {
        flags.push("entry")
    }

    if (meta.complexity.score > 70) {
        flags.push("complex")
    }

    return flags.length > 0 ? ` (${flags.join(", ")})` : ""
}

/**
 * Format line range for display.
 */
function formatLineRange(start: number, end: number): string {
    return `[${String(start)}-${String(end)}]`
}

/**
 * Format imports section.
 */
function formatImportsSection(ast: FileAST): string[] {
    if (ast.imports.length === 0) {
        return []
    }
    const lines = ["### Imports"]
    for (const imp of ast.imports) {
        lines.push(`- ${imp.name} from "${imp.from}" (${imp.type})`)
    }
    lines.push("")
    return lines
}

/**
 * Format exports section.
 */
function formatExportsSection(ast: FileAST): string[] {
    if (ast.exports.length === 0) {
        return []
    }
    const lines = ["### Exports"]
    for (const exp of ast.exports) {
        const defaultMark = exp.isDefault ? " (default)" : ""
        lines.push(`- ${exp.kind} ${exp.name}${defaultMark}`)
    }
    lines.push("")
    return lines
}

/**
 * Format functions section.
 */
function formatFunctionsSection(ast: FileAST): string[] {
    if (ast.functions.length === 0) {
        return []
    }
    const lines = ["### Functions"]
    for (const fn of ast.functions) {
        const params = fn.params.map((p) => p.name).join(", ")
        const asyncMark = fn.isAsync ? "async " : ""
        const range = formatLineRange(fn.lineStart, fn.lineEnd)
        lines.push(`- ${asyncMark}${fn.name}(${params}) ${range}`)
    }
    lines.push("")
    return lines
}

/**
 * Format classes section.
 */
function formatClassesSection(ast: FileAST): string[] {
    if (ast.classes.length === 0) {
        return []
    }
    const lines = ["### Classes"]
    for (const cls of ast.classes) {
        const ext = cls.extends ? ` extends ${cls.extends}` : ""
        const impl = cls.implements.length > 0 ? ` implements ${cls.implements.join(", ")}` : ""
        const range = formatLineRange(cls.lineStart, cls.lineEnd)
        lines.push(`- ${cls.name}${ext}${impl} ${range}`)

        for (const method of cls.methods) {
            const vis = method.visibility === "public" ? "" : `${method.visibility} `
            const methodRange = formatLineRange(method.lineStart, method.lineEnd)
            lines.push(`  - ${vis}${method.name}() ${methodRange}`)
        }
    }
    lines.push("")
    return lines
}

/**
 * Format metadata section.
 */
function formatMetadataSection(meta: FileMeta): string[] {
    const loc = String(meta.complexity.loc)
    const score = String(meta.complexity.score)
    const deps = String(meta.dependencies.length)
    const dependents = String(meta.dependents.length)
    return [
        "### Metadata",
        `- LOC: ${loc}`,
        `- Complexity: ${score}/100`,
        `- Dependencies: ${deps}`,
        `- Dependents: ${dependents}`,
    ]
}

/**
 * Build context for a specific file request.
 */
export function buildFileContext(path: string, ast: FileAST, meta?: FileMeta): string {
    const lines: string[] = [`## ${path}`, ""]

    lines.push(...formatImportsSection(ast))
    lines.push(...formatExportsSection(ast))
    lines.push(...formatFunctionsSection(ast))
    lines.push(...formatClassesSection(ast))

    if (meta) {
        lines.push(...formatMetadataSection(meta))
    }

    return lines.join("\n")
}

/**
 * Truncate context to fit within token budget.
 */
export function truncateContext(context: string, maxTokens: number): string {
    const charsPerToken = 4
    const maxChars = maxTokens * charsPerToken

    if (context.length <= maxChars) {
        return context
    }

    const truncated = context.slice(0, maxChars - 100)
    const lastNewline = truncated.lastIndexOf("\n")
    const remaining = String(context.length - lastNewline)

    return `${truncated.slice(0, lastNewline)}\n\n... (truncated, ${remaining} chars remaining)`
}
