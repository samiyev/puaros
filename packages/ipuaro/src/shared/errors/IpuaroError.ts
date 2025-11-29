/**
 * Error types for ipuaro.
 */
export type ErrorType =
    | "redis"
    | "parse"
    | "llm"
    | "file"
    | "command"
    | "conflict"
    | "validation"
    | "timeout"
    | "unknown"

/**
 * Base error class for ipuaro.
 */
export class IpuaroError extends Error {
    readonly type: ErrorType
    readonly recoverable: boolean
    readonly suggestion?: string

    constructor(type: ErrorType, message: string, recoverable = true, suggestion?: string) {
        super(message)
        this.name = "IpuaroError"
        this.type = type
        this.recoverable = recoverable
        this.suggestion = suggestion
    }

    static redis(message: string): IpuaroError {
        return new IpuaroError(
            "redis",
            message,
            false,
            "Please ensure Redis is running: redis-server",
        )
    }

    static parse(message: string, filePath?: string): IpuaroError {
        const msg = filePath ? `${message} in ${filePath}` : message
        return new IpuaroError("parse", msg, true, "File will be skipped")
    }

    static llm(message: string): IpuaroError {
        return new IpuaroError(
            "llm",
            message,
            true,
            "Please ensure Ollama is running and model is available",
        )
    }

    static file(message: string): IpuaroError {
        return new IpuaroError("file", message, true)
    }

    static command(message: string): IpuaroError {
        return new IpuaroError("command", message, true)
    }

    static conflict(message: string): IpuaroError {
        return new IpuaroError(
            "conflict",
            message,
            true,
            "File was modified externally. Regenerate or skip.",
        )
    }

    static validation(message: string): IpuaroError {
        return new IpuaroError("validation", message, true)
    }

    static timeout(message: string): IpuaroError {
        return new IpuaroError("timeout", message, true, "Try again or increase timeout")
    }
}
