import { AnemicModelViolation } from "../value-objects/AnemicModelViolation"

/**
 * Interface for detecting anemic domain model violations in the codebase
 *
 * Anemic domain models are entities that contain only getters/setters
 * without business logic. This anti-pattern violates Domain-Driven Design
 * principles and leads to procedural code scattered in services.
 */
export interface IAnemicModelDetector {
    /**
     * Detects anemic model violations in the given code
     *
     * Analyzes classes in domain/entities to identify:
     * - Classes with only getters and setters (no business logic)
     * - Classes with public setters (DDD anti-pattern)
     * - Classes with low method-to-property ratio
     *
     * @param code - Source code to analyze
     * @param filePath - Path to the file being analyzed
     * @param layer - The architectural layer of the file (domain, application, infrastructure, shared)
     * @returns Array of detected anemic model violations
     */
    detectAnemicModels(
        code: string,
        filePath: string,
        layer: string | undefined,
    ): AnemicModelViolation[]
}
