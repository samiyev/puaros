import * as path from "node:path"
import { promises as fs } from "node:fs"

/**
 * Path validation result classification.
 */
export type PathValidationStatus = "valid" | "invalid" | "outside_project"

/**
 * Result of path validation.
 */
export interface PathValidationResult {
    /** Validation status */
    status: PathValidationStatus
    /** Reason for the status */
    reason: string
    /** Normalized absolute path (only if valid) */
    absolutePath?: string
    /** Normalized relative path (only if valid) */
    relativePath?: string
}

/**
 * Options for path validation.
 */
export interface PathValidatorOptions {
    /** Allow paths that don't exist yet (for create operations) */
    allowNonExistent?: boolean
    /** Check if path is a directory */
    requireDirectory?: boolean
    /** Check if path is a file */
    requireFile?: boolean
    /** Follow symlinks when checking existence */
    followSymlinks?: boolean
}

/**
 * Path validator for ensuring file operations stay within project boundaries.
 * Prevents path traversal attacks and unauthorized file access.
 */
export class PathValidator {
    private readonly projectRoot: string

    constructor(projectRoot: string) {
        this.projectRoot = path.resolve(projectRoot)
    }

    /**
     * Validate a path and return detailed result.
     * @param inputPath - Path to validate (relative or absolute)
     * @param options - Validation options
     */
    async validate(
        inputPath: string,
        options: PathValidatorOptions = {},
    ): Promise<PathValidationResult> {
        if (!inputPath || inputPath.trim() === "") {
            return {
                status: "invalid",
                reason: "Path is empty",
            }
        }

        const normalizedInput = inputPath.trim()

        if (this.containsTraversalPatterns(normalizedInput)) {
            return {
                status: "invalid",
                reason: "Path contains traversal patterns",
            }
        }

        const absolutePath = path.resolve(this.projectRoot, normalizedInput)

        if (!this.isWithinProject(absolutePath)) {
            return {
                status: "outside_project",
                reason: "Path is outside project root",
            }
        }

        const relativePath = path.relative(this.projectRoot, absolutePath)

        if (!options.allowNonExistent) {
            const existsResult = await this.checkExists(absolutePath, options)
            if (existsResult) {
                return existsResult
            }
        }

        return {
            status: "valid",
            reason: "Path is valid",
            absolutePath,
            relativePath,
        }
    }

    /**
     * Synchronous validation for simple checks.
     * Does not check file existence or type.
     * @param inputPath - Path to validate (relative or absolute)
     */
    validateSync(inputPath: string): PathValidationResult {
        if (!inputPath || inputPath.trim() === "") {
            return {
                status: "invalid",
                reason: "Path is empty",
            }
        }

        const normalizedInput = inputPath.trim()

        if (this.containsTraversalPatterns(normalizedInput)) {
            return {
                status: "invalid",
                reason: "Path contains traversal patterns",
            }
        }

        const absolutePath = path.resolve(this.projectRoot, normalizedInput)

        if (!this.isWithinProject(absolutePath)) {
            return {
                status: "outside_project",
                reason: "Path is outside project root",
            }
        }

        const relativePath = path.relative(this.projectRoot, absolutePath)

        return {
            status: "valid",
            reason: "Path is valid",
            absolutePath,
            relativePath,
        }
    }

    /**
     * Quick check if path is within project.
     * @param inputPath - Path to check (relative or absolute)
     */
    isWithin(inputPath: string): boolean {
        if (!inputPath || inputPath.trim() === "") {
            return false
        }

        const normalizedInput = inputPath.trim()

        if (this.containsTraversalPatterns(normalizedInput)) {
            return false
        }

        const absolutePath = path.resolve(this.projectRoot, normalizedInput)
        return this.isWithinProject(absolutePath)
    }

    /**
     * Resolve a path relative to project root.
     * Returns null if path would be outside project.
     * @param inputPath - Path to resolve
     */
    resolve(inputPath: string): string | null {
        const result = this.validateSync(inputPath)
        return result.status === "valid" ? (result.absolutePath ?? null) : null
    }

    /**
     * Resolve a path or throw an error if invalid.
     * @param inputPath - Path to resolve
     * @returns Tuple of [absolutePath, relativePath]
     * @throws Error if path is invalid
     */
    resolveOrThrow(inputPath: string): [absolutePath: string, relativePath: string] {
        const result = this.validateSync(inputPath)
        if (result.status !== "valid" || result.absolutePath === undefined) {
            throw new Error(result.reason)
        }
        return [result.absolutePath, result.relativePath ?? ""]
    }

    /**
     * Get relative path from project root.
     * Returns null if path would be outside project.
     * @param inputPath - Path to make relative
     */
    relativize(inputPath: string): string | null {
        const result = this.validateSync(inputPath)
        return result.status === "valid" ? (result.relativePath ?? null) : null
    }

    /**
     * Get the project root path.
     */
    getProjectRoot(): string {
        return this.projectRoot
    }

    /**
     * Check if path contains directory traversal patterns.
     */
    private containsTraversalPatterns(inputPath: string): boolean {
        const normalized = inputPath.replace(/\\/g, "/")

        if (normalized.includes("..")) {
            return true
        }

        if (normalized.startsWith("~")) {
            return true
        }

        return false
    }

    /**
     * Check if absolute path is within project root.
     */
    private isWithinProject(absolutePath: string): boolean {
        const normalizedProject = this.projectRoot.replace(/\\/g, "/")
        const normalizedPath = absolutePath.replace(/\\/g, "/")

        if (normalizedPath === normalizedProject) {
            return true
        }

        const projectWithSep = normalizedProject.endsWith("/")
            ? normalizedProject
            : `${normalizedProject}/`

        return normalizedPath.startsWith(projectWithSep)
    }

    /**
     * Check file existence and type.
     */
    private async checkExists(
        absolutePath: string,
        options: PathValidatorOptions,
    ): Promise<PathValidationResult | null> {
        try {
            const statFn = options.followSymlinks ? fs.stat : fs.lstat
            const stats = await statFn(absolutePath)

            if (options.requireDirectory && !stats.isDirectory()) {
                return {
                    status: "invalid",
                    reason: "Path is not a directory",
                }
            }

            if (options.requireFile && !stats.isFile()) {
                return {
                    status: "invalid",
                    reason: "Path is not a file",
                }
            }

            return null
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                return {
                    status: "invalid",
                    reason: "Path does not exist",
                }
            }

            return {
                status: "invalid",
                reason: `Cannot access path: ${(error as Error).message}`,
            }
        }
    }
}

/**
 * Create a path validator for a project.
 * @param projectRoot - Root directory of the project
 */
export function createPathValidator(projectRoot: string): PathValidator {
    return new PathValidator(projectRoot)
}

/**
 * Standalone function for quick path validation.
 * @param inputPath - Path to validate
 * @param projectRoot - Project root directory
 */
export function validatePath(inputPath: string, projectRoot: string): boolean {
    const validator = new PathValidator(projectRoot)
    return validator.isWithin(inputPath)
}
