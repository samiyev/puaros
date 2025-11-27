import Parser from "tree-sitter"
import { NamingViolation } from "../../../domain/value-objects/NamingViolation"
import { AST_CLASS_TYPES, AST_FUNCTION_TYPES, AST_VARIABLE_TYPES } from "../../../shared/constants"
import { AstClassNameAnalyzer } from "./AstClassNameAnalyzer"
import { AstFunctionNameAnalyzer } from "./AstFunctionNameAnalyzer"
import { AstInterfaceNameAnalyzer } from "./AstInterfaceNameAnalyzer"
import { AstVariableNameAnalyzer } from "./AstVariableNameAnalyzer"

/**
 * AST tree traverser for detecting naming convention violations
 *
 * Walks through the Abstract Syntax Tree and uses analyzers
 * to detect naming violations in classes, interfaces, functions, and variables.
 */
export class AstNamingTraverser {
    constructor(
        private readonly classAnalyzer: AstClassNameAnalyzer,
        private readonly interfaceAnalyzer: AstInterfaceNameAnalyzer,
        private readonly functionAnalyzer: AstFunctionNameAnalyzer,
        private readonly variableAnalyzer: AstVariableNameAnalyzer,
    ) {}

    /**
     * Traverses the AST tree and collects naming violations
     */
    public traverse(
        tree: Parser.Tree,
        sourceCode: string,
        layer: string,
        filePath: string,
    ): NamingViolation[] {
        const results: NamingViolation[] = []
        const lines = sourceCode.split("\n")
        const cursor = tree.walk()

        this.visit(cursor, lines, layer, filePath, results)

        return results
    }

    /**
     * Recursively visits AST nodes
     */
    private visit(
        cursor: Parser.TreeCursor,
        lines: string[],
        layer: string,
        filePath: string,
        results: NamingViolation[],
    ): void {
        const node = cursor.currentNode

        if (node.type === AST_CLASS_TYPES.CLASS_DECLARATION) {
            const violation = this.classAnalyzer.analyze(node, layer, filePath, lines)
            if (violation) {
                results.push(violation)
            }
        } else if (node.type === AST_CLASS_TYPES.INTERFACE_DECLARATION) {
            const violation = this.interfaceAnalyzer.analyze(node, layer, filePath, lines)
            if (violation) {
                results.push(violation)
            }
        } else if (
            node.type === AST_FUNCTION_TYPES.FUNCTION_DECLARATION ||
            node.type === AST_FUNCTION_TYPES.METHOD_DEFINITION ||
            node.type === AST_FUNCTION_TYPES.FUNCTION_SIGNATURE
        ) {
            const violation = this.functionAnalyzer.analyze(node, layer, filePath, lines)
            if (violation) {
                results.push(violation)
            }
        } else if (
            node.type === AST_VARIABLE_TYPES.VARIABLE_DECLARATOR ||
            node.type === AST_VARIABLE_TYPES.REQUIRED_PARAMETER ||
            node.type === AST_VARIABLE_TYPES.OPTIONAL_PARAMETER ||
            node.type === AST_VARIABLE_TYPES.PUBLIC_FIELD_DEFINITION ||
            node.type === AST_VARIABLE_TYPES.PROPERTY_SIGNATURE
        ) {
            const violation = this.variableAnalyzer.analyze(node, layer, filePath, lines)
            if (violation) {
                results.push(violation)
            }
        }

        if (cursor.gotoFirstChild()) {
            do {
                this.visit(cursor, lines, layer, filePath, results)
            } while (cursor.gotoNextSibling())
            cursor.gotoParent()
        }
    }
}
