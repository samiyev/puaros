import { IAggregateBoundaryDetector } from "../../domain/services/IAggregateBoundaryDetector"
import { AggregateBoundaryViolation } from "../../domain/value-objects/AggregateBoundaryViolation"
import { LAYERS } from "../../shared/constants/rules"
import { IMPORT_PATTERNS } from "../constants/paths"
import { DDD_FOLDER_NAMES } from "../constants/detectorPatterns"

/**
 * Detects aggregate boundary violations in Domain-Driven Design
 *
 * This detector enforces DDD aggregate rules:
 * - Aggregates should reference each other only by ID or Value Objects
 * - Direct entity references across aggregates create tight coupling
 * - Each aggregate should be independently modifiable
 *
 * Folder structure patterns detected:
 * - domain/aggregates/order/Order.ts
 * - domain/order/Order.ts (aggregate name from parent folder)
 * - domain/entities/order/Order.ts
 *
 * @example
 * ```typescript
 * const detector = new AggregateBoundaryDetector()
 *
 * // Detect violations in order aggregate
 * const code = `
 * import { User } from '../user/User'
 * import { UserId } from '../user/value-objects/UserId'
 * `
 * const violations = detector.detectViolations(
 *     code,
 *     'src/domain/aggregates/order/Order.ts',
 *     'domain'
 * )
 *
 * // violations will contain 1 violation for direct User entity import
 * // but not for UserId (value object is allowed)
 * console.log(violations.length) // 1
 * ```
 */
export class AggregateBoundaryDetector implements IAggregateBoundaryDetector {
    private readonly entityFolderNames = new Set<string>([
        DDD_FOLDER_NAMES.ENTITIES,
        DDD_FOLDER_NAMES.AGGREGATES,
    ])
    private readonly valueObjectFolderNames = new Set<string>([
        DDD_FOLDER_NAMES.VALUE_OBJECTS,
        DDD_FOLDER_NAMES.VO,
    ])
    private readonly allowedFolderNames = new Set<string>([
        DDD_FOLDER_NAMES.VALUE_OBJECTS,
        DDD_FOLDER_NAMES.VO,
        DDD_FOLDER_NAMES.EVENTS,
        DDD_FOLDER_NAMES.DOMAIN_EVENTS,
        DDD_FOLDER_NAMES.REPOSITORIES,
        DDD_FOLDER_NAMES.SERVICES,
        DDD_FOLDER_NAMES.SPECIFICATIONS,
        DDD_FOLDER_NAMES.ERRORS,
        DDD_FOLDER_NAMES.EXCEPTIONS,
    ])
    private readonly nonAggregateFolderNames = new Set<string>([
        DDD_FOLDER_NAMES.VALUE_OBJECTS,
        DDD_FOLDER_NAMES.VO,
        DDD_FOLDER_NAMES.EVENTS,
        DDD_FOLDER_NAMES.DOMAIN_EVENTS,
        DDD_FOLDER_NAMES.REPOSITORIES,
        DDD_FOLDER_NAMES.SERVICES,
        DDD_FOLDER_NAMES.SPECIFICATIONS,
        DDD_FOLDER_NAMES.ENTITIES,
        DDD_FOLDER_NAMES.CONSTANTS,
        DDD_FOLDER_NAMES.SHARED,
        DDD_FOLDER_NAMES.FACTORIES,
        DDD_FOLDER_NAMES.PORTS,
        DDD_FOLDER_NAMES.INTERFACES,
        DDD_FOLDER_NAMES.ERRORS,
        DDD_FOLDER_NAMES.EXCEPTIONS,
    ])

    /**
     * Detects aggregate boundary violations in the given code
     *
     * Analyzes import statements to identify direct entity references
     * across aggregate boundaries in the domain layer.
     *
     * @param code - Source code to analyze
     * @param filePath - Path to the file being analyzed
     * @param layer - The architectural layer of the file (should be 'domain')
     * @returns Array of detected aggregate boundary violations
     */
    public detectViolations(
        code: string,
        filePath: string,
        layer: string | undefined,
    ): AggregateBoundaryViolation[] {
        if (layer !== LAYERS.DOMAIN) {
            return []
        }

        const currentAggregate = this.extractAggregateFromPath(filePath)
        if (!currentAggregate) {
            return []
        }

        const violations: AggregateBoundaryViolation[] = []
        const lines = code.split("\n")

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            const lineNumber = i + 1

            const imports = this.extractImports(line)
            for (const importPath of imports) {
                if (this.isAggregateBoundaryViolation(importPath, currentAggregate)) {
                    const targetAggregate = this.extractAggregateFromImport(importPath)
                    const entityName = this.extractEntityName(importPath)

                    if (targetAggregate && entityName) {
                        violations.push(
                            AggregateBoundaryViolation.create(
                                currentAggregate,
                                targetAggregate,
                                entityName,
                                importPath,
                                filePath,
                                lineNumber,
                            ),
                        )
                    }
                }
            }
        }

        return violations
    }

    /**
     * Checks if a file path belongs to an aggregate
     *
     * Extracts aggregate name from paths like:
     * - domain/aggregates/order/Order.ts → 'order'
     * - domain/order/Order.ts → 'order'
     * - domain/entities/order/Order.ts → 'order'
     *
     * @param filePath - The file path to check
     * @returns The aggregate name if found, undefined otherwise
     */
    public extractAggregateFromPath(filePath: string): string | undefined {
        const normalizedPath = filePath.toLowerCase().replace(/\\/g, "/")

        const domainMatch = /(?:^|\/)(domain)\//.exec(normalizedPath)
        if (!domainMatch) {
            return undefined
        }

        const domainEndIndex = domainMatch.index + domainMatch[0].length
        const pathAfterDomain = normalizedPath.substring(domainEndIndex)
        const segments = pathAfterDomain.split("/").filter(Boolean)

        if (segments.length < 2) {
            return undefined
        }

        if (this.entityFolderNames.has(segments[0])) {
            if (segments.length < 3) {
                return undefined
            }
            const aggregate = segments[1]
            if (this.nonAggregateFolderNames.has(aggregate)) {
                return undefined
            }
            return aggregate
        }

        const aggregate = segments[0]
        if (this.nonAggregateFolderNames.has(aggregate)) {
            return undefined
        }
        return aggregate
    }

    /**
     * Checks if an import path references an entity from another aggregate
     *
     * @param importPath - The import path to analyze
     * @param currentAggregate - The aggregate of the current file
     * @returns True if the import crosses aggregate boundaries inappropriately
     */
    public isAggregateBoundaryViolation(importPath: string, currentAggregate: string): boolean {
        const normalizedPath = importPath.replace(IMPORT_PATTERNS.QUOTE, "").toLowerCase()

        if (!normalizedPath.includes("/")) {
            return false
        }

        if (!normalizedPath.startsWith(".") && !normalizedPath.startsWith("/")) {
            return false
        }

        // Check if import stays within the same bounded context
        if (this.isInternalBoundedContextImport(normalizedPath)) {
            return false
        }

        const targetAggregate = this.extractAggregateFromImport(normalizedPath)
        if (!targetAggregate || targetAggregate === currentAggregate) {
            return false
        }

        if (this.isAllowedImport(normalizedPath)) {
            return false
        }

        return this.seemsLikeEntityImport(normalizedPath)
    }

    /**
     * Checks if the import is internal to the same bounded context
     *
     * An import like "../aggregates/Entity" from "repositories/Repo" stays within
     * the same bounded context (one level up goes to the bounded context root).
     *
     * An import like "../../other-context/Entity" crosses bounded context boundaries.
     */
    private isInternalBoundedContextImport(normalizedPath: string): boolean {
        const parts = normalizedPath.split("/")
        const dotDotCount = parts.filter((p) => p === "..").length

        /*
         * If only one ".." and path goes into aggregates/entities folder,
         * it's likely an internal import within the same bounded context
         */
        if (dotDotCount === 1) {
            const nonDotParts = parts.filter((p) => p !== ".." && p !== ".")
            if (nonDotParts.length >= 1) {
                const firstFolder = nonDotParts[0]
                // Importing from aggregates/entities within same bounded context is allowed
                if (this.entityFolderNames.has(firstFolder)) {
                    return true
                }
            }
        }

        return false
    }

    /**
     * Checks if the import path is from an allowed folder (value-objects, events, etc.)
     */
    private isAllowedImport(normalizedPath: string): boolean {
        for (const folderName of this.allowedFolderNames) {
            if (normalizedPath.includes(`/${folderName}/`)) {
                return true
            }
        }
        return false
    }

    /**
     * Checks if the import seems to be an entity (not a value object, event, etc.)
     *
     * Note: normalizedPath is already lowercased, so we check if the first character
     * is a letter (indicating it was likely PascalCase originally)
     */
    private seemsLikeEntityImport(normalizedPath: string): boolean {
        const pathParts = normalizedPath.split("/")
        const lastPart = pathParts[pathParts.length - 1]

        if (!lastPart) {
            return false
        }

        const filename = lastPart.replace(/\.(ts|js)$/, "")

        if (filename.length > 0 && /^[a-z][a-z]/.exec(filename)) {
            return true
        }

        return false
    }

    /**
     * Extracts the aggregate name from an import path
     *
     * Handles both absolute and relative paths:
     * - ../user/User → user
     * - ../../domain/user/User → user
     * - ../user/value-objects/UserId → user (but filtered as value object)
     */
    private extractAggregateFromImport(importPath: string): string | undefined {
        const normalizedPath = importPath.replace(IMPORT_PATTERNS.QUOTE, "").toLowerCase()

        const segments = normalizedPath.split("/").filter((seg) => seg !== ".." && seg !== ".")

        if (segments.length === 0) {
            return undefined
        }

        for (let i = 0; i < segments.length; i++) {
            if (
                segments[i] === DDD_FOLDER_NAMES.DOMAIN ||
                segments[i] === DDD_FOLDER_NAMES.AGGREGATES
            ) {
                if (i + 1 < segments.length) {
                    if (
                        this.entityFolderNames.has(segments[i + 1]) ||
                        segments[i + 1] === DDD_FOLDER_NAMES.AGGREGATES
                    ) {
                        if (i + 2 < segments.length) {
                            return segments[i + 2]
                        }
                    } else {
                        return segments[i + 1]
                    }
                }
            }
        }

        if (segments.length >= 2) {
            const secondLastSegment = segments[segments.length - 2]

            if (
                !this.entityFolderNames.has(secondLastSegment) &&
                !this.valueObjectFolderNames.has(secondLastSegment) &&
                !this.allowedFolderNames.has(secondLastSegment) &&
                secondLastSegment !== DDD_FOLDER_NAMES.DOMAIN
            ) {
                return secondLastSegment
            }
        }

        if (segments.length === 1) {
            return undefined
        }

        return undefined
    }

    /**
     * Extracts the entity name from an import path
     */
    private extractEntityName(importPath: string): string | undefined {
        const normalizedPath = importPath.replace(IMPORT_PATTERNS.QUOTE, "")
        const segments = normalizedPath.split("/")
        const lastSegment = segments[segments.length - 1]

        if (lastSegment) {
            return lastSegment.replace(/\.(ts|js)$/, "")
        }

        return undefined
    }

    /**
     * Extracts import paths from a line of code
     *
     * Handles various import statement formats:
     * - import { X } from 'path'
     * - import X from 'path'
     * - import * as X from 'path'
     * - const X = require('path')
     *
     * @param line - A line of code to analyze
     * @returns Array of import paths found in the line
     */
    private extractImports(line: string): string[] {
        const imports: string[] = []

        let match = IMPORT_PATTERNS.ES_IMPORT.exec(line)
        while (match) {
            imports.push(match[1])
            match = IMPORT_PATTERNS.ES_IMPORT.exec(line)
        }

        match = IMPORT_PATTERNS.REQUIRE.exec(line)
        while (match) {
            imports.push(match[1])
            match = IMPORT_PATTERNS.REQUIRE.exec(line)
        }

        return imports
    }
}
