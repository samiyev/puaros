import { promises as fs } from "node:fs"
import type { ITool, ToolContext, ToolParameterSchema } from "../../../domain/services/ITool.js"
import type { FunctionInfo } from "../../../domain/value-objects/FileAST.js"
import {
    createErrorResult,
    createSuccessResult,
    type ToolResult,
} from "../../../domain/value-objects/ToolResult.js"
import { PathValidator } from "../../security/PathValidator.js"

/**
 * Result data from get_function tool.
 */
export interface GetFunctionResult {
    path: string
    name: string
    startLine: number
    endLine: number
    isAsync: boolean
    isExported: boolean
    params: string[]
    returnType?: string
    content: string
}

/**
 * Tool for retrieving a function's source code by name.
 * Uses AST to find exact line range.
 */
export class GetFunctionTool implements ITool {
    readonly name = "get_function"
    readonly description =
        "Get a function's source code by name. Uses AST to find exact line range. " +
        "Returns the function code with line numbers."
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
            description: "Function name to retrieve",
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
        const functionName = params.name as string
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

            const functionInfo = this.findFunction(ast.functions, functionName)
            if (!functionInfo) {
                const available = ast.functions.map((f) => f.name).join(", ") || "none"
                return createErrorResult(
                    callId,
                    `Function "${functionName}" not found in "${relativePath}". Available: ${available}`,
                    Date.now() - startTime,
                )
            }

            const lines = await this.getFileLines(absolutePath, relativePath, ctx)
            const functionLines = lines.slice(functionInfo.lineStart - 1, functionInfo.lineEnd)
            const content = this.formatLinesWithNumbers(functionLines, functionInfo.lineStart)

            const result: GetFunctionResult = {
                path: relativePath,
                name: functionInfo.name,
                startLine: functionInfo.lineStart,
                endLine: functionInfo.lineEnd,
                isAsync: functionInfo.isAsync,
                isExported: functionInfo.isExported,
                params: functionInfo.params.map((p) => p.name),
                returnType: functionInfo.returnType,
                content,
            }

            return createSuccessResult(callId, result, Date.now() - startTime)
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            return createErrorResult(callId, message, Date.now() - startTime)
        }
    }

    /**
     * Find function by name in AST.
     */
    private findFunction(functions: FunctionInfo[], name: string): FunctionInfo | undefined {
        return functions.find((f) => f.name === name)
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
