import { promises as fs } from "node:fs"
import type { ITool, ToolContext, ToolParameterSchema } from "../../../domain/services/ITool.js"
import {
    createErrorResult,
    createSuccessResult,
    type ToolResult,
} from "../../../domain/value-objects/ToolResult.js"
import { PathValidator } from "../../security/PathValidator.js"

/**
 * Result data from delete_file tool.
 */
export interface DeleteFileResult {
    path: string
    deleted: boolean
}

/**
 * Tool for deleting files.
 * Deletes a file from the filesystem and storage.
 * Requires user confirmation before deleting.
 */
export class DeleteFileTool implements ITool {
    readonly name = "delete_file"
    readonly description =
        "Delete a file from the project. " +
        "The file path must be within the project root. " +
        "Requires confirmation before deleting."
    readonly parameters: ToolParameterSchema[] = [
        {
            name: "path",
            type: "string",
            description: "File path relative to project root",
            required: true,
        },
    ]
    readonly requiresConfirmation = true
    readonly category = "edit" as const

    validateParams(params: Record<string, unknown>): string | null {
        if (typeof params.path !== "string" || params.path.trim() === "") {
            return "Parameter 'path' is required and must be a non-empty string"
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
            const exists = await this.fileExists(absolutePath)
            if (!exists) {
                return createErrorResult(
                    callId,
                    `File not found: ${relativePath}`,
                    Date.now() - startTime,
                )
            }

            const fileContent = await this.getFileContent(absolutePath, relativePath, ctx)

            const confirmed = await ctx.requestConfirmation(`Delete file: ${relativePath}`, {
                filePath: relativePath,
                oldLines: fileContent,
                newLines: [],
                startLine: 1,
            })

            if (!confirmed) {
                return createErrorResult(
                    callId,
                    "File deletion cancelled by user",
                    Date.now() - startTime,
                )
            }

            await fs.unlink(absolutePath)

            await ctx.storage.deleteFile(relativePath)
            await ctx.storage.deleteAST(relativePath)
            await ctx.storage.deleteMeta(relativePath)

            const result: DeleteFileResult = {
                path: relativePath,
                deleted: true,
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
            const stats = await fs.stat(filePath)
            return stats.isFile()
        } catch {
            return false
        }
    }

    /**
     * Get file content for diff display.
     */
    private async getFileContent(
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
}
