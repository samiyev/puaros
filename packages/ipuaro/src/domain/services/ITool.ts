import type { ToolResult } from "../value-objects/ToolResult.js"
import type { IStorage } from "./IStorage.js"

/**
 * Tool parameter schema.
 */
export interface ToolParameterSchema {
    name: string
    type: "string" | "number" | "boolean" | "array" | "object"
    description: string
    required: boolean
    default?: unknown
}

/**
 * Context provided to tools during execution.
 */
export interface ToolContext {
    /** Project root path */
    projectRoot: string
    /** Storage service */
    storage: IStorage
    /** Request user confirmation callback */
    requestConfirmation: (message: string, diff?: DiffInfo) => Promise<boolean>
    /** Report progress callback */
    onProgress?: (message: string) => void
}

/**
 * Diff information for confirmation dialogs.
 */
export interface DiffInfo {
    filePath: string
    oldLines: string[]
    newLines: string[]
    startLine: number
}

/**
 * Tool interface (port).
 * All tools must implement this interface.
 */
export interface ITool {
    /** Tool name (used in tool calls) */
    readonly name: string

    /** Human-readable description */
    readonly description: string

    /** Tool parameters schema */
    readonly parameters: ToolParameterSchema[]

    /** Whether tool requires user confirmation before execution */
    readonly requiresConfirmation: boolean

    /** Tool category */
    readonly category: "read" | "edit" | "search" | "analysis" | "git" | "run"

    /**
     * Execute the tool with given parameters.
     */
    execute(params: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult>

    /**
     * Validate parameters before execution.
     */
    validateParams(params: Record<string, unknown>): string | null
}
