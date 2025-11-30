import * as path from "node:path"
import type { ITool, ToolContext, ToolParameterSchema } from "../../../domain/services/ITool.js"
import {
    createErrorResult,
    createSuccessResult,
    type ToolResult,
} from "../../../domain/value-objects/ToolResult.js"

/**
 * Single dependent entry with metadata.
 */
export interface DependentEntry {
    /** Relative path to the dependent file */
    path: string
    /** Whether the file is an entry point */
    isEntryPoint: boolean
    /** Whether the file is a hub */
    isHub: boolean
    /** File type classification */
    fileType: "source" | "test" | "config" | "types" | "unknown"
    /** Complexity score of the dependent */
    complexityScore: number
}

/**
 * Result data from get_dependents tool.
 */
export interface GetDependentsResult {
    /** The file being analyzed */
    file: string
    /** Total number of dependents */
    totalDependents: number
    /** Whether this file is a hub (>5 dependents) */
    isHub: boolean
    /** List of files that import this file */
    dependents: DependentEntry[]
    /** File type of the source file */
    fileType: "source" | "test" | "config" | "types" | "unknown"
}

/**
 * Tool for getting files that import a specific file.
 * Returns the list of files that depend on the target file.
 */
export class GetDependentsTool implements ITool {
    readonly name = "get_dependents"
    readonly description =
        "Get files that import a specific file. " +
        "Returns list of files that depend on the target."
    readonly parameters: ToolParameterSchema[] = [
        {
            name: "path",
            type: "string",
            description: "File path to analyze (relative to project root or absolute)",
            required: true,
        },
    ]
    readonly requiresConfirmation = false
    readonly category = "analysis" as const

    validateParams(params: Record<string, unknown>): string | null {
        if (typeof params.path !== "string" || params.path.trim() === "") {
            return "Parameter 'path' is required and must be a non-empty string"
        }
        return null
    }

    async execute(params: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
        const startTime = Date.now()
        const callId = `${this.name}-${String(startTime)}`

        const inputPath = (params.path as string).trim()

        try {
            const relativePath = this.normalizePathToRelative(inputPath, ctx.projectRoot)

            const meta = await ctx.storage.getMeta(relativePath)
            if (!meta) {
                return createErrorResult(
                    callId,
                    `File not found or not indexed: ${relativePath}`,
                    Date.now() - startTime,
                )
            }

            const dependents: DependentEntry[] = []
            for (const depPath of meta.dependents) {
                const depMeta = await ctx.storage.getMeta(depPath)
                dependents.push({
                    path: depPath,
                    isEntryPoint: depMeta?.isEntryPoint ?? false,
                    isHub: depMeta?.isHub ?? false,
                    fileType: depMeta?.fileType ?? "unknown",
                    complexityScore: depMeta?.complexity.score ?? 0,
                })
            }

            dependents.sort((a, b) => a.path.localeCompare(b.path))

            const result: GetDependentsResult = {
                file: relativePath,
                totalDependents: dependents.length,
                isHub: meta.isHub,
                dependents,
                fileType: meta.fileType,
            }

            return createSuccessResult(callId, result, Date.now() - startTime)
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            return createErrorResult(callId, message, Date.now() - startTime)
        }
    }

    /**
     * Normalize input path to relative path from project root.
     */
    private normalizePathToRelative(inputPath: string, projectRoot: string): string {
        if (path.isAbsolute(inputPath)) {
            return path.relative(projectRoot, inputPath)
        }
        return inputPath
    }
}
