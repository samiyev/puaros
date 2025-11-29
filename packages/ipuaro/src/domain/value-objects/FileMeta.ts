/**
 * Represents computed metadata about a file.
 */

export interface ComplexityMetrics {
    /** Lines of code (excluding empty and comments) */
    loc: number
    /** Maximum nesting depth */
    nesting: number
    /** Cyclomatic complexity score */
    cyclomaticComplexity: number
    /** Overall complexity score (0-100) */
    score: number
}

export interface FileMeta {
    /** Complexity metrics for the file */
    complexity: ComplexityMetrics
    /** Files that this file imports (internal paths) */
    dependencies: string[]
    /** Files that import this file */
    dependents: string[]
    /** Whether file is a dependency hub (>5 dependents) */
    isHub: boolean
    /** Whether file is an entry point (index.ts or 0 dependents) */
    isEntryPoint: boolean
    /** File type classification */
    fileType: "source" | "test" | "config" | "types" | "unknown"
}

export function createFileMeta(partial: Partial<FileMeta> = {}): FileMeta {
    return {
        complexity: {
            loc: 0,
            nesting: 0,
            cyclomaticComplexity: 1,
            score: 0,
        },
        dependencies: [],
        dependents: [],
        isHub: false,
        isEntryPoint: false,
        fileType: "unknown",
        ...partial,
    }
}

export function isHubFile(dependentCount: number): boolean {
    return dependentCount > 5
}
