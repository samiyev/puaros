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
    /** Impact score (0-100): percentage of codebase that depends on this file */
    impactScore: number
    /** Count of files that depend on this file transitively (including indirect dependents) */
    transitiveDepCount: number
    /** Count of files this file depends on transitively (including indirect dependencies) */
    transitiveDepByCount: number
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
        impactScore: 0,
        transitiveDepCount: 0,
        transitiveDepByCount: 0,
        ...partial,
    }
}

export function isHubFile(dependentCount: number): boolean {
    return dependentCount > 5
}

/**
 * Calculate impact score based on number of dependents and total files.
 * Impact score represents what percentage of the codebase depends on this file.
 * @param dependentCount - Number of files that depend on this file
 * @param totalFiles - Total number of files in the project
 * @returns Impact score from 0 to 100
 */
export function calculateImpactScore(dependentCount: number, totalFiles: number): number {
    if (totalFiles <= 1) {
        return 0
    }
    // Exclude the file itself from the total
    const maxPossibleDependents = totalFiles - 1
    const score = (dependentCount / maxPossibleDependents) * 100
    return Math.round(Math.min(100, score))
}
