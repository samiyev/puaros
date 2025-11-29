import type { ToolCall } from "./ToolCall.js"
import type { ToolResult } from "./ToolResult.js"

/**
 * Represents a message in the chat history.
 */

export type MessageRole = "user" | "assistant" | "tool" | "system"

export interface MessageStats {
    /** Token count for this message */
    tokens: number
    /** Response generation time in ms (for assistant messages) */
    timeMs: number
    /** Number of tool calls in this message */
    toolCalls: number
}

export interface ChatMessage {
    /** Message role */
    role: MessageRole
    /** Message content */
    content: string
    /** Timestamp when message was created */
    timestamp: number
    /** Tool calls made by assistant (if any) */
    toolCalls?: ToolCall[]
    /** Tool results (for tool role messages) */
    toolResults?: ToolResult[]
    /** Message statistics */
    stats?: MessageStats
}

export function createUserMessage(content: string): ChatMessage {
    return {
        role: "user",
        content,
        timestamp: Date.now(),
    }
}

export function createAssistantMessage(
    content: string,
    toolCalls?: ToolCall[],
    stats?: MessageStats,
): ChatMessage {
    return {
        role: "assistant",
        content,
        timestamp: Date.now(),
        toolCalls,
        stats,
    }
}

export function createToolMessage(results: ToolResult[]): ChatMessage {
    return {
        role: "tool",
        content: results.map((r) => formatToolResult(r)).join("\n\n"),
        timestamp: Date.now(),
        toolResults: results,
    }
}

export function createSystemMessage(content: string): ChatMessage {
    return {
        role: "system",
        content,
        timestamp: Date.now(),
    }
}

function formatToolResult(result: ToolResult): string {
    if (result.success) {
        return `[${result.callId}] Success: ${JSON.stringify(result.data)}`
    }
    const errorMsg = result.error ?? "Unknown error"
    return `[${result.callId}] Error: ${errorMsg}`
}
