import type { ITool, ToolContext } from "../../domain/services/ITool.js"
import type { ToolResult } from "../../domain/value-objects/ToolResult.js"

/**
 * Tool registry interface.
 * Manages registration and execution of tools.
 */
export interface IToolRegistry {
    /**
     * Register a tool.
     */
    register(tool: ITool): void

    /**
     * Get tool by name.
     */
    get(name: string): ITool | undefined

    /**
     * Get all registered tools.
     */
    getAll(): ITool[]

    /**
     * Get tools by category.
     */
    getByCategory(category: ITool["category"]): ITool[]

    /**
     * Check if tool exists.
     */
    has(name: string): boolean

    /**
     * Execute tool by name.
     */
    execute(name: string, params: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult>

    /**
     * Get tool definitions for LLM.
     */
    getToolDefinitions(): {
        name: string
        description: string
        parameters: {
            type: "object"
            properties: Record<string, { type: string; description: string }>
            required: string[]
        }
    }[]
}
