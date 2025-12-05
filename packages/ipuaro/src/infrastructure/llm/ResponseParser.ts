import { createToolCall, type ToolCall } from "../../domain/value-objects/ToolCall.js"

/**
 * Parsed response from LLM.
 */
export interface ParsedResponse {
    /** Text content (excluding tool calls) */
    content: string
    /** Extracted tool calls */
    toolCalls: ToolCall[]
    /** Whether parsing encountered issues */
    hasParseErrors: boolean
    /** Parse error messages */
    parseErrors: string[]
}

/**
 * XML tool call tag pattern.
 * Matches: <tool_call name="tool_name">...</tool_call>
 */
const TOOL_CALL_REGEX = /<tool_call\s+name\s*=\s*"([^"]+)">([\s\S]*?)<\/tool_call>/gi

/**
 * XML parameter tag pattern.
 * Matches: <param name="param_name">value</param> or <param_name>value</param_name>
 */
const PARAM_REGEX_NAMED = /<param\s+name\s*=\s*"([^"]+)">([\s\S]*?)<\/param>/gi
const PARAM_REGEX_ELEMENT = /<([a-z_][a-z0-9_]*)>([\s\S]*?)<\/\1>/gi

/**
 * CDATA section pattern.
 * Matches: <![CDATA[...]]>
 */
const CDATA_REGEX = /<!\[CDATA\[([\s\S]*?)\]\]>/g

/**
 * Valid tool names.
 * Used for validation to catch typos or hallucinations.
 */
const VALID_TOOL_NAMES = new Set([
    "get_lines",
    "get_function",
    "get_class",
    "get_structure",
    "edit_lines",
    "create_file",
    "delete_file",
    "find_references",
    "find_definition",
    "get_dependencies",
    "get_dependents",
    "get_complexity",
    "get_todos",
    "git_status",
    "git_diff",
    "git_commit",
    "run_command",
    "run_tests",
])

/**
 * Tool name aliases for common LLM typos/variations.
 * Maps incorrect names to correct tool names.
 */
const TOOL_ALIASES: Record<string, string> = {
    // get_lines aliases
    get_functions: "get_lines",
    read_file: "get_lines",
    read_lines: "get_lines",
    get_file: "get_lines",
    read: "get_lines",
    // get_function aliases
    getfunction: "get_function",
    // get_structure aliases
    list_files: "get_structure",
    get_files: "get_structure",
    list_structure: "get_structure",
    get_project_structure: "get_structure",
    // get_todos aliases
    find_todos: "get_todos",
    list_todos: "get_todos",
    // find_references aliases
    get_references: "find_references",
    // find_definition aliases
    get_definition: "find_definition",
    // edit_lines aliases
    edit_file: "edit_lines",
    modify_file: "edit_lines",
    update_file: "edit_lines",
}

/**
 * Normalize tool name using aliases.
 */
function normalizeToolName(name: string): string {
    const lowerName = name.toLowerCase()
    return TOOL_ALIASES[lowerName] ?? name
}

/**
 * Parse tool calls from LLM response text.
 * Supports both XML and JSON formats:
 * - XML: <tool_call name="get_lines"><path>src/index.ts</path></tool_call>
 * - JSON: {"name": "get_lines", "arguments": {"path": "src/index.ts"}}
 * Validates tool names and provides helpful error messages.
 */
export function parseToolCalls(response: string): ParsedResponse {
    const toolCalls: ToolCall[] = []
    const parseErrors: string[] = []
    let content = response

    // First, try XML format
    const xmlMatches = [...response.matchAll(TOOL_CALL_REGEX)]

    for (const match of xmlMatches) {
        const [fullMatch, rawToolName, paramsXml] = match

        // Normalize tool name (handle common LLM typos/variations)
        const toolName = normalizeToolName(rawToolName)

        if (!VALID_TOOL_NAMES.has(toolName)) {
            parseErrors.push(
                `Unknown tool "${rawToolName}". Valid tools: ${[...VALID_TOOL_NAMES].join(", ")}`,
            )
            continue
        }

        try {
            const params = parseParameters(paramsXml)
            const toolCall = createToolCall(
                `xml_${String(Date.now())}_${String(toolCalls.length)}`,
                toolName,
                params,
            )
            toolCalls.push(toolCall)
            content = content.replace(fullMatch, "")
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error)
            parseErrors.push(`Failed to parse tool call "${rawToolName}": ${errorMsg}`)
        }
    }

    // If no XML tool calls found, try JSON format as fallback
    if (toolCalls.length === 0) {
        const jsonResult = parseJsonToolCalls(response)
        toolCalls.push(...jsonResult.toolCalls)
        parseErrors.push(...jsonResult.parseErrors)

        // Remove JSON tool calls from content
        for (const jsonMatch of jsonResult.matchedStrings) {
            content = content.replace(jsonMatch, "")
        }
    }

    content = content.trim()

    return {
        content,
        toolCalls,
        hasParseErrors: parseErrors.length > 0,
        parseErrors,
    }
}

/**
 * JSON tool call format pattern.
 * Matches: {"name": "tool_name", "arguments": {...}}
 */
const JSON_TOOL_CALL_REGEX =
    /\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})\s*\}/g

/**
 * Parse tool calls from JSON format in response.
 * This is a fallback for LLMs that prefer JSON over XML.
 */
function parseJsonToolCalls(response: string): {
    toolCalls: ToolCall[]
    parseErrors: string[]
    matchedStrings: string[]
} {
    const toolCalls: ToolCall[] = []
    const parseErrors: string[] = []
    const matchedStrings: string[] = []

    const matches = [...response.matchAll(JSON_TOOL_CALL_REGEX)]

    for (const match of matches) {
        const [fullMatch, rawToolName, argsJson] = match
        matchedStrings.push(fullMatch)

        // Normalize tool name
        const toolName = normalizeToolName(rawToolName)

        if (!VALID_TOOL_NAMES.has(toolName)) {
            parseErrors.push(
                `Unknown tool "${rawToolName}". Valid tools: ${[...VALID_TOOL_NAMES].join(", ")}`,
            )
            continue
        }

        try {
            const args = JSON.parse(argsJson) as Record<string, unknown>
            const toolCall = createToolCall(
                `json_${String(Date.now())}_${String(toolCalls.length)}`,
                toolName,
                args,
            )
            toolCalls.push(toolCall)
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error)
            parseErrors.push(`Failed to parse JSON tool call "${rawToolName}": ${errorMsg}`)
        }
    }

    return { toolCalls, parseErrors, matchedStrings }
}

/**
 * Parse parameters from XML content.
 */
function parseParameters(xml: string): Record<string, unknown> {
    const params: Record<string, unknown> = {}

    const namedMatches = [...xml.matchAll(PARAM_REGEX_NAMED)]
    for (const match of namedMatches) {
        const [, name, value] = match
        params[name] = parseValue(value)
    }

    if (namedMatches.length === 0) {
        const elementMatches = [...xml.matchAll(PARAM_REGEX_ELEMENT)]
        for (const match of elementMatches) {
            const [, name, value] = match
            params[name] = parseValue(value)
        }
    }

    return params
}

/**
 * Parse a value string to appropriate type.
 * Supports CDATA sections for multiline content.
 */
function parseValue(value: string): unknown {
    const trimmed = value.trim()

    const cdataMatches = [...trimmed.matchAll(CDATA_REGEX)]
    if (cdataMatches.length > 0 && cdataMatches[0][1] !== undefined) {
        return cdataMatches[0][1]
    }

    if (trimmed === "true") {
        return true
    }

    if (trimmed === "false") {
        return false
    }

    if (trimmed === "null") {
        return null
    }

    const num = Number(trimmed)
    if (!isNaN(num) && trimmed !== "") {
        return num
    }

    if (
        (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
        (trimmed.startsWith("{") && trimmed.endsWith("}"))
    ) {
        try {
            return JSON.parse(trimmed)
        } catch {
            return trimmed
        }
    }

    return trimmed
}

/**
 * Format tool calls to XML for prompt injection.
 * Useful when you need to show the LLM the expected format.
 */
export function formatToolCallsAsXml(toolCalls: ToolCall[]): string {
    return toolCalls
        .map((tc) => {
            const params = Object.entries(tc.params)
                .map(([key, value]) => `  <${key}>${formatValueForXml(value)}</${key}>`)
                .join("\n")
            return `<tool_call name="${tc.name}">\n${params}\n</tool_call>`
        })
        .join("\n\n")
}

/**
 * Format a value for XML output.
 */
function formatValueForXml(value: unknown): string {
    if (value === null || value === undefined) {
        return ""
    }

    if (typeof value === "object") {
        return JSON.stringify(value)
    }

    if (typeof value === "string") {
        return value
    }

    if (typeof value === "number" || typeof value === "boolean") {
        return String(value)
    }

    return JSON.stringify(value)
}

/**
 * Extract thinking/reasoning from response.
 * Matches content between <thinking>...</thinking> tags.
 */
export function extractThinking(response: string): { thinking: string; content: string } {
    const thinkingRegex = /<thinking>([\s\S]*?)<\/thinking>/gi
    const matches = [...response.matchAll(thinkingRegex)]

    if (matches.length === 0) {
        return { thinking: "", content: response }
    }

    let content = response
    const thoughts: string[] = []

    for (const match of matches) {
        thoughts.push(match[1].trim())
        content = content.replace(match[0], "")
    }

    return {
        thinking: thoughts.join("\n\n"),
        content: content.trim(),
    }
}

/**
 * Check if response contains tool calls.
 */
export function hasToolCalls(response: string): boolean {
    return TOOL_CALL_REGEX.test(response)
}

/**
 * Validate tool call parameters against expected schema.
 */
export function validateToolCallParams(
    toolName: string,
    params: Record<string, unknown>,
    requiredParams: string[],
): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    for (const param of requiredParams) {
        if (!(param in params) || params[param] === undefined || params[param] === null) {
            errors.push(`Missing required parameter: ${param}`)
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    }
}
