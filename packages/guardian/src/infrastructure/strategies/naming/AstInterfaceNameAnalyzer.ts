import Parser from "tree-sitter"
import { NamingViolation } from "../../../domain/value-objects/NamingViolation"
import { AST_CLASS_TYPES, AST_FIELD_NAMES } from "../../../shared/constants"
import { LAYERS, NAMING_VIOLATION_TYPES } from "../../../shared/constants/rules"
import { NAMING_ERROR_MESSAGES, PATTERN_WORDS } from "../../constants/detectorPatterns"

/**
 * AST-based analyzer for detecting interface naming violations
 *
 * Analyzes interface declaration nodes to ensure proper naming conventions:
 * - Domain layer: Repository interfaces must start with 'I' (e.g., IUserRepository)
 * - All layers: Interfaces should be PascalCase
 */
export class AstInterfaceNameAnalyzer {
    /**
     * Analyzes an interface declaration node
     */
    public analyze(
        node: Parser.SyntaxNode,
        layer: string,
        filePath: string,
        _lines: string[],
    ): NamingViolation | null {
        if (node.type !== AST_CLASS_TYPES.INTERFACE_DECLARATION) {
            return null
        }

        const nameNode = node.childForFieldName(AST_FIELD_NAMES.NAME)
        if (!nameNode) {
            return null
        }

        const interfaceName = nameNode.text
        const lineNumber = nameNode.startPosition.row + 1

        if (!/^[A-Z][a-zA-Z0-9]*$/.test(interfaceName)) {
            return NamingViolation.create(
                interfaceName,
                NAMING_VIOLATION_TYPES.WRONG_CASE,
                layer,
                `${filePath}:${String(lineNumber)}`,
                NAMING_ERROR_MESSAGES.INTERFACE_PASCAL_CASE,
                interfaceName,
                NAMING_ERROR_MESSAGES.USE_PASCAL_CASE_INTERFACE,
            )
        }

        if (layer === LAYERS.DOMAIN) {
            return this.checkDomainInterface(interfaceName, filePath, lineNumber)
        }

        return null
    }

    /**
     * Checks domain layer interface naming
     */
    private checkDomainInterface(
        interfaceName: string,
        filePath: string,
        lineNumber: number,
    ): NamingViolation | null {
        if (interfaceName.endsWith(PATTERN_WORDS.REPOSITORY)) {
            if (!interfaceName.startsWith(PATTERN_WORDS.I_PREFIX)) {
                return NamingViolation.create(
                    interfaceName,
                    NAMING_VIOLATION_TYPES.WRONG_PREFIX,
                    LAYERS.DOMAIN,
                    `${filePath}:${String(lineNumber)}`,
                    NAMING_ERROR_MESSAGES.REPOSITORY_INTERFACE_I_PREFIX,
                    interfaceName,
                    `Rename to I${interfaceName}`,
                )
            }

            if (!/^I[A-Z][a-zA-Z0-9]*Repository$/.test(interfaceName)) {
                return NamingViolation.create(
                    interfaceName,
                    NAMING_VIOLATION_TYPES.WRONG_CASE,
                    LAYERS.DOMAIN,
                    `${filePath}:${String(lineNumber)}`,
                    NAMING_ERROR_MESSAGES.REPOSITORY_INTERFACE_PATTERN,
                    interfaceName,
                )
            }
        }

        return null
    }
}
