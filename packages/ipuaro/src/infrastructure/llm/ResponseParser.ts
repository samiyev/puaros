import { createToolCall, type ToolCall } from "../../domain/value-objects/ToolCall.js"

/**
 * Result of parsing an LLM response.
 */
export interface ParseResult {
    /** Plain text content (outside of tool calls) */
    text: string
    /** Extracted tool calls */
    toolCalls: ToolCall[]
    /** Whether response contains unfinished tool call */
    hasIncompleteToolCall: boolean
}

/**
 * Parses LLM responses to extract tool calls in XML format.
 *
 * Expected format:
 * ```xml
 * <tool_call name="tool_name">
 *   <param name="param1">value1</param>
 *   <param name="param2">value2</param>
 * </tool_call>
 * ```
 */
export class ResponseParser {
    private callCounter = 0

    /**
     * Parse LLM response to extract text and tool calls.
     */
    parse(response: string): ParseResult {
        const toolCalls: ToolCall[] = []
        let text = response
        let hasIncompleteToolCall = false

        // Check for incomplete tool call (opened but not closed)
        const lastOpenTag = response.lastIndexOf("<tool_call")
        const lastCloseTag = response.lastIndexOf("</tool_call>")
        if (lastOpenTag > lastCloseTag) {
            hasIncompleteToolCall = true
        }

        // Match complete tool calls
        const toolCallRegex = /<tool_call\s+name=["']([^"']+)["']>([\s\S]*?)<\/tool_call>/g
        let match: RegExpExecArray | null

        while ((match = toolCallRegex.exec(response)) !== null) {
            const [fullMatch, toolName, content] = match
            const params = this.parseParams(content)
            const id = this.generateId()

            toolCalls.push(createToolCall(id, toolName, params))

            // Remove tool call from text
            text = text.replace(fullMatch, "")
        }

        // Clean up text
        text = this.cleanText(text)

        return {
            text,
            toolCalls,
            hasIncompleteToolCall,
        }
    }

    /**
     * Parse parameters from tool call content.
     */
    private parseParams(content: string): Record<string, unknown> {
        const params: Record<string, unknown> = {}

        // Match param tags
        const paramRegex = /<param\s+name=["']([^"']+)["']>([\s\S]*?)<\/param>/g
        let match: RegExpExecArray | null

        while ((match = paramRegex.exec(content)) !== null) {
            const [, paramName, paramValue] = match
            params[paramName] = this.parseValue(paramValue.trim())
        }

        return params
    }

    /**
     * Parse a parameter value, attempting type conversion.
     */
    private parseValue(value: string): unknown {
        // Try boolean
        if (value === "true") {
            return true
        }
        if (value === "false") {
            return false
        }

        // Try null/undefined
        if (value === "null") {
            return null
        }
        if (value === "undefined") {
            return undefined
        }

        // Try number
        if (/^-?\d+$/.test(value)) {
            return parseInt(value, 10)
        }
        if (/^-?\d+\.\d+$/.test(value)) {
            return parseFloat(value)
        }

        // Try JSON array/object
        if (
            (value.startsWith("[") && value.endsWith("]")) ||
            (value.startsWith("{") && value.endsWith("}"))
        ) {
            try {
                return JSON.parse(value) as unknown
            } catch {
                // Not valid JSON, return as string
            }
        }

        // Return as string
        return value
    }

    /**
     * Clean up text content.
     */
    private cleanText(text: string): string {
        // Remove incomplete tool calls
        text = text.replace(/<tool_call[^>]*>[\s\S]*$/g, "")

        // Collapse multiple newlines
        text = text.replace(/\n{3,}/g, "\n\n")

        // Trim whitespace
        return text.trim()
    }

    /**
     * Generate unique call ID.
     */
    private generateId(): string {
        this.callCounter++
        return `call_${String(Date.now())}_${String(this.callCounter)}`
    }

    /**
     * Reset the call counter (useful for testing).
     */
    resetCounter(): void {
        this.callCounter = 0
    }

    /**
     * Check if response contains any tool calls.
     */
    hasToolCalls(response: string): boolean {
        return /<tool_call\s+name=["'][^"']+["']>[\s\S]*?<\/tool_call>/.test(response)
    }

    /**
     * Count the number of tool calls in response.
     */
    countToolCalls(response: string): number {
        const matches = response.match(/<tool_call\s+name=["'][^"']+["']>[\s\S]*?<\/tool_call>/g)
        return matches?.length ?? 0
    }

    /**
     * Extract just the tool names from response without full parsing.
     */
    extractToolNames(response: string): string[] {
        const names: string[] = []
        const regex = /<tool_call\s+name=["']([^"']+)["']>/g
        let match: RegExpExecArray | null

        while ((match = regex.exec(response)) !== null) {
            names.push(match[1])
        }

        return names
    }
}

/**
 * Default parser instance.
 */
export const defaultParser = new ResponseParser()

/**
 * Convenience function to parse response.
 */
export function parseResponse(response: string): ParseResult {
    return defaultParser.parse(response)
}

/**
 * Convenience function to extract tool calls.
 */
export function parseToolCalls(response: string): ToolCall[] {
    return defaultParser.parse(response).toolCalls
}
