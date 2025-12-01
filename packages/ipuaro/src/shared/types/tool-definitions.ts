/**
 * Tool parameter definition for LLM prompts.
 * Used to describe tools in system prompts.
 */
export interface ToolParameter {
    name: string
    type: "string" | "number" | "boolean" | "array" | "object"
    description: string
    required: boolean
    enum?: string[]
}

/**
 * Tool definition for LLM prompts.
 * Used to describe available tools in the system prompt.
 */
export interface ToolDef {
    name: string
    description: string
    parameters: ToolParameter[]
}
