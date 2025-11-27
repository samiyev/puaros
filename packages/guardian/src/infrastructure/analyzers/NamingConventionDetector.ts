import Parser from "tree-sitter"
import { INamingConventionDetector } from "../../domain/services/INamingConventionDetector"
import { NamingViolation } from "../../domain/value-objects/NamingViolation"
import { FILE_EXTENSIONS } from "../../shared/constants"
import { EXCLUDED_FILES } from "../constants/detectorPatterns"
import { CodeParser } from "../parsers/CodeParser"
import { AstClassNameAnalyzer } from "../strategies/naming/AstClassNameAnalyzer"
import { AstFunctionNameAnalyzer } from "../strategies/naming/AstFunctionNameAnalyzer"
import { AstInterfaceNameAnalyzer } from "../strategies/naming/AstInterfaceNameAnalyzer"
import { AstNamingTraverser } from "../strategies/naming/AstNamingTraverser"
import { AstVariableNameAnalyzer } from "../strategies/naming/AstVariableNameAnalyzer"

/**
 * Detects naming convention violations using AST-based analysis
 *
 * This detector uses Abstract Syntax Tree (AST) analysis via tree-sitter to identify
 * naming convention violations in classes, interfaces, functions, and variables
 * according to Clean Architecture layer rules.
 *
 * The detector uses a modular architecture with specialized components:
 * - AstClassNameAnalyzer: Analyzes class names
 * - AstInterfaceNameAnalyzer: Analyzes interface names
 * - AstFunctionNameAnalyzer: Analyzes function and method names
 * - AstVariableNameAnalyzer: Analyzes variable and constant names
 * - AstNamingTraverser: Traverses the AST and coordinates analyzers
 *
 * @example
 * ```typescript
 * const detector = new NamingConventionDetector()
 * const code = `
 *     class userService {  // Wrong: should be UserService
 *         GetUser() {}     // Wrong: should be getUser
 *     }
 * `
 * const violations = detector.detectViolations(code, 'UserService.ts', 'domain', 'src/domain/UserService.ts')
 * // Returns array of NamingViolation objects
 * ```
 */
export class NamingConventionDetector implements INamingConventionDetector {
    private readonly parser: CodeParser
    private readonly traverser: AstNamingTraverser

    constructor() {
        this.parser = new CodeParser()

        const classAnalyzer = new AstClassNameAnalyzer()
        const interfaceAnalyzer = new AstInterfaceNameAnalyzer()
        const functionAnalyzer = new AstFunctionNameAnalyzer()
        const variableAnalyzer = new AstVariableNameAnalyzer()

        this.traverser = new AstNamingTraverser(
            classAnalyzer,
            interfaceAnalyzer,
            functionAnalyzer,
            variableAnalyzer,
        )
    }

    /**
     * Detects naming convention violations in the given code
     *
     * @param content - Source code to analyze
     * @param fileName - Name of the file being analyzed
     * @param layer - Architectural layer (domain, application, infrastructure, shared)
     * @param filePath - File path for context (used in violation reports)
     * @returns Array of detected naming violations
     */
    public detectViolations(
        content: string,
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

        if (!content || content.trim().length === 0) {
            return []
        }

        const tree = this.parseCode(content, filePath)
        return this.traverser.traverse(tree, content, layer, filePath)
    }

    /**
     * Parses code based on file extension
     */
    private parseCode(code: string, filePath: string): Parser.Tree {
        if (filePath.endsWith(FILE_EXTENSIONS.TYPESCRIPT_JSX)) {
            return this.parser.parseTsx(code)
        } else if (filePath.endsWith(FILE_EXTENSIONS.TYPESCRIPT)) {
            return this.parser.parseTypeScript(code)
        }
        return this.parser.parseJavaScript(code)
    }
}
