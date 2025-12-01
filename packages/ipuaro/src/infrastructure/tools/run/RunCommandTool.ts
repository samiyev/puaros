import { exec } from "node:child_process"
import { promisify } from "node:util"
import type { ITool, ToolContext, ToolParameterSchema } from "../../../domain/services/ITool.js"
import {
    createErrorResult,
    createSuccessResult,
    type ToolResult,
} from "../../../domain/value-objects/ToolResult.js"
import type { CommandsConfig } from "../../../shared/constants/config.js"
import { CommandSecurity } from "./CommandSecurity.js"

const execAsync = promisify(exec)

/**
 * Result data from run_command tool.
 */
export interface RunCommandResult {
    /** The command that was executed */
    command: string
    /** Exit code (0 = success) */
    exitCode: number
    /** Standard output */
    stdout: string
    /** Standard error output */
    stderr: string
    /** Whether command was successful (exit code 0) */
    success: boolean
    /** Execution time in milliseconds */
    durationMs: number
    /** Whether user confirmation was required */
    requiredConfirmation: boolean
}

/**
 * Default command timeout in milliseconds.
 */
const DEFAULT_TIMEOUT = 30000

/**
 * Maximum output size in characters.
 */
const MAX_OUTPUT_SIZE = 100000

/**
 * Tool for executing shell commands.
 * Commands are checked against blacklist/whitelist for security.
 */
export class RunCommandTool implements ITool {
    readonly name = "run_command"
    readonly description =
        "Execute a shell command in the project directory. " +
        "Commands are checked against blacklist/whitelist for security. " +
        "Unknown commands require user confirmation."
    readonly parameters: ToolParameterSchema[] = [
        {
            name: "command",
            type: "string",
            description: "Shell command to execute",
            required: true,
        },
        {
            name: "timeout",
            type: "number",
            description: "Timeout in milliseconds (default: from config or 30000, max: 600000)",
            required: false,
        },
    ]
    readonly requiresConfirmation = false
    readonly category = "run" as const

    private readonly security: CommandSecurity
    private readonly execFn: typeof execAsync
    private readonly configTimeout: number | null

    constructor(security?: CommandSecurity, execFn?: typeof execAsync, config?: CommandsConfig) {
        this.security = security ?? new CommandSecurity()
        this.execFn = execFn ?? execAsync
        this.configTimeout = config?.timeout ?? null
    }

    validateParams(params: Record<string, unknown>): string | null {
        if (params.command === undefined) {
            return "Parameter 'command' is required"
        }
        if (typeof params.command !== "string") {
            return "Parameter 'command' must be a string"
        }
        if (params.command.trim() === "") {
            return "Parameter 'command' cannot be empty"
        }
        if (params.timeout !== undefined) {
            if (typeof params.timeout !== "number") {
                return "Parameter 'timeout' must be a number"
            }
            if (params.timeout <= 0) {
                return "Parameter 'timeout' must be positive"
            }
            if (params.timeout > 600000) {
                return "Parameter 'timeout' cannot exceed 600000ms (10 minutes)"
            }
        }
        return null
    }

    async execute(params: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
        const startTime = Date.now()
        const callId = `${this.name}-${String(startTime)}`

        const command = params.command as string
        const timeout = (params.timeout as number) ?? this.configTimeout ?? DEFAULT_TIMEOUT

        const securityCheck = this.security.check(command)

        if (securityCheck.classification === "blocked") {
            return createErrorResult(
                callId,
                `Command blocked for security: ${securityCheck.reason}`,
                Date.now() - startTime,
            )
        }

        let requiredConfirmation = false

        if (securityCheck.classification === "requires_confirmation") {
            requiredConfirmation = true
            const confirmed = await ctx.requestConfirmation(
                `Execute command: ${command}\n\nReason: ${securityCheck.reason}`,
            )

            if (!confirmed) {
                return createErrorResult(
                    callId,
                    "Command execution cancelled by user",
                    Date.now() - startTime,
                )
            }
        }

        try {
            const execStartTime = Date.now()

            const { stdout, stderr } = await this.execFn(command, {
                cwd: ctx.projectRoot,
                timeout,
                maxBuffer: MAX_OUTPUT_SIZE,
                env: { ...process.env, FORCE_COLOR: "0" },
            })

            const durationMs = Date.now() - execStartTime

            const result: RunCommandResult = {
                command,
                exitCode: 0,
                stdout: this.truncateOutput(stdout),
                stderr: this.truncateOutput(stderr),
                success: true,
                durationMs,
                requiredConfirmation,
            }

            return createSuccessResult(callId, result, Date.now() - startTime)
        } catch (error) {
            return this.handleExecError(callId, command, error, requiredConfirmation, startTime)
        }
    }

    /**
     * Handle exec errors and return appropriate result.
     */
    private handleExecError(
        callId: string,
        command: string,
        error: unknown,
        requiredConfirmation: boolean,
        startTime: number,
    ): ToolResult {
        if (this.isExecError(error)) {
            const result: RunCommandResult = {
                command,
                exitCode: error.code ?? 1,
                stdout: this.truncateOutput(error.stdout ?? ""),
                stderr: this.truncateOutput(error.stderr ?? error.message),
                success: false,
                durationMs: Date.now() - startTime,
                requiredConfirmation,
            }

            return createSuccessResult(callId, result, Date.now() - startTime)
        }

        if (error instanceof Error) {
            if (error.message.includes("ETIMEDOUT") || error.message.includes("timed out")) {
                return createErrorResult(
                    callId,
                    `Command timed out: ${command}`,
                    Date.now() - startTime,
                )
            }
            return createErrorResult(callId, error.message, Date.now() - startTime)
        }

        return createErrorResult(callId, String(error), Date.now() - startTime)
    }

    /**
     * Type guard for exec error.
     */
    private isExecError(
        error: unknown,
    ): error is Error & { code?: number; stdout?: string; stderr?: string } {
        return error instanceof Error && "code" in error
    }

    /**
     * Truncate output if too large.
     */
    private truncateOutput(output: string): string {
        if (output.length <= MAX_OUTPUT_SIZE) {
            return output
        }
        return `${output.slice(0, MAX_OUTPUT_SIZE)}\n... (output truncated)`
    }

    /**
     * Get the security checker instance.
     */
    getSecurity(): CommandSecurity {
        return this.security
    }
}
