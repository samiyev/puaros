import * as path from "node:path"
import type { ITool, ToolContext, ToolParameterSchema } from "../../../domain/services/ITool.js"
import type { ComplexityMetrics, FileMeta } from "../../../domain/value-objects/FileMeta.js"
import {
    createErrorResult,
    createSuccessResult,
    type ToolResult,
} from "../../../domain/value-objects/ToolResult.js"

/**
 * Complexity entry for a single file.
 */
export interface ComplexityEntry {
    /** Relative path to the file */
    path: string
    /** Complexity metrics */
    metrics: ComplexityMetrics
    /** File type classification */
    fileType: "source" | "test" | "config" | "types" | "unknown"
    /** Whether the file is a hub */
    isHub: boolean
}

/**
 * Result data from get_complexity tool.
 */
export interface GetComplexityResult {
    /** The path that was analyzed (file or directory) */
    analyzedPath: string | null
    /** Total files analyzed */
    totalFiles: number
    /** Average complexity score */
    averageScore: number
    /** Files sorted by complexity score (descending) */
    files: ComplexityEntry[]
    /** Summary statistics */
    summary: {
        highComplexity: number
        mediumComplexity: number
        lowComplexity: number
    }
}

/**
 * Complexity thresholds for classification.
 */
const COMPLEXITY_THRESHOLDS = {
    high: 60,
    medium: 30,
}

/**
 * Tool for getting complexity metrics for files.
 * Can analyze a single file or all files in the project.
 */
export class GetComplexityTool implements ITool {
    readonly name = "get_complexity"
    readonly description =
        "Get complexity metrics for files. " +
        "Returns LOC, nesting depth, cyclomatic complexity, and overall score. " +
        "Without path, returns all files sorted by complexity."
    readonly parameters: ToolParameterSchema[] = [
        {
            name: "path",
            type: "string",
            description: "File or directory path to analyze (optional, defaults to entire project)",
            required: false,
        },
        {
            name: "limit",
            type: "number",
            description: "Maximum number of files to return (default: 20)",
            required: false,
            default: 20,
        },
    ]
    readonly requiresConfirmation = false
    readonly category = "analysis" as const

    validateParams(params: Record<string, unknown>): string | null {
        if (params.path !== undefined && typeof params.path !== "string") {
            return "Parameter 'path' must be a string"
        }
        if (params.limit !== undefined) {
            if (typeof params.limit !== "number" || !Number.isInteger(params.limit)) {
                return "Parameter 'limit' must be an integer"
            }
            if (params.limit < 1) {
                return "Parameter 'limit' must be at least 1"
            }
        }
        return null
    }

    async execute(params: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
        const startTime = Date.now()
        const callId = `${this.name}-${String(startTime)}`

        const inputPath = params.path as string | undefined
        const limit = (params.limit as number | undefined) ?? 20

        try {
            const allMetas = await ctx.storage.getAllMetas()

            if (allMetas.size === 0) {
                return createSuccessResult(
                    callId,
                    {
                        analyzedPath: inputPath ?? null,
                        totalFiles: 0,
                        averageScore: 0,
                        files: [],
                        summary: { highComplexity: 0, mediumComplexity: 0, lowComplexity: 0 },
                    } satisfies GetComplexityResult,
                    Date.now() - startTime,
                )
            }

            let filteredMetas = allMetas
            let analyzedPath: string | null = null

            if (inputPath) {
                const relativePath = this.normalizePathToRelative(inputPath, ctx.projectRoot)
                analyzedPath = relativePath
                filteredMetas = this.filterByPath(allMetas, relativePath)

                if (filteredMetas.size === 0) {
                    return createErrorResult(
                        callId,
                        `No files found at path: ${relativePath}`,
                        Date.now() - startTime,
                    )
                }
            }

            const entries: ComplexityEntry[] = []
            for (const [filePath, meta] of filteredMetas) {
                entries.push({
                    path: filePath,
                    metrics: meta.complexity,
                    fileType: meta.fileType,
                    isHub: meta.isHub,
                })
            }

            entries.sort((a, b) => b.metrics.score - a.metrics.score)

            const summary = this.calculateSummary(entries)
            const averageScore = this.calculateAverageScore(entries)

            const limitedEntries = entries.slice(0, limit)

            const result: GetComplexityResult = {
                analyzedPath,
                totalFiles: entries.length,
                averageScore,
                files: limitedEntries,
                summary,
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

    /**
     * Filter metas by path prefix (file or directory).
     */
    private filterByPath(
        allMetas: Map<string, FileMeta>,
        targetPath: string,
    ): Map<string, FileMeta> {
        const filtered = new Map<string, FileMeta>()

        for (const [filePath, meta] of allMetas) {
            if (filePath === targetPath || filePath.startsWith(`${targetPath}/`)) {
                filtered.set(filePath, meta)
            }
        }

        return filtered
    }

    /**
     * Calculate summary statistics for complexity entries.
     */
    private calculateSummary(entries: ComplexityEntry[]): {
        highComplexity: number
        mediumComplexity: number
        lowComplexity: number
    } {
        let high = 0
        let medium = 0
        let low = 0

        for (const entry of entries) {
            const score = entry.metrics.score
            if (score >= COMPLEXITY_THRESHOLDS.high) {
                high++
            } else if (score >= COMPLEXITY_THRESHOLDS.medium) {
                medium++
            } else {
                low++
            }
        }

        return { highComplexity: high, mediumComplexity: medium, lowComplexity: low }
    }

    /**
     * Calculate average complexity score.
     */
    private calculateAverageScore(entries: ComplexityEntry[]): number {
        if (entries.length === 0) {
            return 0
        }
        const total = entries.reduce((sum, entry) => sum + entry.metrics.score, 0)
        return Math.round((total / entries.length) * 100) / 100
    }
}
