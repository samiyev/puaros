/**
 * Shared types for ipuaro.
 */

/**
 * Application status.
 */
export type AppStatus = "ready" | "thinking" | "indexing" | "error"

/**
 * File language type.
 */
export type FileLanguage = "ts" | "tsx" | "js" | "jsx" | "json" | "yaml" | "unknown"

/**
 * User choice for confirmations.
 */
export type ConfirmChoice = "apply" | "cancel" | "edit"

/**
 * User choice for errors.
 * @deprecated Use ErrorOption from shared/errors instead
 */
export type ErrorChoice = "retry" | "skip" | "abort"

// Re-export ErrorOption for convenience
export type { ErrorOption } from "../errors/IpuaroError.js"

// Re-export tool definition types
export type { ToolDef, ToolParameter } from "./tool-definitions.js"

/**
 * Project structure node.
 */
export interface ProjectNode {
    name: string
    type: "file" | "directory"
    path: string
    children?: ProjectNode[]
}

/**
 * Generic result type.
 */
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E }

/**
 * Create success result.
 */
export function ok<T>(data: T): Result<T, never> {
    return { success: true, data }
}

/**
 * Create error result.
 */
export function err<E>(error: E): Result<never, E> {
    return { success: false, error }
}

/**
 * Check if result is success.
 */
export function isOk<T, E>(result: Result<T, E>): result is { success: true; data: T } {
    return result.success
}

/**
 * Check if result is error.
 */
export function isErr<T, E>(result: Result<T, E>): result is { success: false; error: E } {
    return !result.success
}
