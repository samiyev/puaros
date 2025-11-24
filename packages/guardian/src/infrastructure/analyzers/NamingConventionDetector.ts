import { INamingConventionDetector } from "../../domain/services/INamingConventionDetector"
import { NamingViolation } from "../../domain/value-objects/NamingViolation"
import {
    LAYERS,
    NAMING_PATTERNS,
    NAMING_VIOLATION_TYPES,
    USE_CASE_VERBS,
} from "../../shared/constants/rules"
import {
    EXCLUDED_FILES,
    FILE_SUFFIXES,
    NAMING_ERROR_MESSAGES,
    PATH_PATTERNS,
    PATTERN_WORDS,
} from "../constants/detectorPatterns"

/**
 * Detects naming convention violations based on Clean Architecture layers
 *
 * This detector ensures that files follow naming conventions appropriate to their layer:
 * - Domain: Entities (nouns), Services (*Service), Value Objects, Repository interfaces (I*Repository)
 * - Application: Use cases (verbs), DTOs (*Dto/*Request/*Response), Mappers (*Mapper)
 * - Infrastructure: Controllers (*Controller), Repository implementations (*Repository), Services (*Service/*Adapter)
 *
 * @example
 * ```typescript
 * const detector = new NamingConventionDetector()
 * const violations = detector.detectViolations('UserDto.ts', 'domain', 'src/domain/UserDto.ts')
 * // Returns violation: DTOs should not be in domain layer
 * ```
 */
export class NamingConventionDetector implements INamingConventionDetector {
    public detectViolations(
        fileName: string,
        layer: string | undefined,
        filePath: string,
    ): NamingViolation[] {
        if (!layer) {
            return []
        }

        if ((EXCLUDED_FILES as readonly string[]).includes(fileName)) {
            return []
        }

        switch (layer) {
            case LAYERS.DOMAIN:
                return this.checkDomainLayer(fileName, filePath)
            case LAYERS.APPLICATION:
                return this.checkApplicationLayer(fileName, filePath)
            case LAYERS.INFRASTRUCTURE:
                return this.checkInfrastructureLayer(fileName, filePath)
            case LAYERS.SHARED:
                return []
            default:
                return []
        }
    }

    private checkDomainLayer(fileName: string, filePath: string): NamingViolation[] {
        const violations: NamingViolation[] = []

        const forbiddenPatterns = NAMING_PATTERNS.DOMAIN.ENTITY.forbidden ?? []

        for (const forbidden of forbiddenPatterns) {
            if (fileName.includes(forbidden)) {
                violations.push(
                    NamingViolation.create(
                        fileName,
                        NAMING_VIOLATION_TYPES.FORBIDDEN_PATTERN,
                        LAYERS.DOMAIN,
                        filePath,
                        NAMING_ERROR_MESSAGES.DOMAIN_FORBIDDEN,
                        fileName,
                        "Move to application or infrastructure layer, or rename to follow domain patterns",
                    ),
                )
                return violations
            }
        }

        if (fileName.endsWith(FILE_SUFFIXES.SERVICE)) {
            if (!NAMING_PATTERNS.DOMAIN.SERVICE.pattern.test(fileName)) {
                violations.push(
                    NamingViolation.create(
                        fileName,
                        NAMING_VIOLATION_TYPES.WRONG_CASE,
                        LAYERS.DOMAIN,
                        filePath,
                        NAMING_PATTERNS.DOMAIN.SERVICE.description,
                        fileName,
                    ),
                )
            }
            return violations
        }

        if (
            fileName.startsWith(PATTERN_WORDS.I_PREFIX) &&
            fileName.includes(PATTERN_WORDS.REPOSITORY)
        ) {
            if (!NAMING_PATTERNS.DOMAIN.REPOSITORY_INTERFACE.pattern.test(fileName)) {
                violations.push(
                    NamingViolation.create(
                        fileName,
                        NAMING_VIOLATION_TYPES.WRONG_PREFIX,
                        LAYERS.DOMAIN,
                        filePath,
                        NAMING_PATTERNS.DOMAIN.REPOSITORY_INTERFACE.description,
                        fileName,
                    ),
                )
            }
            return violations
        }

        if (!NAMING_PATTERNS.DOMAIN.ENTITY.pattern.test(fileName)) {
            violations.push(
                NamingViolation.create(
                    fileName,
                    NAMING_VIOLATION_TYPES.WRONG_CASE,
                    LAYERS.DOMAIN,
                    filePath,
                    NAMING_PATTERNS.DOMAIN.ENTITY.description,
                    fileName,
                    NAMING_ERROR_MESSAGES.USE_PASCAL_CASE,
                ),
            )
        }

        return violations
    }

    private checkApplicationLayer(fileName: string, filePath: string): NamingViolation[] {
        const violations: NamingViolation[] = []

        if (
            fileName.endsWith(FILE_SUFFIXES.DTO) ||
            fileName.endsWith(FILE_SUFFIXES.REQUEST) ||
            fileName.endsWith(FILE_SUFFIXES.RESPONSE)
        ) {
            if (!NAMING_PATTERNS.APPLICATION.DTO.pattern.test(fileName)) {
                violations.push(
                    NamingViolation.create(
                        fileName,
                        NAMING_VIOLATION_TYPES.WRONG_SUFFIX,
                        LAYERS.APPLICATION,
                        filePath,
                        NAMING_PATTERNS.APPLICATION.DTO.description,
                        fileName,
                        NAMING_ERROR_MESSAGES.USE_DTO_SUFFIX,
                    ),
                )
            }
            return violations
        }

        if (fileName.endsWith(FILE_SUFFIXES.MAPPER)) {
            if (!NAMING_PATTERNS.APPLICATION.MAPPER.pattern.test(fileName)) {
                violations.push(
                    NamingViolation.create(
                        fileName,
                        NAMING_VIOLATION_TYPES.WRONG_SUFFIX,
                        LAYERS.APPLICATION,
                        filePath,
                        NAMING_PATTERNS.APPLICATION.MAPPER.description,
                        fileName,
                    ),
                )
            }
            return violations
        }

        const startsWithVerb = this.startsWithCommonVerb(fileName)
        if (startsWithVerb) {
            if (!NAMING_PATTERNS.APPLICATION.USE_CASE.pattern.test(fileName)) {
                violations.push(
                    NamingViolation.create(
                        fileName,
                        NAMING_VIOLATION_TYPES.WRONG_VERB_NOUN,
                        LAYERS.APPLICATION,
                        filePath,
                        NAMING_PATTERNS.APPLICATION.USE_CASE.description,
                        fileName,
                        NAMING_ERROR_MESSAGES.USE_VERB_NOUN,
                    ),
                )
            }
            return violations
        }

        if (
            filePath.includes(PATH_PATTERNS.USE_CASES) ||
            filePath.includes(PATH_PATTERNS.USE_CASES_ALT)
        ) {
            const hasVerb = this.startsWithCommonVerb(fileName)
            if (!hasVerb) {
                violations.push(
                    NamingViolation.create(
                        fileName,
                        NAMING_VIOLATION_TYPES.WRONG_VERB_NOUN,
                        LAYERS.APPLICATION,
                        filePath,
                        NAMING_ERROR_MESSAGES.USE_CASE_START_VERB,
                        fileName,
                        `Start with a verb like: ${USE_CASE_VERBS.slice(0, 5).join(", ")}`,
                    ),
                )
            }
        }

        return violations
    }

    private checkInfrastructureLayer(fileName: string, filePath: string): NamingViolation[] {
        const violations: NamingViolation[] = []

        if (fileName.endsWith(FILE_SUFFIXES.CONTROLLER)) {
            if (!NAMING_PATTERNS.INFRASTRUCTURE.CONTROLLER.pattern.test(fileName)) {
                violations.push(
                    NamingViolation.create(
                        fileName,
                        NAMING_VIOLATION_TYPES.WRONG_SUFFIX,
                        LAYERS.INFRASTRUCTURE,
                        filePath,
                        NAMING_PATTERNS.INFRASTRUCTURE.CONTROLLER.description,
                        fileName,
                    ),
                )
            }
            return violations
        }

        if (
            fileName.endsWith(FILE_SUFFIXES.REPOSITORY) &&
            !fileName.startsWith(PATTERN_WORDS.I_PREFIX)
        ) {
            if (!NAMING_PATTERNS.INFRASTRUCTURE.REPOSITORY_IMPL.pattern.test(fileName)) {
                violations.push(
                    NamingViolation.create(
                        fileName,
                        NAMING_VIOLATION_TYPES.WRONG_SUFFIX,
                        LAYERS.INFRASTRUCTURE,
                        filePath,
                        NAMING_PATTERNS.INFRASTRUCTURE.REPOSITORY_IMPL.description,
                        fileName,
                    ),
                )
            }
            return violations
        }

        if (fileName.endsWith(FILE_SUFFIXES.SERVICE) || fileName.endsWith(FILE_SUFFIXES.ADAPTER)) {
            if (!NAMING_PATTERNS.INFRASTRUCTURE.SERVICE.pattern.test(fileName)) {
                violations.push(
                    NamingViolation.create(
                        fileName,
                        NAMING_VIOLATION_TYPES.WRONG_SUFFIX,
                        LAYERS.INFRASTRUCTURE,
                        filePath,
                        NAMING_PATTERNS.INFRASTRUCTURE.SERVICE.description,
                        fileName,
                    ),
                )
            }
            return violations
        }

        return violations
    }

    private startsWithCommonVerb(fileName: string): boolean {
        const baseFileName = fileName.replace(/\.tsx?$/, "")

        return USE_CASE_VERBS.some((verb) => baseFileName.startsWith(verb))
    }
}
