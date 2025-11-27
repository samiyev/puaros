import { NamingViolation } from "../value-objects/NamingViolation"

/**
 * Interface for detecting naming convention violations in source files
 */
export interface INamingConventionDetector {
    /**
     * Detects naming convention violations for a given file
     *
     * @param content - Source code content to analyze
     * @param fileName - Name of the file to check (e.g., "UserService.ts")
     * @param layer - Architectural layer of the file (domain, application, infrastructure, shared)
     * @param filePath - Relative file path for context
     * @returns Array of naming convention violations
     */
    detectViolations(
        content: string,
        fileName: string,
        layer: string | undefined,
        filePath: string,
    ): NamingViolation[]
}
