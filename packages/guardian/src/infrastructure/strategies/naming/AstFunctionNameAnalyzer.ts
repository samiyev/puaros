import Parser from "tree-sitter"
import { NamingViolation } from "../../../domain/value-objects/NamingViolation"
import { AST_FIELD_NAMES, AST_FUNCTION_TYPES, CLASS_KEYWORDS } from "../../../shared/constants"
import { NAMING_VIOLATION_TYPES } from "../../../shared/constants/rules"
import { NAMING_ERROR_MESSAGES } from "../../constants/detectorPatterns"

/**
 * AST-based analyzer for detecting function and method naming violations
 *
 * Analyzes function declaration, method definition, and arrow function nodes
 * to ensure proper naming conventions:
 * - Functions and methods should be camelCase
 * - Private methods with underscore prefix are allowed
 */
export class AstFunctionNameAnalyzer {
    /**
     * Analyzes a function or method declaration node
     */
    public analyze(
        node: Parser.SyntaxNode,
        layer: string,
        filePath: string,
        _lines: string[],
    ): NamingViolation | null {
        const functionNodeTypes = [
            AST_FUNCTION_TYPES.FUNCTION_DECLARATION,
            AST_FUNCTION_TYPES.METHOD_DEFINITION,
            AST_FUNCTION_TYPES.FUNCTION_SIGNATURE,
        ] as const

        if (!(functionNodeTypes as readonly string[]).includes(node.type)) {
            return null
        }

        const nameNode = node.childForFieldName(AST_FIELD_NAMES.NAME)
        if (!nameNode) {
            return null
        }

        const functionName = nameNode.text
        const lineNumber = nameNode.startPosition.row + 1

        if (functionName.startsWith("_")) {
            return null
        }

        if (functionName === CLASS_KEYWORDS.CONSTRUCTOR) {
            return null
        }

        if (!/^[a-z][a-zA-Z0-9]*$/.test(functionName)) {
            return NamingViolation.create(
                functionName,
                NAMING_VIOLATION_TYPES.WRONG_CASE,
                layer,
                `${filePath}:${String(lineNumber)}`,
                NAMING_ERROR_MESSAGES.FUNCTION_CAMEL_CASE,
                functionName,
                NAMING_ERROR_MESSAGES.USE_CAMEL_CASE_FUNCTION,
            )
        }

        return null
    }
}
