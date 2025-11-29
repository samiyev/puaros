import * as path from "node:path"
import {
    type ComplexityMetrics,
    createFileMeta,
    type FileMeta,
    isHubFile,
} from "../../domain/value-objects/FileMeta.js"
import type { ClassInfo, FileAST, FunctionInfo } from "../../domain/value-objects/FileAST.js"

/**
 * Analyzes file metadata including complexity, dependencies, and classification.
 */
export class MetaAnalyzer {
    private readonly projectRoot: string

    constructor(projectRoot: string) {
        this.projectRoot = projectRoot
    }

    /**
     * Analyze a file and compute its metadata.
     * @param filePath - Absolute path to the file
     * @param ast - Parsed AST for the file
     * @param content - Raw file content (for LOC calculation)
     * @param allASTs - Map of all file paths to their ASTs (for dependents)
     */
    analyze(
        filePath: string,
        ast: FileAST,
        content: string,
        allASTs: Map<string, FileAST>,
    ): FileMeta {
        const complexity = this.calculateComplexity(ast, content)
        const dependencies = this.resolveDependencies(filePath, ast)
        const dependents = this.findDependents(filePath, allASTs)
        const fileType = this.classifyFileType(filePath)
        const isEntryPoint = this.isEntryPointFile(filePath, dependents.length)

        return createFileMeta({
            complexity,
            dependencies,
            dependents,
            isHub: isHubFile(dependents.length),
            isEntryPoint,
            fileType,
        })
    }

    /**
     * Calculate complexity metrics for a file.
     */
    calculateComplexity(ast: FileAST, content: string): ComplexityMetrics {
        const loc = this.countLinesOfCode(content)
        const nesting = this.calculateMaxNesting(ast)
        const cyclomaticComplexity = this.calculateCyclomaticComplexity(ast)
        const score = this.calculateComplexityScore(loc, nesting, cyclomaticComplexity)

        return {
            loc,
            nesting,
            cyclomaticComplexity,
            score,
        }
    }

    /**
     * Count lines of code (excluding empty lines and comments).
     */
    countLinesOfCode(content: string): number {
        const lines = content.split("\n")
        let loc = 0
        let inBlockComment = false

        for (const line of lines) {
            const trimmed = line.trim()

            if (inBlockComment) {
                if (trimmed.includes("*/")) {
                    inBlockComment = false
                }
                continue
            }

            if (trimmed.startsWith("/*")) {
                if (!trimmed.includes("*/")) {
                    inBlockComment = true
                    continue
                }
                const afterComment = trimmed.substring(trimmed.indexOf("*/") + 2).trim()
                if (afterComment === "" || afterComment.startsWith("//")) {
                    continue
                }
                loc++
                continue
            }

            if (trimmed === "" || trimmed.startsWith("//")) {
                continue
            }

            loc++
        }

        return loc
    }

    /**
     * Calculate maximum nesting depth from AST.
     */
    calculateMaxNesting(ast: FileAST): number {
        let maxNesting = 0

        for (const func of ast.functions) {
            const depth = this.estimateFunctionNesting(func)
            maxNesting = Math.max(maxNesting, depth)
        }

        for (const cls of ast.classes) {
            const depth = this.estimateClassNesting(cls)
            maxNesting = Math.max(maxNesting, depth)
        }

        return maxNesting
    }

    /**
     * Estimate nesting depth for a function based on line count.
     * More accurate nesting would require full AST traversal.
     */
    private estimateFunctionNesting(func: FunctionInfo): number {
        const lines = func.lineEnd - func.lineStart + 1
        if (lines <= 5) {
            return 1
        }
        if (lines <= 15) {
            return 2
        }
        if (lines <= 30) {
            return 3
        }
        if (lines <= 50) {
            return 4
        }
        return 5
    }

    /**
     * Estimate nesting depth for a class.
     */
    private estimateClassNesting(cls: ClassInfo): number {
        let maxMethodNesting = 1

        for (const method of cls.methods) {
            const lines = method.lineEnd - method.lineStart + 1
            let depth = 1
            if (lines > 5) {
                depth = 2
            }
            if (lines > 15) {
                depth = 3
            }
            if (lines > 30) {
                depth = 4
            }
            maxMethodNesting = Math.max(maxMethodNesting, depth)
        }

        return maxMethodNesting + 1
    }

    /**
     * Calculate cyclomatic complexity from AST.
     * Base complexity is 1, +1 for each decision point.
     */
    calculateCyclomaticComplexity(ast: FileAST): number {
        let complexity = 1

        for (const func of ast.functions) {
            complexity += this.estimateFunctionComplexity(func)
        }

        for (const cls of ast.classes) {
            for (const method of cls.methods) {
                const lines = method.lineEnd - method.lineStart + 1
                complexity += Math.max(1, Math.floor(lines / 10))
            }
        }

        return complexity
    }

    /**
     * Estimate function complexity based on size.
     */
    private estimateFunctionComplexity(func: FunctionInfo): number {
        const lines = func.lineEnd - func.lineStart + 1
        return Math.max(1, Math.floor(lines / 8))
    }

    /**
     * Calculate overall complexity score (0-100).
     */
    calculateComplexityScore(loc: number, nesting: number, cyclomatic: number): number {
        const locWeight = 0.3
        const nestingWeight = 0.35
        const cyclomaticWeight = 0.35

        const locScore = Math.min(100, (loc / 500) * 100)
        const nestingScore = Math.min(100, (nesting / 6) * 100)
        const cyclomaticScore = Math.min(100, (cyclomatic / 30) * 100)

        const score =
            locScore * locWeight + nestingScore * nestingWeight + cyclomaticScore * cyclomaticWeight

        return Math.round(Math.min(100, score))
    }

    /**
     * Resolve internal imports to absolute file paths.
     */
    resolveDependencies(filePath: string, ast: FileAST): string[] {
        const dependencies: string[] = []
        const fileDir = path.dirname(filePath)

        for (const imp of ast.imports) {
            if (imp.type !== "internal") {
                continue
            }

            const resolved = this.resolveImportPath(fileDir, imp.from)
            if (resolved && !dependencies.includes(resolved)) {
                dependencies.push(resolved)
            }
        }

        return dependencies.sort()
    }

    /**
     * Resolve a relative import path to an absolute path.
     */
    private resolveImportPath(fromDir: string, importPath: string): string | null {
        const absolutePath = path.resolve(fromDir, importPath)
        const normalized = this.normalizeImportPath(absolutePath)

        if (normalized.startsWith(this.projectRoot)) {
            return normalized
        }

        return null
    }

    /**
     * Normalize import path by removing file extension if present
     * and handling index imports.
     */
    private normalizeImportPath(importPath: string): string {
        let normalized = importPath

        if (normalized.endsWith(".js")) {
            normalized = `${normalized.slice(0, -3)}.ts`
        } else if (normalized.endsWith(".jsx")) {
            normalized = `${normalized.slice(0, -4)}.tsx`
        } else if (!/\.(ts|tsx|js|jsx)$/.exec(normalized)) {
            normalized = `${normalized}.ts`
        }

        return normalized
    }

    /**
     * Find all files that import the given file.
     */
    findDependents(filePath: string, allASTs: Map<string, FileAST>): string[] {
        const dependents: string[] = []
        const normalizedPath = this.normalizePathForComparison(filePath)

        for (const [otherPath, ast] of allASTs) {
            if (otherPath === filePath) {
                continue
            }

            if (this.fileImportsTarget(otherPath, ast, normalizedPath)) {
                dependents.push(otherPath)
            }
        }

        return dependents.sort()
    }

    /**
     * Check if a file imports the target path.
     */
    private fileImportsTarget(filePath: string, ast: FileAST, normalizedTarget: string): boolean {
        const fileDir = path.dirname(filePath)

        for (const imp of ast.imports) {
            if (imp.type !== "internal") {
                continue
            }

            const resolvedImport = this.resolveImportPath(fileDir, imp.from)
            if (!resolvedImport) {
                continue
            }

            const normalizedImport = this.normalizePathForComparison(resolvedImport)
            if (this.pathsMatch(normalizedTarget, normalizedImport)) {
                return true
            }
        }

        return false
    }

    /**
     * Normalize path for comparison (handle index.ts and extensions).
     */
    private normalizePathForComparison(filePath: string): string {
        let normalized = filePath

        if (normalized.endsWith(".js")) {
            normalized = normalized.slice(0, -3)
        } else if (normalized.endsWith(".ts")) {
            normalized = normalized.slice(0, -3)
        } else if (normalized.endsWith(".jsx")) {
            normalized = normalized.slice(0, -4)
        } else if (normalized.endsWith(".tsx")) {
            normalized = normalized.slice(0, -4)
        }

        return normalized
    }

    /**
     * Check if two normalized paths match (including index.ts resolution).
     */
    private pathsMatch(path1: string, path2: string): boolean {
        if (path1 === path2) {
            return true
        }

        if (path1.endsWith("/index") && path2 === path1.slice(0, -6)) {
            return true
        }
        if (path2.endsWith("/index") && path1 === path2.slice(0, -6)) {
            return true
        }

        return false
    }

    /**
     * Classify file type based on path and name.
     */
    classifyFileType(filePath: string): FileMeta["fileType"] {
        const basename = path.basename(filePath)
        const lowercasePath = filePath.toLowerCase()

        if (basename.includes(".test.") || basename.includes(".spec.")) {
            return "test"
        }

        if (lowercasePath.includes("/tests/") || lowercasePath.includes("/__tests__/")) {
            return "test"
        }

        if (basename.endsWith(".d.ts")) {
            return "types"
        }

        if (lowercasePath.includes("/types/") || basename === "types.ts") {
            return "types"
        }

        const configPatterns = [
            "config",
            "tsconfig",
            "eslint",
            "prettier",
            "vitest",
            "jest",
            "babel",
            "webpack",
            "vite",
            "rollup",
        ]

        for (const pattern of configPatterns) {
            if (basename.toLowerCase().includes(pattern)) {
                return "config"
            }
        }

        if (
            filePath.endsWith(".ts") ||
            filePath.endsWith(".tsx") ||
            filePath.endsWith(".js") ||
            filePath.endsWith(".jsx")
        ) {
            return "source"
        }

        return "unknown"
    }

    /**
     * Determine if file is an entry point.
     */
    isEntryPointFile(filePath: string, dependentCount: number): boolean {
        const basename = path.basename(filePath)

        if (basename.startsWith("index.")) {
            return true
        }

        if (dependentCount === 0) {
            return true
        }

        const entryPatterns = ["main.", "app.", "cli.", "server.", "index."]
        for (const pattern of entryPatterns) {
            if (basename.toLowerCase().startsWith(pattern)) {
                return true
            }
        }

        return false
    }

    /**
     * Batch analyze multiple files.
     */
    analyzeAll(files: Map<string, { ast: FileAST; content: string }>): Map<string, FileMeta> {
        const allASTs = new Map<string, FileAST>()
        for (const [filePath, { ast }] of files) {
            allASTs.set(filePath, ast)
        }

        const results = new Map<string, FileMeta>()
        for (const [filePath, { ast, content }] of files) {
            const meta = this.analyze(filePath, ast, content, allASTs)
            results.set(filePath, meta)
        }

        return results
    }
}
