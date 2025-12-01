import { promises as fs } from "node:fs"
import * as path from "node:path"
import type { ITool, ToolContext, ToolParameterSchema } from "../../../domain/services/ITool.js"
import { createFileData } from "../../../domain/value-objects/FileData.js"
import {
    createErrorResult,
    createSuccessResult,
    type ToolResult,
} from "../../../domain/value-objects/ToolResult.js"
import { hashLines } from "../../../shared/utils/hash.js"
import { PathValidator } from "../../security/PathValidator.js"

/**
 * Result data from create_file tool.
 */
export interface CreateFileResult {
    path: string
    lines: number
    size: number
}

/**
 * Tool for creating new files.
 * Creates a new file with the specified content.
 * Requires user confirmation before creating.
 */
export class CreateFileTool implements ITool {
    readonly name = "create_file"
    readonly description =
        "Create a new file with the specified content. " +
        "The file path must be within the project root. " +
        "Requires confirmation before creating."
    readonly parameters: ToolParameterSchema[] = [
        {
            name: "path",
            type: "string",
            description: "File path relative to project root",
            required: true,
        },
        {
            name: "content",
            type: "string",
            description: "File content",
            required: true,
        },
    ]
    readonly requiresConfirmation = true
    readonly category = "edit" as const

    validateParams(params: Record<string, unknown>): string | null {
        if (typeof params.path !== "string" || params.path.trim() === "") {
            return "Parameter 'path' is required and must be a non-empty string"
        }

        if (typeof params.content !== "string") {
            return "Parameter 'content' is required and must be a string"
        }

        return null
    }

    async execute(params: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
        const startTime = Date.now()
        const callId = `${this.name}-${String(startTime)}`

        const inputPath = params.path as string
        const content = params.content as string

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
            const exists = await this.fileExists(absolutePath)
            if (exists) {
                return createErrorResult(
                    callId,
                    `File already exists: ${relativePath}`,
                    Date.now() - startTime,
                )
            }

            const lines = content.split("\n")

            const confirmed = await ctx.requestConfirmation(
                `Create new file: ${relativePath} (${String(lines.length)} lines)`,
                {
                    filePath: relativePath,
                    oldLines: [],
                    newLines: lines,
                    startLine: 1,
                },
            )

            if (!confirmed) {
                return createErrorResult(
                    callId,
                    "File creation cancelled by user",
                    Date.now() - startTime,
                )
            }

            const dirPath = path.dirname(absolutePath)
            await fs.mkdir(dirPath, { recursive: true })
            await fs.writeFile(absolutePath, content, "utf-8")

            const stats = await fs.stat(absolutePath)
            const fileData = createFileData(lines, hashLines(lines), stats.size, stats.mtimeMs)
            await ctx.storage.setFile(relativePath, fileData)

            const result: CreateFileResult = {
                path: relativePath,
                lines: lines.length,
                size: stats.size,
            }

            return createSuccessResult(callId, result, Date.now() - startTime)
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            return createErrorResult(callId, message, Date.now() - startTime)
        }
    }

    /**
     * Check if file exists.
     */
    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.access(filePath)
            return true
        } catch {
            return false
        }
    }
}
