import Parser from "tree-sitter"
import { NamingViolation } from "../../../domain/value-objects/NamingViolation"
import { AST_CLASS_TYPES, AST_FIELD_NAMES } from "../../../shared/constants"
import { LAYERS, NAMING_VIOLATION_TYPES, USE_CASE_VERBS } from "../../../shared/constants/rules"
import {
    FILE_SUFFIXES,
    NAMING_ERROR_MESSAGES,
    PATTERN_WORDS,
} from "../../constants/detectorPatterns"

/**
 * AST-based analyzer for detecting class naming violations
 *
 * Analyzes class declaration nodes to ensure proper naming conventions:
 * - Domain layer: PascalCase entities and services (*Service)
 * - Application layer: PascalCase use cases (Verb+Noun), DTOs (*Dto/*Request/*Response)
 * - Infrastructure layer: PascalCase controllers, repositories, services
 */
export class AstClassNameAnalyzer {
    /**
     * Analyzes a class declaration node
     */
    public analyze(
        node: Parser.SyntaxNode,
        layer: string,
        filePath: string,
        _lines: string[],
    ): NamingViolation | null {
        if (node.type !== AST_CLASS_TYPES.CLASS_DECLARATION) {
            return null
        }

        const nameNode = node.childForFieldName(AST_FIELD_NAMES.NAME)
        if (!nameNode) {
            return null
        }

        const className = nameNode.text
        const lineNumber = nameNode.startPosition.row + 1

        switch (layer) {
            case LAYERS.DOMAIN:
                return this.checkDomainClass(className, filePath, lineNumber)
            case LAYERS.APPLICATION:
                return this.checkApplicationClass(className, filePath, lineNumber)
            case LAYERS.INFRASTRUCTURE:
                return this.checkInfrastructureClass(className, filePath, lineNumber)
            default:
                return null
        }
    }

    /**
     * Checks domain layer class naming
     */
    private checkDomainClass(
        className: string,
        filePath: string,
        lineNumber: number,
    ): NamingViolation | null {
        if (className.endsWith(FILE_SUFFIXES.SERVICE.replace(".ts", ""))) {
            if (!/^[A-Z][a-zA-Z0-9]*Service$/.test(className)) {
                return NamingViolation.create(
                    className,
                    NAMING_VIOLATION_TYPES.WRONG_CASE,
                    LAYERS.DOMAIN,
                    `${filePath}:${String(lineNumber)}`,
                    NAMING_ERROR_MESSAGES.DOMAIN_SERVICE_PASCAL_CASE,
                    className,
                )
            }
            return null
        }

        if (!/^[A-Z][a-zA-Z0-9]*$/.test(className)) {
            return NamingViolation.create(
                className,
                NAMING_VIOLATION_TYPES.WRONG_CASE,
                LAYERS.DOMAIN,
                `${filePath}:${String(lineNumber)}`,
                NAMING_ERROR_MESSAGES.DOMAIN_ENTITY_PASCAL_CASE,
                className,
                NAMING_ERROR_MESSAGES.USE_PASCAL_CASE,
            )
        }

        return null
    }

    /**
     * Checks application layer class naming
     */
    private checkApplicationClass(
        className: string,
        filePath: string,
        lineNumber: number,
    ): NamingViolation | null {
        if (
            className.endsWith("Dto") ||
            className.endsWith("Request") ||
            className.endsWith("Response")
        ) {
            if (!/^[A-Z][a-zA-Z0-9]*(Dto|Request|Response)$/.test(className)) {
                return NamingViolation.create(
                    className,
                    NAMING_VIOLATION_TYPES.WRONG_SUFFIX,
                    LAYERS.APPLICATION,
                    `${filePath}:${String(lineNumber)}`,
                    NAMING_ERROR_MESSAGES.DTO_PASCAL_CASE,
                    className,
                    NAMING_ERROR_MESSAGES.USE_DTO_SUFFIX,
                )
            }
            return null
        }

        if (className.endsWith("Mapper")) {
            if (!/^[A-Z][a-zA-Z0-9]*Mapper$/.test(className)) {
                return NamingViolation.create(
                    className,
                    NAMING_VIOLATION_TYPES.WRONG_SUFFIX,
                    LAYERS.APPLICATION,
                    `${filePath}:${String(lineNumber)}`,
                    NAMING_ERROR_MESSAGES.MAPPER_PASCAL_CASE,
                    className,
                )
            }
            return null
        }

        const startsWithVerb = this.startsWithCommonVerb(className)
        const startsWithLowercaseVerb = this.startsWithLowercaseVerb(className)
        if (startsWithVerb) {
            if (!/^[A-Z][a-z]+[A-Z][a-zA-Z0-9]*$/.test(className)) {
                return NamingViolation.create(
                    className,
                    NAMING_VIOLATION_TYPES.WRONG_VERB_NOUN,
                    LAYERS.APPLICATION,
                    `${filePath}:${String(lineNumber)}`,
                    NAMING_ERROR_MESSAGES.USE_CASE_VERB_NOUN,
                    className,
                    NAMING_ERROR_MESSAGES.USE_VERB_NOUN,
                )
            }
        } else if (startsWithLowercaseVerb) {
            return NamingViolation.create(
                className,
                NAMING_VIOLATION_TYPES.WRONG_VERB_NOUN,
                LAYERS.APPLICATION,
                `${filePath}:${String(lineNumber)}`,
                NAMING_ERROR_MESSAGES.USE_CASE_VERB_NOUN,
                className,
                NAMING_ERROR_MESSAGES.USE_VERB_NOUN,
            )
        }

        return null
    }

    /**
     * Checks infrastructure layer class naming
     */
    private checkInfrastructureClass(
        className: string,
        filePath: string,
        lineNumber: number,
    ): NamingViolation | null {
        if (className.endsWith("Controller")) {
            if (!/^[A-Z][a-zA-Z0-9]*Controller$/.test(className)) {
                return NamingViolation.create(
                    className,
                    NAMING_VIOLATION_TYPES.WRONG_SUFFIX,
                    LAYERS.INFRASTRUCTURE,
                    `${filePath}:${String(lineNumber)}`,
                    NAMING_ERROR_MESSAGES.CONTROLLER_PASCAL_CASE,
                    className,
                )
            }
            return null
        }

        if (
            className.endsWith(PATTERN_WORDS.REPOSITORY) &&
            !className.startsWith(PATTERN_WORDS.I_PREFIX)
        ) {
            if (!/^[A-Z][a-zA-Z0-9]*Repository$/.test(className)) {
                return NamingViolation.create(
                    className,
                    NAMING_VIOLATION_TYPES.WRONG_SUFFIX,
                    LAYERS.INFRASTRUCTURE,
                    `${filePath}:${String(lineNumber)}`,
                    NAMING_ERROR_MESSAGES.REPOSITORY_IMPL_PASCAL_CASE,
                    className,
                )
            }
            return null
        }

        if (className.endsWith("Service") || className.endsWith("Adapter")) {
            if (!/^[A-Z][a-zA-Z0-9]*(Service|Adapter)$/.test(className)) {
                return NamingViolation.create(
                    className,
                    NAMING_VIOLATION_TYPES.WRONG_SUFFIX,
                    LAYERS.INFRASTRUCTURE,
                    `${filePath}:${String(lineNumber)}`,
                    NAMING_ERROR_MESSAGES.SERVICE_ADAPTER_PASCAL_CASE,
                    className,
                )
            }
            return null
        }

        return null
    }

    /**
     * Checks if class name starts with a common use case verb
     */
    private startsWithCommonVerb(className: string): boolean {
        return USE_CASE_VERBS.some((verb) => className.startsWith(verb))
    }

    /**
     * Checks if class name starts with a lowercase verb (camelCase use case)
     */
    private startsWithLowercaseVerb(className: string): boolean {
        const lowercaseVerbs = USE_CASE_VERBS.map((verb) => verb.toLowerCase())
        return lowercaseVerbs.some((verb) => className.startsWith(verb))
    }
}
