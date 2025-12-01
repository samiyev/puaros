import { promises as fs } from "node:fs"
import type { ITool, ToolContext, ToolParameterSchema } from "../../../domain/services/ITool.js"
import {
    createErrorResult,
    createSuccessResult,
    type ToolResult,
} from "../../../domain/value-objects/ToolResult.js"
import { PathValidator } from "../../security/PathValidator.js"

/**
 * Result data from get_lines tool.
 */
export interface GetLinesResult {
    path: string
    startLine: number
    endLine: number
    totalLines: number
    content: string
}

/**
 * Tool for reading specific lines from a file.
 * Returns content with line numbers.
 */
export class GetLinesTool implements ITool {
    readonly name = "get_lines"
    readonly description =
        "Get specific lines from a file. Returns the content with line numbers. " +
        "If no range is specified, returns the entire file."
    readonly parameters: ToolParameterSchema[] = [
        {
            name: "path",
            type: "string",
            description: "File path relative to project root",
            required: true,
        },
        {
            name: "start",
            type: "number",
            description: "Start line number (1-based, inclusive)",
            required: false,
        },
        {
            name: "end",
            type: "number",
            description: "End line number (1-based, inclusive)",
            required: false,
        },
    ]
    readonly requiresConfirmation = false
    readonly category = "read" as const

    validateParams(params: Record<string, unknown>): string | null {
        if (typeof params.path !== "string" || params.path.trim() === "") {
            return "Parameter 'path' is required and must be a non-empty string"
        }

        if (params.start !== undefined) {
            if (typeof params.start !== "number" || !Number.isInteger(params.start)) {
                return "Parameter 'start' must be an integer"
            }
            if (params.start < 1) {
                return "Parameter 'start' must be >= 1"
            }
        }

        if (params.end !== undefined) {
            if (typeof params.end !== "number" || !Number.isInteger(params.end)) {
                return "Parameter 'end' must be an integer"
            }
            if (params.end < 1) {
                return "Parameter 'end' must be >= 1"
            }
        }

        if (params.start !== undefined && params.end !== undefined && params.start > params.end) {
            return "Parameter 'start' must be <= 'end'"
        }

        return null
    }

    async execute(params: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
        const startTime = Date.now()
        const callId = `${this.name}-${String(startTime)}`

        const inputPath = params.path as string
        const pathValidator = new PathValidator(ctx.projectRoot)

        let absolutePath: string
        let relativePath: string
        try {
            ;[absolutePath, relativePath] = pathValidator.resolveOrThrow(inputPath)
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            return createErrorResult(callId, message, Date.now() - startTime)
        }

        try {
            const lines = await this.getFileLines(absolutePath, relativePath, ctx)
            const totalLines = lines.length

            let startLine = (params.start as number | undefined) ?? 1
            let endLine = (params.end as number | undefined) ?? totalLines

            startLine = Math.max(1, Math.min(startLine, totalLines))
            endLine = Math.max(startLine, Math.min(endLine, totalLines))

            const selectedLines = lines.slice(startLine - 1, endLine)
            const content = this.formatLinesWithNumbers(selectedLines, startLine)

            const result: GetLinesResult = {
                path: relativePath,
                startLine,
                endLine,
                totalLines,
                content,
            }

            return createSuccessResult(callId, result, Date.now() - startTime)
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            return createErrorResult(callId, message, Date.now() - startTime)
        }
    }

    /**
     * Get file lines from storage or filesystem.
     */
    private async getFileLines(
        absolutePath: string,
        relativePath: string,
        ctx: ToolContext,
    ): Promise<string[]> {
        const fileData = await ctx.storage.getFile(relativePath)
        if (fileData) {
            return fileData.lines
        }

        const content = await fs.readFile(absolutePath, "utf-8")
        return content.split("\n")
    }

    /**
     * Format lines with line numbers.
     * Example: "  1│const x = 1"
     */
    private formatLinesWithNumbers(lines: string[], startLine: number): string {
        const maxLineNum = startLine + lines.length - 1
        const padWidth = String(maxLineNum).length

        return lines
            .map((line, index) => {
                const lineNum = String(startLine + index).padStart(padWidth, " ")
                return `${lineNum}│${line}`
            })
            .join("\n")
    }
}
