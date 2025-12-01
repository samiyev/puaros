import { promises as fs } from "node:fs"
import type { ITool, ToolContext, ToolParameterSchema } from "../../../domain/services/ITool.js"
import type { ClassInfo } from "../../../domain/value-objects/FileAST.js"
import {
    createErrorResult,
    createSuccessResult,
    type ToolResult,
} from "../../../domain/value-objects/ToolResult.js"
import { PathValidator } from "../../security/PathValidator.js"

/**
 * Result data from get_class tool.
 */
export interface GetClassResult {
    path: string
    name: string
    startLine: number
    endLine: number
    isExported: boolean
    isAbstract: boolean
    extends?: string
    implements: string[]
    methods: string[]
    properties: string[]
    content: string
}

/**
 * Tool for retrieving a class's source code by name.
 * Uses AST to find exact line range.
 */
export class GetClassTool implements ITool {
    readonly name = "get_class"
    readonly description =
        "Get a class's source code by name. Uses AST to find exact line range. " +
        "Returns the class code with line numbers."
    readonly parameters: ToolParameterSchema[] = [
        {
            name: "path",
            type: "string",
            description: "File path relative to project root",
            required: true,
        },
        {
            name: "name",
            type: "string",
            description: "Class name to retrieve",
            required: true,
        },
    ]
    readonly requiresConfirmation = false
    readonly category = "read" as const

    validateParams(params: Record<string, unknown>): string | null {
        if (typeof params.path !== "string" || params.path.trim() === "") {
            return "Parameter 'path' is required and must be a non-empty string"
        }

        if (typeof params.name !== "string" || params.name.trim() === "") {
            return "Parameter 'name' is required and must be a non-empty string"
        }

        return null
    }

    async execute(params: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
        const startTime = Date.now()
        const callId = `${this.name}-${String(startTime)}`

        const inputPath = params.path as string
        const className = params.name as string
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
            const ast = await ctx.storage.getAST(relativePath)
            if (!ast) {
                return createErrorResult(
                    callId,
                    `AST not found for "${relativePath}". File may not be indexed.`,
                    Date.now() - startTime,
                )
            }

            const classInfo = this.findClass(ast.classes, className)
            if (!classInfo) {
                const available = ast.classes.map((c) => c.name).join(", ") || "none"
                return createErrorResult(
                    callId,
                    `Class "${className}" not found in "${relativePath}". Available: ${available}`,
                    Date.now() - startTime,
                )
            }

            const lines = await this.getFileLines(absolutePath, relativePath, ctx)
            const classLines = lines.slice(classInfo.lineStart - 1, classInfo.lineEnd)
            const content = this.formatLinesWithNumbers(classLines, classInfo.lineStart)

            const result: GetClassResult = {
                path: relativePath,
                name: classInfo.name,
                startLine: classInfo.lineStart,
                endLine: classInfo.lineEnd,
                isExported: classInfo.isExported,
                isAbstract: classInfo.isAbstract,
                extends: classInfo.extends,
                implements: classInfo.implements,
                methods: classInfo.methods.map((m) => m.name),
                properties: classInfo.properties.map((p) => p.name),
                content,
            }

            return createSuccessResult(callId, result, Date.now() - startTime)
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            return createErrorResult(callId, message, Date.now() - startTime)
        }
    }

    /**
     * Find class by name in AST.
     */
    private findClass(classes: ClassInfo[], name: string): ClassInfo | undefined {
        return classes.find((c) => c.name === name)
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
