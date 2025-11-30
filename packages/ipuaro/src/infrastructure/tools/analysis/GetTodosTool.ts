import * as path from "node:path"
import type { ITool, ToolContext, ToolParameterSchema } from "../../../domain/services/ITool.js"
import type { FileData } from "../../../domain/value-objects/FileData.js"
import {
    createErrorResult,
    createSuccessResult,
    type ToolResult,
} from "../../../domain/value-objects/ToolResult.js"

/**
 * Types of TODO markers to search for.
 */
export type TodoType = "TODO" | "FIXME" | "HACK" | "XXX" | "BUG" | "NOTE"

/**
 * A single TODO entry found in the codebase.
 */
export interface TodoEntry {
    /** Relative path to the file */
    path: string
    /** Line number where the TODO is found */
    line: number
    /** Type of TODO marker (TODO, FIXME, etc.) */
    type: TodoType
    /** The TODO text content */
    text: string
    /** Full line content for context */
    context: string
}

/**
 * Result data from get_todos tool.
 */
export interface GetTodosResult {
    /** The path that was searched (file or directory) */
    searchedPath: string | null
    /** Total number of TODOs found */
    totalTodos: number
    /** Number of files with TODOs */
    filesWithTodos: number
    /** TODOs grouped by type */
    byType: Record<TodoType, number>
    /** List of TODO entries */
    todos: TodoEntry[]
}

/**
 * Supported TODO marker patterns.
 */
const TODO_MARKERS: TodoType[] = ["TODO", "FIXME", "HACK", "XXX", "BUG", "NOTE"]

/**
 * Regex pattern for matching TODO markers in comments.
 */
const TODO_PATTERN = new RegExp(
    `(?://|/\\*|\\*|#)\\s*(${TODO_MARKERS.join("|")})(?:\\([^)]*\\))?:?\\s*(.*)`,
    "i",
)

/**
 * Tool for finding TODO/FIXME/HACK comments in the codebase.
 * Searches through indexed files for common task markers.
 */
export class GetTodosTool implements ITool {
    readonly name = "get_todos"
    readonly description =
        "Find TODO, FIXME, HACK, XXX, BUG, and NOTE comments in the codebase. " +
        "Returns list of locations with context."
    readonly parameters: ToolParameterSchema[] = [
        {
            name: "path",
            type: "string",
            description: "File or directory to search (optional, defaults to entire project)",
            required: false,
        },
        {
            name: "type",
            type: "string",
            description:
                "Filter by TODO type: TODO, FIXME, HACK, XXX, BUG, NOTE (optional, defaults to all)",
            required: false,
        },
    ]
    readonly requiresConfirmation = false
    readonly category = "analysis" as const

    validateParams(params: Record<string, unknown>): string | null {
        if (params.path !== undefined && typeof params.path !== "string") {
            return "Parameter 'path' must be a string"
        }
        if (params.type !== undefined) {
            if (typeof params.type !== "string") {
                return "Parameter 'type' must be a string"
            }
            const upperType = params.type.toUpperCase()
            if (!TODO_MARKERS.includes(upperType as TodoType)) {
                return `Parameter 'type' must be one of: ${TODO_MARKERS.join(", ")}`
            }
        }
        return null
    }

    async execute(params: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
        const startTime = Date.now()
        const callId = `${this.name}-${String(startTime)}`

        const inputPath = params.path as string | undefined
        const filterType = params.type ? ((params.type as string).toUpperCase() as TodoType) : null

        try {
            const allFiles = await ctx.storage.getAllFiles()

            if (allFiles.size === 0) {
                return createSuccessResult(
                    callId,
                    this.createEmptyResult(inputPath ?? null),
                    Date.now() - startTime,
                )
            }

            let filesToSearch = allFiles
            let searchedPath: string | null = null

            if (inputPath) {
                const relativePath = this.normalizePathToRelative(inputPath, ctx.projectRoot)
                searchedPath = relativePath
                filesToSearch = this.filterByPath(allFiles, relativePath)

                if (filesToSearch.size === 0) {
                    return createErrorResult(
                        callId,
                        `No files found at path: ${relativePath}`,
                        Date.now() - startTime,
                    )
                }
            }

            const todos: TodoEntry[] = []
            const filesWithTodos = new Set<string>()

            for (const [filePath, fileData] of filesToSearch) {
                const fileTodos = this.findTodosInFile(filePath, fileData.lines, filterType)
                if (fileTodos.length > 0) {
                    filesWithTodos.add(filePath)
                    todos.push(...fileTodos)
                }
            }

            todos.sort((a, b) => {
                const pathCompare = a.path.localeCompare(b.path)
                if (pathCompare !== 0) {
                    return pathCompare
                }
                return a.line - b.line
            })

            const byType = this.countByType(todos)

            const result: GetTodosResult = {
                searchedPath,
                totalTodos: todos.length,
                filesWithTodos: filesWithTodos.size,
                byType,
                todos,
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
     * Filter files by path prefix.
     */
    private filterByPath(
        allFiles: Map<string, FileData>,
        targetPath: string,
    ): Map<string, FileData> {
        const filtered = new Map<string, FileData>()

        for (const [filePath, fileData] of allFiles) {
            if (filePath === targetPath || filePath.startsWith(`${targetPath}/`)) {
                filtered.set(filePath, fileData)
            }
        }

        return filtered
    }

    /**
     * Find all TODOs in a file.
     */
    private findTodosInFile(
        filePath: string,
        lines: string[],
        filterType: TodoType | null,
    ): TodoEntry[] {
        const todos: TodoEntry[] = []

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            const match = TODO_PATTERN.exec(line)

            if (match) {
                const type = match[1].toUpperCase() as TodoType
                const text = match[2].trim()

                if (filterType && type !== filterType) {
                    continue
                }

                todos.push({
                    path: filePath,
                    line: i + 1,
                    type,
                    text: text || "(no description)",
                    context: line.trim(),
                })
            }
        }

        return todos
    }

    /**
     * Count TODOs by type.
     */
    private countByType(todos: TodoEntry[]): Record<TodoType, number> {
        const counts: Record<TodoType, number> = {
            TODO: 0,
            FIXME: 0,
            HACK: 0,
            XXX: 0,
            BUG: 0,
            NOTE: 0,
        }

        for (const todo of todos) {
            counts[todo.type]++
        }

        return counts
    }

    /**
     * Create empty result structure.
     */
    private createEmptyResult(searchedPath: string | null): GetTodosResult {
        return {
            searchedPath,
            totalTodos: 0,
            filesWithTodos: 0,
            byType: {
                TODO: 0,
                FIXME: 0,
                HACK: 0,
                XXX: 0,
                BUG: 0,
                NOTE: 0,
            },
            todos: [],
        }
    }
}
