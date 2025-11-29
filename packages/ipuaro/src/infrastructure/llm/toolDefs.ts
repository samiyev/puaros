/**
 * Tool definition schema for LLM prompting.
 * Compatible with OpenAI function calling format.
 */
export interface ToolDef {
    /** Tool name (unique identifier) */
    name: string
    /** Human-readable description */
    description: string
    /** Tool category */
    category: "read" | "edit" | "search" | "analysis" | "git" | "run"
    /** Whether tool requires user confirmation */
    requiresConfirmation: boolean
    /** Parameter schema */
    parameters: {
        type: "object"
        properties: Record<string, ToolParamDef>
        required: string[]
    }
}

/**
 * Parameter definition for a tool.
 */
export interface ToolParamDef {
    type: "string" | "number" | "boolean" | "array"
    description: string
    items?: { type: string }
}

/**
 * All 18 tool definitions for the LLM.
 */
export const TOOL_DEFINITIONS: ToolDef[] = [
    // ==================== READ TOOLS ====================
    {
        name: "get_lines",
        description: "Read specific lines from a file. Returns line numbers and content.",
        category: "read",
        requiresConfirmation: false,
        parameters: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "File path relative to project root",
                },
                start: {
                    type: "number",
                    description: "Start line number (1-based, inclusive). Default: 1",
                },
                end: {
                    type: "number",
                    description: "End line number (1-based, inclusive). Default: end of file",
                },
            },
            required: ["path"],
        },
    },
    {
        name: "get_function",
        description: "Get a function's complete source code by name.",
        category: "read",
        requiresConfirmation: false,
        parameters: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "File path relative to project root",
                },
                name: {
                    type: "string",
                    description: "Function name to find",
                },
            },
            required: ["path", "name"],
        },
    },
    {
        name: "get_class",
        description:
            "Get a class's complete source code by name, including all methods and properties.",
        category: "read",
        requiresConfirmation: false,
        parameters: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "File path relative to project root",
                },
                name: {
                    type: "string",
                    description: "Class name to find",
                },
            },
            required: ["path", "name"],
        },
    },
    {
        name: "get_structure",
        description:
            "Get file structure overview: imports, exports, functions, classes, interfaces.",
        category: "read",
        requiresConfirmation: false,
        parameters: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "File path relative to project root",
                },
            },
            required: ["path"],
        },
    },

    // ==================== SEARCH TOOLS ====================
    {
        name: "find_references",
        description: "Find all references to a symbol across the codebase.",
        category: "search",
        requiresConfirmation: false,
        parameters: {
            type: "object",
            properties: {
                symbol: {
                    type: "string",
                    description: "Symbol name to search for (function, class, variable, etc.)",
                },
                path: {
                    type: "string",
                    description: "Optional: limit search to specific file or directory",
                },
            },
            required: ["symbol"],
        },
    },
    {
        name: "find_definition",
        description: "Find where a symbol is defined (function, class, type, interface, etc.).",
        category: "search",
        requiresConfirmation: false,
        parameters: {
            type: "object",
            properties: {
                symbol: {
                    type: "string",
                    description: "Symbol name to find definition for",
                },
                path: {
                    type: "string",
                    description: "Optional: file where the symbol is used (for context)",
                },
            },
            required: ["symbol"],
        },
    },

    // ==================== ANALYSIS TOOLS ====================
    {
        name: "get_dependencies",
        description: "Get all files that a file imports (its dependencies).",
        category: "analysis",
        requiresConfirmation: false,
        parameters: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "File path relative to project root",
                },
                depth: {
                    type: "number",
                    description: "How deep to traverse. 1 = direct imports only. Default: 1",
                },
            },
            required: ["path"],
        },
    },
    {
        name: "get_dependents",
        description: "Get all files that import a given file (reverse dependencies).",
        category: "analysis",
        requiresConfirmation: false,
        parameters: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "File path relative to project root",
                },
            },
            required: ["path"],
        },
    },
    {
        name: "get_complexity",
        description:
            "Get complexity metrics for a file: cyclomatic complexity, lines, function count.",
        category: "analysis",
        requiresConfirmation: false,
        parameters: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "File path relative to project root",
                },
            },
            required: ["path"],
        },
    },
    {
        name: "get_todos",
        description: "Find all TODO, FIXME, HACK comments in files.",
        category: "analysis",
        requiresConfirmation: false,
        parameters: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "Optional: file or directory path. Default: entire project",
                },
                types: {
                    type: "array",
                    description: 'Comment types to find. Default: ["TODO", "FIXME", "HACK"]',
                    items: { type: "string" },
                },
            },
            required: [],
        },
    },

    // ==================== EDIT TOOLS ====================
    {
        name: "edit_lines",
        description:
            "Modify specific lines in a file. Replaces lines from start to end with new content.",
        category: "edit",
        requiresConfirmation: true,
        parameters: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "File path relative to project root",
                },
                start: {
                    type: "number",
                    description: "Start line number (1-based, inclusive)",
                },
                end: {
                    type: "number",
                    description: "End line number (1-based, inclusive)",
                },
                content: {
                    type: "string",
                    description: "New content to replace the lines with",
                },
            },
            required: ["path", "start", "end", "content"],
        },
    },
    {
        name: "create_file",
        description: "Create a new file with the given content. Fails if file already exists.",
        category: "edit",
        requiresConfirmation: true,
        parameters: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "File path relative to project root",
                },
                content: {
                    type: "string",
                    description: "File content",
                },
            },
            required: ["path", "content"],
        },
    },
    {
        name: "delete_file",
        description: "Delete a file. This action cannot be undone.",
        category: "edit",
        requiresConfirmation: true,
        parameters: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "File path relative to project root",
                },
            },
            required: ["path"],
        },
    },

    // ==================== GIT TOOLS ====================
    {
        name: "git_status",
        description: "Show working tree status: modified, staged, and untracked files.",
        category: "git",
        requiresConfirmation: false,
        parameters: {
            type: "object",
            properties: {},
            required: [],
        },
    },
    {
        name: "git_diff",
        description: "Show changes in files. Can show staged, unstaged, or specific file diff.",
        category: "git",
        requiresConfirmation: false,
        parameters: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "Optional: specific file to show diff for",
                },
                staged: {
                    type: "boolean",
                    description: "Show staged changes only. Default: false",
                },
            },
            required: [],
        },
    },
    {
        name: "git_commit",
        description: "Create a commit with staged changes.",
        category: "git",
        requiresConfirmation: true,
        parameters: {
            type: "object",
            properties: {
                message: {
                    type: "string",
                    description: "Commit message",
                },
            },
            required: ["message"],
        },
    },

    // ==================== RUN TOOLS ====================
    {
        name: "run_command",
        description:
            "Execute a shell command. Use with caution. Some commands may be blocked for security.",
        category: "run",
        requiresConfirmation: true,
        parameters: {
            type: "object",
            properties: {
                command: {
                    type: "string",
                    description: "Shell command to execute",
                },
                cwd: {
                    type: "string",
                    description: "Working directory. Default: project root",
                },
                timeout: {
                    type: "number",
                    description: "Timeout in milliseconds. Default: 30000",
                },
            },
            required: ["command"],
        },
    },
    {
        name: "run_tests",
        description: "Run the project's test suite using the detected test runner.",
        category: "run",
        requiresConfirmation: false,
        parameters: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "Optional: specific test file or directory",
                },
                filter: {
                    type: "string",
                    description: "Optional: test name pattern to filter",
                },
            },
            required: [],
        },
    },
]

/**
 * Get tool definition by name.
 */
export function getToolDef(name: string): ToolDef | undefined {
    return TOOL_DEFINITIONS.find((t) => t.name === name)
}

/**
 * Get all tool definitions for a category.
 */
export function getToolsByCategory(category: ToolDef["category"]): ToolDef[] {
    return TOOL_DEFINITIONS.filter((t) => t.category === category)
}

/**
 * Get all tool names.
 */
export function getToolNames(): string[] {
    return TOOL_DEFINITIONS.map((t) => t.name)
}

/**
 * Build XML schema representation of a tool for the LLM prompt.
 */
export function buildToolXmlSchema(tool: ToolDef): string {
    const lines: string[] = []
    lines.push(`### ${tool.name}`)
    lines.push("")
    lines.push(tool.description)
    lines.push("")
    lines.push("```xml")
    lines.push(`<tool_call name="${tool.name}">`)

    const props = tool.parameters.properties
    const required = new Set(tool.parameters.required)

    for (const [paramName, paramDef] of Object.entries(props)) {
        const optionalMark = required.has(paramName) ? "" : "?"
        lines.push(`  <param name="${paramName}${optionalMark}">${paramDef.description}</param>`)
    }

    lines.push("</tool_call>")
    lines.push("```")

    return lines.join("\n")
}

/**
 * Build XML schema for all tools, grouped by category.
 */
export function buildAllToolsXmlSchema(): string {
    const categories: ToolDef["category"][] = ["read", "edit", "search", "analysis", "git", "run"]
    const categoryTitles: Record<ToolDef["category"], string> = {
        read: "Reading Code",
        edit: "Editing Files",
        search: "Searching",
        analysis: "Analysis",
        git: "Git Operations",
        run: "Running Commands",
    }

    const sections: string[] = []

    for (const category of categories) {
        const tools = getToolsByCategory(category)
        if (tools.length === 0) {
            continue
        }

        sections.push(`## ${categoryTitles[category]}`)
        sections.push("")
        for (const tool of tools) {
            sections.push(buildToolXmlSchema(tool))
            sections.push("")
        }
    }

    return sections.join("\n")
}
