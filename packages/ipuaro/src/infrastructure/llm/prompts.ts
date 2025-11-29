import type { FileAST } from "../../domain/value-objects/FileAST.js"
import type { FileMeta } from "../../domain/value-objects/FileMeta.js"

/**
 * Project structure representation for context building.
 */
export interface ProjectStructure {
    /** Project root path */
    rootPath: string
    /** Project name */
    name: string
    /** Total file count */
    fileCount: number
    /** File paths grouped by directory */
    filesByDirectory: Map<string, string[]>
}

/**
 * System prompt for the LLM.
 * Defines role, rules, and tool usage instructions.
 */
export const SYSTEM_PROMPT = `You are an expert AI coding assistant with access to a codebase through specialized tools.

## Your Role
- Help users understand, modify, and improve their code
- Answer questions about the codebase structure and logic
- Assist with debugging, refactoring, and implementing features
- Provide clear, concise explanations

## Available Tools

### Reading Code
- **get_lines**: Read specific lines from a file
- **get_function**: Get a function's complete source code
- **get_class**: Get a class's complete source code
- **get_structure**: Get file structure (imports, exports, functions, classes)

### Searching
- **find_references**: Find all references to a symbol
- **find_definition**: Find where a symbol is defined

### Analysis
- **get_dependencies**: Get files that a file imports
- **get_dependents**: Get files that import a file
- **get_complexity**: Get complexity metrics for a file
- **get_todos**: Find TODO/FIXME comments in files

### Editing
- **edit_lines**: Modify specific lines in a file
- **create_file**: Create a new file
- **delete_file**: Delete a file

### Git
- **git_status**: Show working tree status
- **git_diff**: Show changes in files
- **git_commit**: Create a commit

### Running
- **run_command**: Execute a shell command
- **run_tests**: Run test suite

## Rules

1. **Always use tools to read code** - Never guess file contents
2. **Read before editing** - Always read the current content before modifying
3. **Minimal changes** - Make only the necessary modifications
4. **Explain your actions** - Briefly describe what you're doing and why
5. **Verify changes** - After editing, read the file to confirm changes
6. **Be careful with destructive operations** - Confirm before deleting files

## Tool Call Format

Use XML format to call tools:

\`\`\`xml
<tool_call name="tool_name">
<param name="param1">value1</param>
<param name="param2">value2</param>
</tool_call>
\`\`\`

You can call multiple tools in sequence. Wait for tool results before proceeding.

## Response Format

1. Think about what information you need
2. Use appropriate tools to gather information
3. Provide a clear answer or perform the requested action
4. Summarize what was done
`

/**
 * Build initial context from project structure and AST data.
 * Returns project overview without actual code (code is loaded lazily via tools).
 */
export function buildInitialContext(
    structure: ProjectStructure,
    asts: Map<string, FileAST>,
    metas?: Map<string, FileMeta>,
): string {
    const sections: string[] = []

    sections.push(buildProjectOverview(structure))
    sections.push(buildDirectoryTree(structure))
    sections.push(buildASTSummary(asts, metas))

    return sections.join("\n\n")
}

/**
 * Build project overview section.
 */
function buildProjectOverview(structure: ProjectStructure): string {
    const lines = [
        "## Project Overview",
        "",
        `**Name:** ${structure.name}`,
        `**Root:** ${structure.rootPath}`,
        `**Files:** ${String(structure.fileCount)}`,
    ]

    return lines.join("\n")
}

/**
 * Build directory tree section.
 */
function buildDirectoryTree(structure: ProjectStructure): string {
    const lines = ["## Directory Structure", ""]

    const sortedDirs = Array.from(structure.filesByDirectory.keys()).sort()

    for (const dir of sortedDirs) {
        const files = structure.filesByDirectory.get(dir) ?? []
        const relativeDir = dir.replace(structure.rootPath, "").replace(/^\//, "") || "."

        lines.push(`### ${relativeDir}/`)
        for (const file of files.sort()) {
            lines.push(`- ${file}`)
        }
        lines.push("")
    }

    return lines.join("\n")
}

/**
 * Build AST summary section.
 */
function buildASTSummary(asts: Map<string, FileAST>, metas?: Map<string, FileMeta>): string {
    const lines = ["## File Summary", ""]

    const sortedPaths = Array.from(asts.keys()).sort()

    for (const filePath of sortedPaths) {
        const ast = asts.get(filePath)
        if (!ast) {
            continue
        }

        const meta = metas?.get(filePath)
        const parts: string[] = []

        if (ast.functions.length > 0) {
            parts.push(`${String(ast.functions.length)} functions`)
        }
        if (ast.classes.length > 0) {
            parts.push(`${String(ast.classes.length)} classes`)
        }
        if (ast.interfaces.length > 0) {
            parts.push(`${String(ast.interfaces.length)} interfaces`)
        }
        if (ast.typeAliases.length > 0) {
            parts.push(`${String(ast.typeAliases.length)} types`)
        }
        if (meta?.isHub) {
            parts.push("hub")
        }
        if (meta?.isEntryPoint) {
            parts.push("entry")
        }

        if (parts.length > 0) {
            const fileName = filePath.split("/").pop() ?? filePath
            lines.push(`**${fileName}**: ${parts.join(", ")}`)
        }
    }

    return lines.join("\n")
}

/**
 * Create ProjectStructure from file paths.
 */
export function createProjectStructure(
    rootPath: string,
    name: string,
    filePaths: string[],
): ProjectStructure {
    const filesByDirectory = new Map<string, string[]>()

    for (const filePath of filePaths) {
        const dir = filePath.substring(0, filePath.lastIndexOf("/")) || rootPath
        const fileName = filePath.split("/").pop() ?? filePath

        const existing = filesByDirectory.get(dir) ?? []
        existing.push(fileName)
        filesByDirectory.set(dir, existing)
    }

    return {
        rootPath,
        name,
        fileCount: filePaths.length,
        filesByDirectory,
    }
}
