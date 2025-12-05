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
 * Options for building initial context.
 */
export interface BuildContextOptions {
    includeSignatures?: boolean
    includeDepsGraph?: boolean
    includeCircularDeps?: boolean
    includeHighImpactFiles?: boolean
    circularDeps?: string[][]
}

/**
 * System prompt for the ipuaro AI agent.
 */
export const SYSTEM_PROMPT = `You are ipuaro, a local AI code assistant with tools for reading, searching, analyzing, and editing code.

## When to Use Tools

**Use tools** when the user asks about:
- Code content (files, functions, classes)
- Project structure
- TODOs, complexity, dependencies
- Git status, diffs, commits
- Running commands or tests

**Do NOT use tools** for:
- Greetings ("Hello", "Hi", "Thanks")
- General questions not about this codebase
- Clarifying questions back to the user

## MANDATORY: Tools for Code Questions

**CRITICAL:** You have ZERO code in your context. To answer ANY question about code, you MUST first call a tool.

**WRONG:**
User: "What's in src/index.ts?"
Assistant: "The file likely contains..." ← WRONG! Call a tool!

**CORRECT:**
User: "What's in src/index.ts?"
<tool_call name="get_lines">
<path>src/index.ts</path>
</tool_call>

## Tool Call Format

Output this XML format. Do NOT explain before calling - just output the XML:

<tool_call name="TOOL_NAME">
<param1>value1</param1>
<param2>value2</param2>
</tool_call>

## Example Interactions

**Example 1 - Reading a file:**
User: "Show me the main function in src/app.ts"
<tool_call name="get_function">
<path>src/app.ts</path>
<name>main</name>
</tool_call>

**Example 2 - Finding TODOs:**
User: "Are there any TODO comments?"
<tool_call name="get_todos">
</tool_call>

**Example 3 - Project structure:**
User: "What files are in this project?"
<tool_call name="get_structure">
<path>.</path>
</tool_call>

## Available Tools

### Reading
- get_lines(path, start?, end?) - Read file lines
- get_function(path, name) - Get function by name
- get_class(path, name) - Get class by name
- get_structure(path?, depth?) - List project files

### Analysis
- get_todos(path?, type?) - Find TODO/FIXME comments
- get_dependencies(path) - What this file imports
- get_dependents(path) - What imports this file
- get_complexity(path?) - Code complexity metrics
- find_references(symbol) - Find all usages of a symbol
- find_definition(symbol) - Find where symbol is defined

### Editing (requires confirmation)
- edit_lines(path, start, end, content) - Modify file lines
- create_file(path, content) - Create new file
- delete_file(path) - Delete a file

### Git
- git_status() - Repository status
- git_diff(path?, staged?) - Show changes
- git_commit(message, files?) - Create commit

### Commands
- run_command(command, timeout?) - Execute shell command
- run_tests(path?, filter?) - Run test suite

## Rules

1. **ALWAYS call a tool first** when asked about code - you cannot see any files
2. **Output XML directly** - don't say "I will use..." just output the tool call
3. **Wait for results** before making conclusions
4. **Be concise** in your responses
5. **Verify before editing** - always read code before modifying it
6. **Stay safe** - never execute destructive commands without user confirmation`

/**
 * Tool usage reminder - appended to messages to reinforce tool usage.
 * This is added as the last system message before LLM call.
 */
export const TOOL_REMINDER = `⚠️ REMINDER: To answer this question, you MUST use a tool first.
Output the <tool_call> XML directly. Do NOT describe what you will do - just call the tool.

Example - if asked about a file, output:
<tool_call name="get_lines">
<path>the/file/path.ts</path>
</tool_call>`

/**
 * Build initial context from project structure and AST metadata.
 * Returns a compact representation without actual code.
 */
export function buildInitialContext(
    structure: ProjectStructure,
    asts: Map<string, FileAST>,
    metas?: Map<string, FileMeta>,
    options?: BuildContextOptions,
): string {
    const sections: string[] = []
    const includeSignatures = options?.includeSignatures ?? true
    const includeDepsGraph = options?.includeDepsGraph ?? true
    const includeCircularDeps = options?.includeCircularDeps ?? true
    const includeHighImpactFiles = options?.includeHighImpactFiles ?? true

    sections.push(formatProjectHeader(structure))
    sections.push(formatDirectoryTree(structure))
    sections.push(formatFileOverview(asts, metas, includeSignatures))

    if (includeDepsGraph && metas && metas.size > 0) {
        const depsGraph = formatDependencyGraph(metas)
        if (depsGraph) {
            sections.push(depsGraph)
        }
    }

    if (includeHighImpactFiles && metas && metas.size > 0) {
        const highImpactSection = formatHighImpactFiles(metas)
        if (highImpactSection) {
            sections.push(highImpactSection)
        }
    }

    if (includeCircularDeps && options?.circularDeps && options.circularDeps.length > 0) {
        const circularDepsSection = formatCircularDeps(options.circularDeps)
        if (circularDepsSection) {
            sections.push(circularDepsSection)
        }
    }

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
function formatFileOverview(
    asts: Map<string, FileAST>,
    metas?: Map<string, FileMeta>,
    includeSignatures = true,
): string {
    const lines: string[] = ["## Files", ""]

    const sortedPaths = [...asts.keys()].sort()
    for (const path of sortedPaths) {
        const ast = asts.get(path)
        if (!ast) {
            continue
        }

        const meta = metas?.get(path)
        lines.push(formatFileSummary(path, ast, meta, includeSignatures))
    }

    return lines.join("\n")
}

/**
 * Format decorators as a prefix string.
 * Example: "@Get(':id') @Auth() "
 */
function formatDecoratorsPrefix(decorators: string[] | undefined): string {
    if (!decorators || decorators.length === 0) {
        return ""
    }
    return `${decorators.join(" ")} `
}

/**
 * Format a function signature.
 */
function formatFunctionSignature(fn: FileAST["functions"][0]): string {
    const decoratorsPrefix = formatDecoratorsPrefix(fn.decorators)
    const asyncPrefix = fn.isAsync ? "async " : ""
    const params = fn.params
        .map((p) => {
            const optional = p.optional ? "?" : ""
            const type = p.type ? `: ${p.type}` : ""
            return `${p.name}${optional}${type}`
        })
        .join(", ")
    const returnType = fn.returnType ? `: ${fn.returnType}` : ""
    return `${decoratorsPrefix}${asyncPrefix}${fn.name}(${params})${returnType}`
}

/**
 * Format an interface signature with fields.
 * Example: "interface User extends Base { id: string, name: string, email?: string }"
 */
function formatInterfaceSignature(iface: FileAST["interfaces"][0]): string {
    const extList = iface.extends ?? []
    const ext = extList.length > 0 ? ` extends ${extList.join(", ")}` : ""

    if (iface.properties.length === 0) {
        return `interface ${iface.name}${ext}`
    }

    const fields = iface.properties
        .map((p) => {
            const readonly = p.isReadonly ? "readonly " : ""
            const optional = p.name.endsWith("?") ? "" : ""
            const type = p.type ? `: ${p.type}` : ""
            return `${readonly}${p.name}${optional}${type}`
        })
        .join(", ")

    return `interface ${iface.name}${ext} { ${fields} }`
}

/**
 * Format a type alias signature with definition.
 * Example: "type UserId = string" or "type Handler = (event: Event) => void"
 */
function formatTypeAliasSignature(type: FileAST["typeAliases"][0]): string {
    if (!type.definition) {
        return `type ${type.name}`
    }

    const definition = truncateDefinition(type.definition, 80)
    return `type ${type.name} = ${definition}`
}

/**
 * Format an enum signature with members and values.
 * Example: "enum Status { Active=1, Inactive=0, Pending=2 }"
 * Example: "const enum Role { Admin="admin", User="user" }"
 */
function formatEnumSignature(enumInfo: FileAST["enums"][0]): string {
    const constPrefix = enumInfo.isConst ? "const " : ""

    if (enumInfo.members.length === 0) {
        return `${constPrefix}enum ${enumInfo.name}`
    }

    const membersStr = enumInfo.members
        .map((m) => {
            if (m.value === undefined) {
                return m.name
            }
            const valueStr = typeof m.value === "string" ? `"${m.value}"` : String(m.value)
            return `${m.name}=${valueStr}`
        })
        .join(", ")

    const result = `${constPrefix}enum ${enumInfo.name} { ${membersStr} }`

    if (result.length > 100) {
        return truncateDefinition(result, 100)
    }

    return result
}

/**
 * Truncate long type definitions for display.
 */
function truncateDefinition(definition: string, maxLength: number): string {
    const normalized = definition.replace(/\s+/g, " ").trim()
    if (normalized.length <= maxLength) {
        return normalized
    }
    return `${normalized.slice(0, maxLength - 3)}...`
}

/**
 * Format a single file's AST summary.
 * When includeSignatures is true, shows full function signatures.
 * When false, shows compact format with just names.
 */
function formatFileSummary(
    path: string,
    ast: FileAST,
    meta?: FileMeta,
    includeSignatures = true,
): string {
    const flags = formatFileFlags(meta)

    if (!includeSignatures) {
        return formatFileSummaryCompact(path, ast, flags)
    }

    const lines: string[] = []
    lines.push(`### ${path}${flags}`)

    if (ast.functions.length > 0) {
        for (const fn of ast.functions) {
            lines.push(`- ${formatFunctionSignature(fn)}`)
        }
    }

    if (ast.classes.length > 0) {
        for (const cls of ast.classes) {
            const decoratorsPrefix = formatDecoratorsPrefix(cls.decorators)
            const ext = cls.extends ? ` extends ${cls.extends}` : ""
            const impl = cls.implements.length > 0 ? ` implements ${cls.implements.join(", ")}` : ""
            lines.push(`- ${decoratorsPrefix}class ${cls.name}${ext}${impl}`)
        }
    }

    if (ast.interfaces.length > 0) {
        for (const iface of ast.interfaces) {
            lines.push(`- ${formatInterfaceSignature(iface)}`)
        }
    }

    if (ast.typeAliases.length > 0) {
        for (const type of ast.typeAliases) {
            lines.push(`- ${formatTypeAliasSignature(type)}`)
        }
    }

    if (ast.enums && ast.enums.length > 0) {
        for (const enumInfo of ast.enums) {
            lines.push(`- ${formatEnumSignature(enumInfo)}`)
        }
    }

    if (lines.length === 1) {
        return `- ${path}${flags}`
    }

    return lines.join("\n")
}

/**
 * Format file summary in compact mode (just names, no signatures).
 */
function formatFileSummaryCompact(path: string, ast: FileAST, flags: string): string {
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

    if (ast.enums && ast.enums.length > 0) {
        const names = ast.enums.map((e) => e.name).join(", ")
        parts.push(`enum: ${names}`)
    }

    const summary = parts.length > 0 ? ` [${parts.join(" | ")}]` : ""
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
 * Shorten a file path for display in dependency graph.
 * Removes common prefixes like "src/" and file extensions.
 */
function shortenPath(path: string): string {
    let short = path
    if (short.startsWith("src/")) {
        short = short.slice(4)
    }
    // Remove common extensions
    short = short.replace(/\.(ts|tsx|js|jsx)$/, "")
    // Remove /index suffix
    short = short.replace(/\/index$/, "")
    return short
}

/**
 * Format a single dependency graph entry.
 * Format: "path: → dep1, dep2 ← dependent1, dependent2"
 */
function formatDepsEntry(path: string, dependencies: string[], dependents: string[]): string {
    const parts: string[] = []
    const shortPath = shortenPath(path)

    if (dependencies.length > 0) {
        const deps = dependencies.map(shortenPath).join(", ")
        parts.push(`→ ${deps}`)
    }

    if (dependents.length > 0) {
        const deps = dependents.map(shortenPath).join(", ")
        parts.push(`← ${deps}`)
    }

    if (parts.length === 0) {
        return ""
    }

    return `${shortPath}: ${parts.join(" ")}`
}

/**
 * Format dependency graph for all files.
 * Shows hub files first, then files with dependencies/dependents.
 *
 * Format:
 * ## Dependency Graph
 * services/user: → types/user, utils/validation ← controllers/user
 * services/auth: → services/user, utils/jwt ← controllers/auth
 */
export function formatDependencyGraph(metas: Map<string, FileMeta>): string | null {
    if (metas.size === 0) {
        return null
    }

    const entries: { path: string; deps: string[]; dependents: string[]; isHub: boolean }[] = []

    for (const [path, meta] of metas) {
        // Only include files that have connections
        if (meta.dependencies.length > 0 || meta.dependents.length > 0) {
            entries.push({
                path,
                deps: meta.dependencies,
                dependents: meta.dependents,
                isHub: meta.isHub,
            })
        }
    }

    if (entries.length === 0) {
        return null
    }

    // Sort: hubs first, then by total connections (desc), then by path
    entries.sort((a, b) => {
        if (a.isHub !== b.isHub) {
            return a.isHub ? -1 : 1
        }
        const aTotal = a.deps.length + a.dependents.length
        const bTotal = b.deps.length + b.dependents.length
        if (aTotal !== bTotal) {
            return bTotal - aTotal
        }
        return a.path.localeCompare(b.path)
    })

    const lines: string[] = ["## Dependency Graph", ""]

    for (const entry of entries) {
        const line = formatDepsEntry(entry.path, entry.deps, entry.dependents)
        if (line) {
            lines.push(line)
        }
    }

    // Return null if only header (no actual entries)
    if (lines.length <= 2) {
        return null
    }

    return lines.join("\n")
}

/**
 * Format circular dependencies for display in context.
 * Shows warning section with cycle chains.
 *
 * Format:
 * ## ⚠️ Circular Dependencies
 * - services/user → services/auth → services/user
 * - utils/a → utils/b → utils/c → utils/a
 */
export function formatCircularDeps(cycles: string[][]): string | null {
    if (!cycles || cycles.length === 0) {
        return null
    }

    const lines: string[] = ["## ⚠️ Circular Dependencies", ""]

    for (const cycle of cycles) {
        if (cycle.length === 0) {
            continue
        }
        const formattedCycle = cycle.map(shortenPath).join(" → ")
        lines.push(`- ${formattedCycle}`)
    }

    // Return null if only header (no actual cycles)
    if (lines.length <= 2) {
        return null
    }

    return lines.join("\n")
}

/**
 * Format high impact files table for display in context.
 * Shows files with highest impact scores (most dependents).
 * Includes both direct and transitive dependent counts.
 *
 * Format:
 * ## High Impact Files
 * | File | Impact | Direct | Transitive |
 * |------|--------|--------|------------|
 * | src/utils/validation.ts | 67% | 12 | 24 |
 *
 * @param metas - Map of file paths to their metadata
 * @param limit - Maximum number of files to show (default: 10)
 * @param minImpact - Minimum impact score to include (default: 5)
 */
export function formatHighImpactFiles(
    metas: Map<string, FileMeta>,
    limit = 10,
    minImpact = 5,
): string | null {
    if (metas.size === 0) {
        return null
    }

    // Collect files with impact score >= minImpact
    const impactFiles: {
        path: string
        impact: number
        dependents: number
        transitive: number
    }[] = []

    for (const [path, meta] of metas) {
        if (meta.impactScore >= minImpact) {
            impactFiles.push({
                path,
                impact: meta.impactScore,
                dependents: meta.dependents.length,
                transitive: meta.transitiveDepCount,
            })
        }
    }

    if (impactFiles.length === 0) {
        return null
    }

    // Sort by transitive count descending, then by impact, then by path
    impactFiles.sort((a, b) => {
        if (a.transitive !== b.transitive) {
            return b.transitive - a.transitive
        }
        if (a.impact !== b.impact) {
            return b.impact - a.impact
        }
        return a.path.localeCompare(b.path)
    })

    // Take top N files
    const topFiles = impactFiles.slice(0, limit)

    const lines: string[] = [
        "## High Impact Files",
        "",
        "| File | Impact | Direct | Transitive |",
        "|------|--------|--------|------------|",
    ]

    for (const file of topFiles) {
        const shortPath = shortenPath(file.path)
        const impact = `${String(file.impact)}%`
        const direct = String(file.dependents)
        const transitive = String(file.transitive)
        lines.push(`| ${shortPath} | ${impact} | ${direct} | ${transitive} |`)
    }

    return lines.join("\n")
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
