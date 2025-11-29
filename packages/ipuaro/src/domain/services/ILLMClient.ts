import type { ChatMessage } from "../value-objects/ChatMessage.js"
import type { ToolCall } from "../value-objects/ToolCall.js"

/**
 * Tool parameter definition for LLM.
 */
export interface ToolParameter {
    name: string
    type: "string" | "number" | "boolean" | "array" | "object"
    description: string
    required: boolean
    enum?: string[]
}

/**
 * Tool definition for LLM function calling.
 */
export interface ToolDef {
    name: string
    description: string
    parameters: ToolParameter[]
}

/**
 * Response from LLM.
 */
export interface LLMResponse {
    /** Text content of the response */
    content: string
    /** Tool calls parsed from response */
    toolCalls: ToolCall[]
    /** Token count for this response */
    tokens: number
    /** Generation time in milliseconds */
    timeMs: number
    /** Whether response was truncated */
    truncated: boolean
    /** Stop reason */
    stopReason: "end" | "length" | "tool_use"
}

/**
 * LLM client service interface (port).
 * Abstracts the LLM provider.
 */
export interface ILLMClient {
    /**
     * Send messages to LLM and get response.
     */
    chat(messages: ChatMessage[], tools?: ToolDef[]): Promise<LLMResponse>

    /**
     * Count tokens in text.
     */
    countTokens(text: string): Promise<number>

    /**
     * Check if LLM service is available.
     */
    isAvailable(): Promise<boolean>

    /**
     * Get current model name.
     */
    getModelName(): string

    /**
     * Get context window size.
     */
    getContextWindowSize(): number

    /**
     * Pull/download model if not available locally.
     */
    pullModel(model: string): Promise<void>

    /**
     * Abort current generation.
     */
    abort(): void
}
