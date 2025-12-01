import { promises as fs } from "node:fs"
import * as path from "node:path"
import type { ITool, ToolContext, ToolParameterSchema } from "../../../domain/services/ITool.js"
import {
    createErrorResult,
    createSuccessResult,
    type ToolResult,
} from "../../../domain/value-objects/ToolResult.js"
import { DEFAULT_IGNORE_PATTERNS } from "../../../domain/constants/index.js"
import { PathValidator } from "../../security/PathValidator.js"

/**
 * Tree node representing a file or directory.
 */
export interface TreeNode {
    name: string
    type: "file" | "directory"
    children?: TreeNode[]
}

/**
 * Result data from get_structure tool.
 */
export interface GetStructureResult {
    path: string
    tree: TreeNode
    content: string
    stats: {
        directories: number
        files: number
    }
}

/**
 * Tool for getting project directory structure as a tree.
 */
export class GetStructureTool implements ITool {
    readonly name = "get_structure"
    readonly description =
        "Get project directory structure as a tree. " +
        "If path is specified, shows structure of that subdirectory only."
    readonly parameters: ToolParameterSchema[] = [
        {
            name: "path",
            type: "string",
            description: "Subdirectory path relative to project root (optional, defaults to root)",
            required: false,
        },
        {
            name: "depth",
            type: "number",
            description: "Maximum depth to traverse (default: unlimited)",
            required: false,
        },
    ]
    readonly requiresConfirmation = false
    readonly category = "read" as const

    private readonly defaultIgnorePatterns = new Set([
        ...DEFAULT_IGNORE_PATTERNS,
        ".git",
        ".idea",
        ".vscode",
        "__pycache__",
        ".pytest_cache",
        ".nyc_output",
        "coverage",
    ])

    validateParams(params: Record<string, unknown>): string | null {
        if (params.path !== undefined) {
            if (typeof params.path !== "string") {
                return "Parameter 'path' must be a string"
            }
        }

        if (params.depth !== undefined) {
            if (typeof params.depth !== "number" || !Number.isInteger(params.depth)) {
                return "Parameter 'depth' must be an integer"
            }
            if (params.depth < 1) {
                return "Parameter 'depth' must be >= 1"
            }
        }

        return null
    }

    async execute(params: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
        const startTime = Date.now()
        const callId = `${this.name}-${String(startTime)}`

        const inputPath = (params.path as string | undefined) ?? "."
        const maxDepth = params.depth as number | undefined
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
            const stat = await fs.stat(absolutePath)
            if (!stat.isDirectory()) {
                return createErrorResult(
                    callId,
                    `Path "${relativePath}" is not a directory`,
                    Date.now() - startTime,
                )
            }

            const stats = { directories: 0, files: 0 }
            const tree = await this.buildTree(absolutePath, maxDepth, 0, stats)
            const content = this.formatTree(tree)

            const result: GetStructureResult = {
                path: relativePath || ".",
                tree,
                content,
                stats,
            }

            return createSuccessResult(callId, result, Date.now() - startTime)
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            return createErrorResult(callId, message, Date.now() - startTime)
        }
    }

    /**
     * Build tree structure recursively.
     */
    private async buildTree(
        dirPath: string,
        maxDepth: number | undefined,
        currentDepth: number,
        stats: { directories: number; files: number },
    ): Promise<TreeNode> {
        const name = path.basename(dirPath) || dirPath
        const node: TreeNode = { name, type: "directory", children: [] }
        stats.directories++

        if (maxDepth !== undefined && currentDepth >= maxDepth) {
            return node
        }

        const entries = await fs.readdir(dirPath, { withFileTypes: true })
        const sortedEntries = entries
            .filter((e) => !this.shouldIgnore(e.name))
            .sort((a, b) => {
                if (a.isDirectory() && !b.isDirectory()) {
                    return -1
                }
                if (!a.isDirectory() && b.isDirectory()) {
                    return 1
                }
                return a.name.localeCompare(b.name)
            })

        for (const entry of sortedEntries) {
            const entryPath = path.join(dirPath, entry.name)

            if (entry.isDirectory()) {
                const childNode = await this.buildTree(entryPath, maxDepth, currentDepth + 1, stats)
                node.children?.push(childNode)
            } else if (entry.isFile()) {
                node.children?.push({ name: entry.name, type: "file" })
                stats.files++
            }
        }

        return node
    }

    /**
     * Check if entry should be ignored.
     */
    private shouldIgnore(name: string): boolean {
        return this.defaultIgnorePatterns.has(name)
    }

    /**
     * Format tree as ASCII art.
     */
    private formatTree(node: TreeNode, prefix = "", isLast = true): string {
        const lines: string[] = []
        const connector = isLast ? "└── " : "├── "
        const icon = node.type === "directory" ? "📁 " : "📄 "

        lines.push(`${prefix}${connector}${icon}${node.name}`)

        if (node.children) {
            const childPrefix = prefix + (isLast ? "    " : "│   ")
            const childCount = node.children.length
            node.children.forEach((child, index) => {
                const childIsLast = index === childCount - 1
                lines.push(this.formatTree(child, childPrefix, childIsLast))
            })
        }

        return lines.join("\n")
    }
}
