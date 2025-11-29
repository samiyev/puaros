/**
 * Represents a tool call from the LLM.
 */

export interface ToolCall {
    /** Unique identifier for this call */
    id: string
    /** Tool name */
    name: string
    /** Tool parameters */
    params: Record<string, unknown>
    /** Timestamp when call was made */
    timestamp: number
}

export function createToolCall(
    id: string,
    name: string,
    params: Record<string, unknown>,
): ToolCall {
    return {
        id,
        name,
        params,
        timestamp: Date.now(),
    }
}
