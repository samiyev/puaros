import type { ChatMessage } from "../value-objects/ChatMessage.js"
import type { ToolCall } from "../value-objects/ToolCall.js"

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
 *
 * Tool definitions should be included in the system prompt as XML format,
 * not passed as a separate parameter.
 */
export interface ILLMClient {
    /**
     * Send messages to LLM and get response.
     * Tool calls are extracted from the response content using XML parsing.
     */
    chat(messages: ChatMessage[]): Promise<LLMResponse>

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
