/**
 * Simple logging utility
 */

export type LogLevel = "debug" | "info" | "warn" | "error"

export class Logger {
    constructor(private context: string) {}

    debug(message: string, meta?: Record<string, unknown>): void {
        this.log("debug", message, meta)
    }

    info(message: string, meta?: Record<string, unknown>): void {
        this.log("info", message, meta)
    }

    warn(message: string, meta?: Record<string, unknown>): void {
        this.log("warn", message, meta)
    }

    error(message: string, error?: Error, meta?: Record<string, unknown>): void {
        this.log("error", message, { ...meta, error: error?.message })
    }

    private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
        const timestamp = new Date().toISOString()
        const logEntry = {
            timestamp,
            level,
            context: this.context,
            message,
            ...(meta && { meta })
        }
        console.log(JSON.stringify(logEntry))
    }
}

export function createLogger(context: string): Logger {
    return new Logger(context)
}
