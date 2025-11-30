import * as path from "node:path"
import type { ITool, ToolContext, ToolParameterSchema } from "../../../domain/services/ITool.js"
import {
    createErrorResult,
    createSuccessResult,
    type ToolResult,
} from "../../../domain/value-objects/ToolResult.js"

/**
 * Single dependency entry with metadata.
 */
export interface DependencyEntry {
    /** Relative path to the dependency */
    path: string
    /** Whether the file exists in the project */
    exists: boolean
    /** Whether it's an entry point */
    isEntryPoint: boolean
    /** Whether it's a hub file */
    isHub: boolean
    /** File type classification */
    fileType: "source" | "test" | "config" | "types" | "unknown"
}

/**
 * Result data from get_dependencies tool.
 */
export interface GetDependenciesResult {
    /** The file being analyzed */
    file: string
    /** Total number of dependencies */
    totalDependencies: number
    /** List of dependencies with metadata */
    dependencies: DependencyEntry[]
    /** File type of the source file */
    fileType: "source" | "test" | "config" | "types" | "unknown"
}

/**
 * Tool for getting files that a specific file imports.
 * Returns the list of internal dependencies from FileMeta.
 */
export class GetDependenciesTool implements ITool {
    readonly name = "get_dependencies"
    readonly description =
        "Get files that a specific file imports. " +
        "Returns internal dependencies resolved to file paths."
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

            const dependencies: DependencyEntry[] = []
            for (const depPath of meta.dependencies) {
                const depMeta = await ctx.storage.getMeta(depPath)
                dependencies.push({
                    path: depPath,
                    exists: depMeta !== null,
                    isEntryPoint: depMeta?.isEntryPoint ?? false,
                    isHub: depMeta?.isHub ?? false,
                    fileType: depMeta?.fileType ?? "unknown",
                })
            }

            dependencies.sort((a, b) => a.path.localeCompare(b.path))

            const result: GetDependenciesResult = {
                file: relativePath,
                totalDependencies: dependencies.length,
                dependencies,
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
