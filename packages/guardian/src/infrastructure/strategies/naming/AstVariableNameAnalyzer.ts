import Parser from "tree-sitter"
import { NamingViolation } from "../../../domain/value-objects/NamingViolation"
import {
    AST_FIELD_NAMES,
    AST_FIELD_TYPES,
    AST_MODIFIER_TYPES,
    AST_PATTERN_TYPES,
    AST_STATEMENT_TYPES,
    AST_VARIABLE_TYPES,
} from "../../../shared/constants"
import { NAMING_VIOLATION_TYPES } from "../../../shared/constants/rules"
import { NAMING_ERROR_MESSAGES } from "../../constants/detectorPatterns"

/**
 * AST-based analyzer for detecting variable naming violations
 *
 * Analyzes variable declarations to ensure proper naming conventions:
 * - Regular variables: camelCase
 * - Constants (exported UPPER_CASE): UPPER_SNAKE_CASE
 * - Class properties: camelCase
 * - Private properties with underscore prefix are allowed
 */
export class AstVariableNameAnalyzer {
    /**
     * Analyzes a variable declaration node
     */
    public analyze(
        node: Parser.SyntaxNode,
        layer: string,
        filePath: string,
        _lines: string[],
    ): NamingViolation | null {
        const variableNodeTypes = [
            AST_VARIABLE_TYPES.VARIABLE_DECLARATOR,
            AST_VARIABLE_TYPES.REQUIRED_PARAMETER,
            AST_VARIABLE_TYPES.OPTIONAL_PARAMETER,
            AST_VARIABLE_TYPES.PUBLIC_FIELD_DEFINITION,
            AST_VARIABLE_TYPES.PROPERTY_SIGNATURE,
        ] as const

        if (!(variableNodeTypes as readonly string[]).includes(node.type)) {
            return null
        }

        const nameNode = node.childForFieldName(AST_FIELD_NAMES.NAME)
        if (!nameNode) {
            return null
        }

        if (this.isDestructuringPattern(nameNode)) {
            return null
        }

        const variableName = nameNode.text
        const lineNumber = nameNode.startPosition.row + 1

        if (variableName.startsWith("_")) {
            return null
        }

        const isConstant = this.isConstantVariable(node)

        if (isConstant) {
            if (!/^[A-Z][A-Z0-9_]*$/.test(variableName)) {
                return NamingViolation.create(
                    variableName,
                    NAMING_VIOLATION_TYPES.WRONG_CASE,
                    layer,
                    `${filePath}:${String(lineNumber)}`,
                    NAMING_ERROR_MESSAGES.CONSTANT_UPPER_SNAKE_CASE,
                    variableName,
                    NAMING_ERROR_MESSAGES.USE_UPPER_SNAKE_CASE_CONSTANT,
                )
            }
        } else {
            if (!/^[a-z][a-zA-Z0-9]*$/.test(variableName)) {
                return NamingViolation.create(
                    variableName,
                    NAMING_VIOLATION_TYPES.WRONG_CASE,
                    layer,
                    `${filePath}:${String(lineNumber)}`,
                    NAMING_ERROR_MESSAGES.VARIABLE_CAMEL_CASE,
                    variableName,
                    NAMING_ERROR_MESSAGES.USE_CAMEL_CASE_VARIABLE,
                )
            }
        }

        return null
    }

    /**
     * Checks if node is a destructuring pattern (object or array)
     */
    private isDestructuringPattern(node: Parser.SyntaxNode): boolean {
        return (
            node.type === AST_PATTERN_TYPES.OBJECT_PATTERN ||
            node.type === AST_PATTERN_TYPES.ARRAY_PATTERN
        )
    }

    /**
     * Checks if a variable is a constant (exported UPPER_CASE)
     */
    private isConstantVariable(node: Parser.SyntaxNode): boolean {
        const variableName = node.childForFieldName(AST_FIELD_NAMES.NAME)?.text
        if (!variableName || !/^[A-Z]/.test(variableName)) {
            return false
        }

        if (
            node.type === AST_VARIABLE_TYPES.PUBLIC_FIELD_DEFINITION ||
            node.type === AST_FIELD_TYPES.FIELD_DEFINITION
        ) {
            return this.hasConstModifiers(node)
        }

        let current: Parser.SyntaxNode | null = node.parent

        while (current) {
            if (current.type === AST_STATEMENT_TYPES.LEXICAL_DECLARATION) {
                const firstChild = current.child(0)
                if (firstChild?.type === AST_MODIFIER_TYPES.CONST) {
                    return true
                }
            }

            if (
                current.type === AST_VARIABLE_TYPES.PUBLIC_FIELD_DEFINITION ||
                current.type === AST_FIELD_TYPES.FIELD_DEFINITION
            ) {
                return this.hasConstModifiers(current)
            }

            current = current.parent
        }

        return false
    }

    /**
     * Checks if field has readonly or static modifiers (indicating a constant)
     */
    private hasConstModifiers(fieldNode: Parser.SyntaxNode): boolean {
        for (let i = 0; i < fieldNode.childCount; i++) {
            const child = fieldNode.child(i)
            const childText = child?.text
            if (
                child?.type === AST_MODIFIER_TYPES.READONLY ||
                child?.type === AST_MODIFIER_TYPES.STATIC ||
                childText === AST_MODIFIER_TYPES.READONLY ||
                childText === AST_MODIFIER_TYPES.STATIC
            ) {
                return true
            }
        }
        return false
    }
}
