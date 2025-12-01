import { promises as fs } from "node:fs"
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
 * Result data from edit_lines tool.
 */
export interface EditLinesResult {
    path: string
    startLine: number
    endLine: number
    linesReplaced: number
    linesInserted: number
    totalLines: number
}

/**
 * Tool for editing specific lines in a file.
 * Replaces lines from start to end with new content.
 * Requires user confirmation before applying changes.
 */
export class EditLinesTool implements ITool {
    readonly name = "edit_lines"
    readonly description =
        "Replace lines in a file. Replaces lines from start to end (inclusive) with new content. " +
        "Requires confirmation before applying changes."
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
            required: true,
        },
        {
            name: "end",
            type: "number",
            description: "End line number (1-based, inclusive)",
            required: true,
        },
        {
            name: "content",
            type: "string",
            description: "New content to insert (can be multi-line)",
            required: true,
        },
    ]
    readonly requiresConfirmation = true
    readonly category = "edit" as const

    validateParams(params: Record<string, unknown>): string | null {
        if (typeof params.path !== "string" || params.path.trim() === "") {
            return "Parameter 'path' is required and must be a non-empty string"
        }

        if (typeof params.start !== "number" || !Number.isInteger(params.start)) {
            return "Parameter 'start' is required and must be an integer"
        }
        if (params.start < 1) {
            return "Parameter 'start' must be >= 1"
        }

        if (typeof params.end !== "number" || !Number.isInteger(params.end)) {
            return "Parameter 'end' is required and must be an integer"
        }
        if (params.end < 1) {
            return "Parameter 'end' must be >= 1"
        }

        if (params.start > params.end) {
            return "Parameter 'start' must be <= 'end'"
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
        const startLine = params.start as number
        const endLine = params.end as number
        const newContent = params.content as string

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
            const currentLines = await this.getCurrentLines(absolutePath, relativePath, ctx)
            const totalLines = currentLines.length

            if (startLine > totalLines) {
                return createErrorResult(
                    callId,
                    `Start line ${String(startLine)} exceeds file length (${String(totalLines)} lines)`,
                    Date.now() - startTime,
                )
            }

            const adjustedEnd = Math.min(endLine, totalLines)
            const conflictCheck = await this.checkHashConflict(relativePath, currentLines, ctx)
            if (conflictCheck) {
                return createErrorResult(callId, conflictCheck, Date.now() - startTime)
            }

            const oldLines = currentLines.slice(startLine - 1, adjustedEnd)
            const newLines = newContent.split("\n")

            const confirmed = await ctx.requestConfirmation(
                `Replace lines ${String(startLine)}-${String(adjustedEnd)} in ${relativePath}`,
                {
                    filePath: relativePath,
                    oldLines,
                    newLines,
                    startLine,
                },
            )

            if (!confirmed) {
                return createErrorResult(callId, "Edit cancelled by user", Date.now() - startTime)
            }

            const updatedLines = [
                ...currentLines.slice(0, startLine - 1),
                ...newLines,
                ...currentLines.slice(adjustedEnd),
            ]

            await this.applyChanges(absolutePath, relativePath, updatedLines, ctx)

            const result: EditLinesResult = {
                path: relativePath,
                startLine,
                endLine: adjustedEnd,
                linesReplaced: adjustedEnd - startLine + 1,
                linesInserted: newLines.length,
                totalLines: updatedLines.length,
            }

            return createSuccessResult(callId, result, Date.now() - startTime)
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            return createErrorResult(callId, message, Date.now() - startTime)
        }
    }

    /**
     * Get current file lines from storage or filesystem.
     */
    private async getCurrentLines(
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
     * Check if file has changed since it was indexed.
     * Returns error message if conflict detected, null otherwise.
     */
    private async checkHashConflict(
        relativePath: string,
        currentLines: string[],
        ctx: ToolContext,
    ): Promise<string | null> {
        const storedFile = await ctx.storage.getFile(relativePath)
        if (!storedFile) {
            return null
        }

        const currentHash = hashLines(currentLines)
        if (storedFile.hash !== currentHash) {
            return "File has been modified externally. Please refresh the file before editing."
        }

        return null
    }

    /**
     * Apply changes to filesystem and storage.
     */
    private async applyChanges(
        absolutePath: string,
        relativePath: string,
        lines: string[],
        ctx: ToolContext,
    ): Promise<void> {
        const content = lines.join("\n")
        await fs.writeFile(absolutePath, content, "utf-8")

        const stats = await fs.stat(absolutePath)
        const fileData = createFileData(lines, hashLines(lines), stats.size, stats.mtimeMs)
        await ctx.storage.setFile(relativePath, fileData)
    }
}
