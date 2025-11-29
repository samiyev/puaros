/**
 * Represents the result of a tool execution.
 */

export interface ToolResult {
    /** Tool call ID this result belongs to */
    callId: string
    /** Whether execution was successful */
    success: boolean
    /** Result data (varies by tool) */
    data?: unknown
    /** Error message if failed */
    error?: string
    /** Execution time in milliseconds */
    executionTimeMs: number
}

export function createSuccessResult(
    callId: string,
    data: unknown,
    executionTimeMs: number,
): ToolResult {
    return {
        callId,
        success: true,
        data,
        executionTimeMs,
    }
}

export function createErrorResult(
    callId: string,
    error: string,
    executionTimeMs: number,
): ToolResult {
    return {
        callId,
        success: false,
        error,
        executionTimeMs,
    }
}
