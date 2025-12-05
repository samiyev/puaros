import type { ToolDef } from "../../shared/types/tool-definitions.js"

/**
 * Tool definitions for ipuaro LLM.
 * 18 tools across 6 categories: read, edit, search, analysis, git, run.
 */

/*
 * =============================================================================
 * Read Tools (4)
 * =============================================================================
 */

export const GET_LINES_TOOL: ToolDef = {
    name: "get_lines",
    description:
        "Get specific lines from a file. Returns the content with line numbers. " +
        "If no range is specified, returns the entire file.",
    parameters: [
        {
            name: "path",
            type: "string",
            description: "File path relative to project root",
            required: true,
        },
        {
            name: "start",
            type: "number",
            description: "Start line number (1-based, inclusive)",
            required: false,
        },
        {
            name: "end",
            type: "number",
            description: "End line number (1-based, inclusive)",
            required: false,
        },
    ],
}

export const GET_FUNCTION_TOOL: ToolDef = {
    name: "get_function",
    description:
        "Get a function's source code by name. Uses AST to find exact line range. " +
        "Returns the function code with line numbers.",
    parameters: [
        {
            name: "path",
            type: "string",
            description: "File path relative to project root",
            required: true,
        },
        {
            name: "name",
            type: "string",
            description: "Function name to retrieve",
            required: true,
        },
    ],
}

export const GET_CLASS_TOOL: ToolDef = {
    name: "get_class",
    description:
        "Get a class's source code by name. Uses AST to find exact line range. " +
        "Returns the class code with line numbers.",
    parameters: [
        {
            name: "path",
            type: "string",
            description: "File path relative to project root",
            required: true,
        },
        {
            name: "name",
            type: "string",
            description: "Class name to retrieve",
            required: true,
        },
    ],
}

export const GET_STRUCTURE_TOOL: ToolDef = {
    name: "get_structure",
    description:
        "Get project directory structure as a tree. " +
        "If path is specified, shows structure of that subdirectory only.",
    parameters: [
        {
            name: "path",
            type: "string",
            description: "Subdirectory path relative to project root (optional, defaults to root)",
            required: false,
        },
        {
            name: "depth",
            type: "number",
            description: "Maximum depth to traverse (default: unlimited)",
            required: false,
        },
    ],
}

/*
 * =============================================================================
 * Edit Tools (3) - All require confirmation
 * =============================================================================
 */

export const EDIT_LINES_TOOL: ToolDef = {
    name: "edit_lines",
    description:
        "Replace lines in a file with new content. Requires reading the file first. " +
        "Will show diff and ask for confirmation before applying.",
    parameters: [
        {
            name: "path",
            type: "string",
            description: "File path relative to project root",
            required: true,
        },
        {
            name: "start",
            type: "number",
            description: "Start line number (1-based, inclusive) to replace",
            required: true,
        },
        {
            name: "end",
            type: "number",
            description: "End line number (1-based, inclusive) to replace",
            required: true,
        },
        {
            name: "content",
            type: "string",
            description: "New content to insert (can be multiple lines)",
            required: true,
        },
    ],
}

export const CREATE_FILE_TOOL: ToolDef = {
    name: "create_file",
    description:
        "Create a new file with specified content. " +
        "Will fail if file already exists. Will ask for confirmation.",
    parameters: [
        {
            name: "path",
            type: "string",
            description: "File path relative to project root",
            required: true,
        },
        {
            name: "content",
            type: "string",
            description: "File content",
            required: true,
        },
    ],
}

export const DELETE_FILE_TOOL: ToolDef = {
    name: "delete_file",
    description:
        "Delete a file from the project. " +
        "Will ask for confirmation. Previous content is saved to undo stack.",
    parameters: [
        {
            name: "path",
            type: "string",
            description: "File path relative to project root",
            required: true,
        },
    ],
}

/*
 * =============================================================================
 * Search Tools (2)
 * =============================================================================
 */

export const FIND_REFERENCES_TOOL: ToolDef = {
    name: "find_references",
    description:
        "Find all usages of a symbol across the codebase. " +
        "Returns list of file paths, line numbers, and context.",
    parameters: [
        {
            name: "symbol",
            type: "string",
            description: "Symbol name to search for (function, class, variable, etc.)",
            required: true,
        },
        {
            name: "path",
            type: "string",
            description: "Limit search to specific file or directory",
            required: false,
        },
    ],
}

export const FIND_DEFINITION_TOOL: ToolDef = {
    name: "find_definition",
    description:
        "Find where a symbol is defined. " + "Returns file path, line number, and symbol type.",
    parameters: [
        {
            name: "symbol",
            type: "string",
            description: "Symbol name to find definition for",
            required: true,
        },
    ],
}

/*
 * =============================================================================
 * Analysis Tools (4)
 * =============================================================================
 */

export const GET_DEPENDENCIES_TOOL: ToolDef = {
    name: "get_dependencies",
    description:
        "Get files that this file imports (internal dependencies). " +
        "Returns list of imported file paths.",
    parameters: [
        {
            name: "path",
            type: "string",
            description: "File path relative to project root",
            required: true,
        },
    ],
}

export const GET_DEPENDENTS_TOOL: ToolDef = {
    name: "get_dependents",
    description:
        "Get files that import this file (reverse dependencies). " +
        "Returns list of file paths that depend on this file.",
    parameters: [
        {
            name: "path",
            type: "string",
            description: "File path relative to project root",
            required: true,
        },
    ],
}

export const GET_COMPLEXITY_TOOL: ToolDef = {
    name: "get_complexity",
    description:
        "Get complexity metrics for a file or the entire project. " +
        "Returns LOC, nesting depth, cyclomatic complexity, and overall score.",
    parameters: [
        {
            name: "path",
            type: "string",
            description: "File path (optional, defaults to all files sorted by complexity)",
            required: false,
        },
        {
            name: "limit",
            type: "number",
            description: "Max files to return when showing all (default: 10)",
            required: false,
        },
    ],
}

export const GET_TODOS_TOOL: ToolDef = {
    name: "get_todos",
    description:
        "Find TODO, FIXME, HACK, and XXX comments in the codebase. " +
        "Returns list with file paths, line numbers, and comment text.",
    parameters: [
        {
            name: "path",
            type: "string",
            description: "Limit search to specific file or directory",
            required: false,
        },
        {
            name: "type",
            type: "string",
            description: "Filter by comment type",
            required: false,
            enum: ["TODO", "FIXME", "HACK", "XXX"],
        },
    ],
}

/*
 * =============================================================================
 * Git Tools (3)
 * =============================================================================
 */

export const GIT_STATUS_TOOL: ToolDef = {
    name: "git_status",
    description:
        "Get current git repository status. " +
        "Returns branch name, staged files, modified files, and untracked files.",
    parameters: [],
}

export const GIT_DIFF_TOOL: ToolDef = {
    name: "git_diff",
    description:
        "Get uncommitted changes (diff). " + "Shows what has changed but not yet committed.",
    parameters: [
        {
            name: "path",
            type: "string",
            description: "Limit diff to specific file or directory",
            required: false,
        },
        {
            name: "staged",
            type: "boolean",
            description: "Show only staged changes (default: false, shows all)",
            required: false,
        },
    ],
}

export const GIT_COMMIT_TOOL: ToolDef = {
    name: "git_commit",
    description:
        "Create a git commit with the specified message. " +
        "Will ask for confirmation. Optionally stage specific files first.",
    parameters: [
        {
            name: "message",
            type: "string",
            description: "Commit message",
            required: true,
        },
        {
            name: "files",
            type: "array",
            description: "Files to stage before commit (optional, defaults to all staged)",
            required: false,
        },
    ],
}

/*
 * =============================================================================
 * Run Tools (2)
 * =============================================================================
 */

export const RUN_COMMAND_TOOL: ToolDef = {
    name: "run_command",
    description:
        "Execute a shell command in the project directory. " +
        "Commands are checked against blacklist/whitelist for security. " +
        "Unknown commands require user confirmation.",
    parameters: [
        {
            name: "command",
            type: "string",
            description: "Shell command to execute",
            required: true,
        },
        {
            name: "timeout",
            type: "number",
            description: "Timeout in milliseconds (default: 30000)",
            required: false,
        },
    ],
}

export const RUN_TESTS_TOOL: ToolDef = {
    name: "run_tests",
    description:
        "Run the project's test suite. Auto-detects test runner (vitest, jest, npm test). " +
        "Returns test results summary.",
    parameters: [
        {
            name: "path",
            type: "string",
            description: "Run tests for specific file or directory",
            required: false,
        },
        {
            name: "filter",
            type: "string",
            description: "Filter tests by name pattern",
            required: false,
        },
        {
            name: "watch",
            type: "boolean",
            description: "Run in watch mode (default: false)",
            required: false,
        },
    ],
}

/*
 * =============================================================================
 * Tool Collection
 * =============================================================================
 */

/**
 * All read tools (no confirmation required).
 */
export const READ_TOOLS: ToolDef[] = [
    GET_LINES_TOOL,
    GET_FUNCTION_TOOL,
    GET_CLASS_TOOL,
    GET_STRUCTURE_TOOL,
]

/**
 * All edit tools (require confirmation).
 */
export const EDIT_TOOLS: ToolDef[] = [EDIT_LINES_TOOL, CREATE_FILE_TOOL, DELETE_FILE_TOOL]

/**
 * All search tools (no confirmation required).
 */
export const SEARCH_TOOLS: ToolDef[] = [FIND_REFERENCES_TOOL, FIND_DEFINITION_TOOL]

/**
 * All analysis tools (no confirmation required).
 */
export const ANALYSIS_TOOLS: ToolDef[] = [
    GET_DEPENDENCIES_TOOL,
    GET_DEPENDENTS_TOOL,
    GET_COMPLEXITY_TOOL,
    GET_TODOS_TOOL,
]

/**
 * All git tools (git_commit requires confirmation).
 */
export const GIT_TOOLS: ToolDef[] = [GIT_STATUS_TOOL, GIT_DIFF_TOOL, GIT_COMMIT_TOOL]

/**
 * All run tools (run_command may require confirmation).
 */
export const RUN_TOOLS: ToolDef[] = [RUN_COMMAND_TOOL, RUN_TESTS_TOOL]

/**
 * All 18 tool definitions.
 */
export const ALL_TOOLS: ToolDef[] = [
    ...READ_TOOLS,
    ...EDIT_TOOLS,
    ...SEARCH_TOOLS,
    ...ANALYSIS_TOOLS,
    ...GIT_TOOLS,
    ...RUN_TOOLS,
]

/**
 * Tools that require user confirmation before execution.
 */
export const CONFIRMATION_TOOLS = new Set([
    "edit_lines",
    "create_file",
    "delete_file",
    "git_commit",
])

/**
 * Check if a tool requires confirmation.
 */
export function requiresConfirmation(toolName: string): boolean {
    return CONFIRMATION_TOOLS.has(toolName)
}

/**
 * Get tool definition by name.
 */
export function getToolDef(name: string): ToolDef | undefined {
    return ALL_TOOLS.find((t) => t.name === name)
}

/**
 * Get tool definitions by category.
 */
export function getToolsByCategory(category: string): ToolDef[] {
    switch (category) {
        case "read":
            return READ_TOOLS
        case "edit":
            return EDIT_TOOLS
        case "search":
            return SEARCH_TOOLS
        case "analysis":
            return ANALYSIS_TOOLS
        case "git":
            return GIT_TOOLS
        case "run":
            return RUN_TOOLS
        default:
            return []
    }
}

/*
 * =============================================================================
 * Native Ollama Tools Format
 * =============================================================================
 */

/**
 * Ollama native tool definition format.
 */
export interface OllamaTool {
    type: "function"
    function: {
        name: string
        description: string
        parameters: {
            type: "object"
            properties: Record<string, OllamaToolProperty>
            required: string[]
        }
    }
}

interface OllamaToolProperty {
    type: string
    description: string
    enum?: string[]
    items?: { type: string }
}

/**
 * Convert ToolDef to Ollama native format.
 */
function convertToOllamaTool(tool: ToolDef): OllamaTool {
    const properties: Record<string, OllamaToolProperty> = {}
    const required: string[] = []

    for (const param of tool.parameters) {
        const prop: OllamaToolProperty = {
            type: param.type === "array" ? "array" : param.type,
            description: param.description,
        }

        if (param.enum) {
            prop.enum = param.enum
        }

        if (param.type === "array") {
            prop.items = { type: "string" }
        }

        properties[param.name] = prop

        if (param.required) {
            required.push(param.name)
        }
    }

    return {
        type: "function",
        function: {
            name: tool.name,
            description: tool.description,
            parameters: {
                type: "object",
                properties,
                required,
            },
        },
    }
}

/**
 * All tools in Ollama native format.
 * Used when useNativeTools is enabled.
 */
export const OLLAMA_NATIVE_TOOLS: OllamaTool[] = ALL_TOOLS.map(convertToOllamaTool)

/**
 * Get native tool definitions for Ollama.
 */
export function getOllamaNativeTools(): OllamaTool[] {
    return OLLAMA_NATIVE_TOOLS
}
