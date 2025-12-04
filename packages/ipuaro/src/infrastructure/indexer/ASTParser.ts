import { builtinModules } from "node:module"
import Parser from "tree-sitter"
import TypeScript from "tree-sitter-typescript"
import JavaScript from "tree-sitter-javascript"
import JSON from "tree-sitter-json"
import * as yamlParser from "yaml"
import {
    createEmptyFileAST,
    type ExportInfo,
    type FileAST,
    type ImportInfo,
    type MethodInfo,
    type ParameterInfo,
    type PropertyInfo,
} from "../../domain/value-objects/FileAST.js"
import { FieldName, NodeType } from "./tree-sitter-types.js"

type Language = "ts" | "tsx" | "js" | "jsx" | "json" | "yaml"
type SyntaxNode = Parser.SyntaxNode

/**
 * Parses source code into AST using tree-sitter.
 */
export class ASTParser {
    private readonly parsers = new Map<Language, Parser>()

    constructor() {
        this.initializeParsers()
    }

    private initializeParsers(): void {
        const tsParser = new Parser()
        tsParser.setLanguage(TypeScript.typescript)
        this.parsers.set("ts", tsParser)

        const tsxParser = new Parser()
        tsxParser.setLanguage(TypeScript.tsx)
        this.parsers.set("tsx", tsxParser)

        const jsParser = new Parser()
        jsParser.setLanguage(JavaScript)
        this.parsers.set("js", jsParser)
        this.parsers.set("jsx", jsParser)

        const jsonParser = new Parser()
        jsonParser.setLanguage(JSON)
        this.parsers.set("json", jsonParser)
    }

    /**
     * Parse source code and extract AST information.
     */
    parse(content: string, language: Language): FileAST {
        if (language === "yaml") {
            return this.parseYAML(content)
        }

        const parser = this.parsers.get(language)
        if (!parser) {
            return {
                ...createEmptyFileAST(),
                parseError: true,
                parseErrorMessage: `Unsupported language: ${language}`,
            }
        }

        try {
            const tree = parser.parse(content)
            const root = tree.rootNode

            if (root.hasError) {
                const ast = this.extractAST(root, language)
                ast.parseError = true
                ast.parseErrorMessage = "Syntax error in source code"
                return ast
            }

            return this.extractAST(root, language)
        } catch (error) {
            return {
                ...createEmptyFileAST(),
                parseError: true,
                parseErrorMessage: error instanceof Error ? error.message : "Unknown parse error",
            }
        }
    }

    /**
     * Parse YAML content using yaml package.
     */
    private parseYAML(content: string): FileAST {
        const ast = createEmptyFileAST()

        try {
            const doc = yamlParser.parseDocument(content)

            if (doc.errors.length > 0) {
                return {
                    ...createEmptyFileAST(),
                    parseError: true,
                    parseErrorMessage: doc.errors[0].message,
                }
            }

            const contents = doc.contents

            if (yamlParser.isSeq(contents)) {
                ast.exports.push({
                    name: "(array)",
                    line: 1,
                    isDefault: false,
                    kind: "variable",
                })
            } else if (yamlParser.isMap(contents)) {
                for (const item of contents.items) {
                    if (yamlParser.isPair(item) && yamlParser.isScalar(item.key)) {
                        const keyRange = item.key.range
                        const line = keyRange ? this.getLineFromOffset(content, keyRange[0]) : 1
                        ast.exports.push({
                            name: String(item.key.value),
                            line,
                            isDefault: false,
                            kind: "variable",
                        })
                    }
                }
            }

            return ast
        } catch (error) {
            return {
                ...createEmptyFileAST(),
                parseError: true,
                parseErrorMessage: error instanceof Error ? error.message : "YAML parse error",
            }
        }
    }

    /**
     * Get line number from character offset.
     */
    private getLineFromOffset(content: string, offset: number): number {
        let line = 1
        for (let i = 0; i < offset && i < content.length; i++) {
            if (content[i] === "\n") {
                line++
            }
        }
        return line
    }

    private extractAST(root: SyntaxNode, language: Language): FileAST {
        const ast = createEmptyFileAST()

        if (language === "json") {
            return this.extractJSONStructure(root, ast)
        }

        const isTypeScript = language === "ts" || language === "tsx"

        for (const child of root.children) {
            this.visitNode(child, ast, isTypeScript)
        }

        return ast
    }

    private visitNode(node: SyntaxNode, ast: FileAST, isTypeScript: boolean): void {
        switch (node.type) {
            case NodeType.IMPORT_STATEMENT:
                this.extractImport(node, ast)
                break
            case NodeType.EXPORT_STATEMENT:
                this.extractExport(node, ast)
                break
            case NodeType.FUNCTION_DECLARATION:
                this.extractFunction(node, ast, false)
                break
            case NodeType.LEXICAL_DECLARATION:
                this.extractLexicalDeclaration(node, ast)
                break
            case NodeType.CLASS_DECLARATION:
                this.extractClass(node, ast, false)
                break
            case NodeType.INTERFACE_DECLARATION:
                if (isTypeScript) {
                    this.extractInterface(node, ast, false)
                }
                break
            case NodeType.TYPE_ALIAS_DECLARATION:
                if (isTypeScript) {
                    this.extractTypeAlias(node, ast, false)
                }
                break
        }
    }

    private extractImport(node: SyntaxNode, ast: FileAST): void {
        const sourceNode = node.childForFieldName(FieldName.SOURCE)
        if (!sourceNode) {
            return
        }

        const from = this.getStringValue(sourceNode)
        const line = node.startPosition.row + 1
        const importType = this.classifyImport(from)

        const importClause = node.children.find((c) => c.type === NodeType.IMPORT_CLAUSE)
        if (!importClause) {
            ast.imports.push({
                name: "*",
                from,
                line,
                type: importType,
                isDefault: false,
            })
            return
        }

        for (const child of importClause.children) {
            if (child.type === NodeType.IDENTIFIER) {
                ast.imports.push({
                    name: child.text,
                    from,
                    line,
                    type: importType,
                    isDefault: true,
                })
            } else if (child.type === NodeType.NAMESPACE_IMPORT) {
                const alias = child.children.find((c) => c.type === NodeType.IDENTIFIER)
                ast.imports.push({
                    name: alias?.text ?? "*",
                    from,
                    line,
                    type: importType,
                    isDefault: false,
                })
            } else if (child.type === NodeType.NAMED_IMPORTS) {
                for (const specifier of child.children) {
                    if (specifier.type === NodeType.IMPORT_SPECIFIER) {
                        const nameNode = specifier.childForFieldName(FieldName.NAME)
                        const aliasNode = specifier.childForFieldName(FieldName.ALIAS)
                        ast.imports.push({
                            name: aliasNode?.text ?? nameNode?.text ?? "",
                            from,
                            line,
                            type: importType,
                            isDefault: false,
                        })
                    }
                }
            }
        }
    }

    private extractExport(node: SyntaxNode, ast: FileAST): void {
        const isDefault = node.children.some((c) => c.type === NodeType.DEFAULT)
        const declaration = node.childForFieldName(FieldName.DECLARATION)

        if (declaration) {
            switch (declaration.type) {
                case NodeType.FUNCTION_DECLARATION:
                    this.extractFunction(declaration, ast, true)
                    this.addExportInfo(ast, declaration, "function", isDefault)
                    break
                case NodeType.CLASS_DECLARATION:
                    this.extractClass(declaration, ast, true)
                    this.addExportInfo(ast, declaration, "class", isDefault)
                    break
                case NodeType.INTERFACE_DECLARATION:
                    this.extractInterface(declaration, ast, true)
                    this.addExportInfo(ast, declaration, "interface", isDefault)
                    break
                case NodeType.TYPE_ALIAS_DECLARATION:
                    this.extractTypeAlias(declaration, ast, true)
                    this.addExportInfo(ast, declaration, "type", isDefault)
                    break
                case NodeType.LEXICAL_DECLARATION:
                    this.extractLexicalDeclaration(declaration, ast, true)
                    break
            }
        }

        const exportClause = node.children.find((c) => c.type === NodeType.EXPORT_CLAUSE)
        if (exportClause) {
            for (const specifier of exportClause.children) {
                if (specifier.type === NodeType.EXPORT_SPECIFIER) {
                    const nameNode = specifier.childForFieldName(FieldName.NAME)
                    if (nameNode) {
                        ast.exports.push({
                            name: nameNode.text,
                            line: node.startPosition.row + 1,
                            isDefault: false,
                            kind: "variable",
                        })
                    }
                }
            }
        }
    }

    private extractFunction(node: SyntaxNode, ast: FileAST, isExported: boolean): void {
        const nameNode = node.childForFieldName(FieldName.NAME)
        if (!nameNode) {
            return
        }

        const params = this.extractParameters(node)
        const isAsync = node.children.some((c) => c.type === NodeType.ASYNC)
        const returnTypeNode = node.childForFieldName(FieldName.RETURN_TYPE)

        ast.functions.push({
            name: nameNode.text,
            lineStart: node.startPosition.row + 1,
            lineEnd: node.endPosition.row + 1,
            params,
            isAsync,
            isExported,
            returnType: returnTypeNode?.text?.replace(/^:\s*/, ""),
        })
    }

    private extractLexicalDeclaration(node: SyntaxNode, ast: FileAST, isExported = false): void {
        for (const child of node.children) {
            if (child.type === NodeType.VARIABLE_DECLARATOR) {
                const nameNode = child.childForFieldName(FieldName.NAME)
                const valueNode = child.childForFieldName(FieldName.VALUE)

                if (
                    valueNode?.type === NodeType.ARROW_FUNCTION ||
                    valueNode?.type === NodeType.FUNCTION
                ) {
                    const params = this.extractParameters(valueNode)
                    const isAsync = valueNode.children.some((c) => c.type === NodeType.ASYNC)

                    ast.functions.push({
                        name: nameNode?.text ?? "",
                        lineStart: node.startPosition.row + 1,
                        lineEnd: node.endPosition.row + 1,
                        params,
                        isAsync,
                        isExported,
                    })

                    if (isExported) {
                        ast.exports.push({
                            name: nameNode?.text ?? "",
                            line: node.startPosition.row + 1,
                            isDefault: false,
                            kind: "function",
                        })
                    }
                } else if (isExported && nameNode) {
                    ast.exports.push({
                        name: nameNode.text,
                        line: node.startPosition.row + 1,
                        isDefault: false,
                        kind: "variable",
                    })
                }
            }
        }
    }

    private extractClass(node: SyntaxNode, ast: FileAST, isExported: boolean): void {
        const nameNode = node.childForFieldName(FieldName.NAME)
        if (!nameNode) {
            return
        }

        const body = node.childForFieldName(FieldName.BODY)
        const methods: MethodInfo[] = []
        const properties: PropertyInfo[] = []

        if (body) {
            for (const member of body.children) {
                if (member.type === NodeType.METHOD_DEFINITION) {
                    methods.push(this.extractMethod(member))
                } else if (
                    member.type === NodeType.PUBLIC_FIELD_DEFINITION ||
                    member.type === NodeType.FIELD_DEFINITION
                ) {
                    properties.push(this.extractProperty(member))
                }
            }
        }

        const { extendsName, implementsList } = this.extractClassHeritage(node)
        const isAbstract = node.children.some((c) => c.type === NodeType.ABSTRACT)

        ast.classes.push({
            name: nameNode.text,
            lineStart: node.startPosition.row + 1,
            lineEnd: node.endPosition.row + 1,
            methods,
            properties,
            extends: extendsName,
            implements: implementsList,
            isExported,
            isAbstract,
        })
    }

    private extractClassHeritage(node: SyntaxNode): {
        extendsName: string | undefined
        implementsList: string[]
    } {
        let extendsName: string | undefined
        const implementsList: string[] = []

        for (const child of node.children) {
            if (child.type === NodeType.CLASS_HERITAGE) {
                this.parseHeritageClause(child, (ext) => (extendsName = ext), implementsList)
            } else if (child.type === NodeType.EXTENDS_CLAUSE) {
                extendsName = this.findTypeIdentifier(child)
            }
        }

        return { extendsName, implementsList }
    }

    private parseHeritageClause(
        heritage: SyntaxNode,
        setExtends: (name: string) => void,
        implementsList: string[],
    ): void {
        for (const clause of heritage.children) {
            if (clause.type === NodeType.EXTENDS_CLAUSE) {
                const typeId = this.findTypeIdentifier(clause)
                if (typeId) {
                    setExtends(typeId)
                }
            } else if (clause.type === NodeType.IMPLEMENTS_CLAUSE) {
                this.collectImplements(clause, implementsList)
            }
        }
    }

    private findTypeIdentifier(node: SyntaxNode): string | undefined {
        const typeNode = node.children.find(
            (c) => c.type === NodeType.TYPE_IDENTIFIER || c.type === NodeType.IDENTIFIER,
        )
        return typeNode?.text
    }

    private collectImplements(clause: SyntaxNode, list: string[]): void {
        for (const impl of clause.children) {
            if (impl.type === NodeType.TYPE_IDENTIFIER || impl.type === NodeType.IDENTIFIER) {
                list.push(impl.text)
            }
        }
    }

    private extractMethod(node: SyntaxNode): MethodInfo {
        const nameNode = node.childForFieldName(FieldName.NAME)
        const params = this.extractParameters(node)
        const isAsync = node.children.some((c) => c.type === NodeType.ASYNC)
        const isStatic = node.children.some((c) => c.type === NodeType.STATIC)

        let visibility: "public" | "private" | "protected" = "public"
        for (const child of node.children) {
            if (child.type === NodeType.ACCESSIBILITY_MODIFIER) {
                visibility = child.text as "public" | "private" | "protected"
                break
            }
        }

        return {
            name: nameNode?.text ?? "",
            lineStart: node.startPosition.row + 1,
            lineEnd: node.endPosition.row + 1,
            params,
            isAsync,
            visibility,
            isStatic,
        }
    }

    private extractProperty(node: SyntaxNode): PropertyInfo {
        const nameNode = node.childForFieldName(FieldName.NAME)
        const typeNode = node.childForFieldName(FieldName.TYPE)
        const isStatic = node.children.some((c) => c.type === NodeType.STATIC)
        const isReadonly = node.children.some((c) => c.text === NodeType.READONLY)

        let visibility: "public" | "private" | "protected" = "public"
        for (const child of node.children) {
            if (child.type === NodeType.ACCESSIBILITY_MODIFIER) {
                visibility = child.text as "public" | "private" | "protected"
                break
            }
        }

        return {
            name: nameNode?.text ?? "",
            line: node.startPosition.row + 1,
            type: typeNode?.text,
            visibility,
            isStatic,
            isReadonly,
        }
    }

    private extractInterface(node: SyntaxNode, ast: FileAST, isExported: boolean): void {
        const nameNode = node.childForFieldName(FieldName.NAME)
        if (!nameNode) {
            return
        }

        const body = node.childForFieldName(FieldName.BODY)
        const properties: PropertyInfo[] = []

        if (body) {
            for (const member of body.children) {
                if (member.type === NodeType.PROPERTY_SIGNATURE) {
                    const propName = member.childForFieldName(FieldName.NAME)
                    const propType = member.childForFieldName(FieldName.TYPE)
                    properties.push({
                        name: propName?.text ?? "",
                        line: member.startPosition.row + 1,
                        type: propType?.text,
                        visibility: "public",
                        isStatic: false,
                        isReadonly: member.children.some((c) => c.text === NodeType.READONLY),
                    })
                }
            }
        }

        const extendsList: string[] = []
        const extendsClause = node.children.find((c) => c.type === NodeType.EXTENDS_TYPE_CLAUSE)
        if (extendsClause) {
            for (const child of extendsClause.children) {
                if (child.type === NodeType.TYPE_IDENTIFIER) {
                    extendsList.push(child.text)
                }
            }
        }

        ast.interfaces.push({
            name: nameNode.text,
            lineStart: node.startPosition.row + 1,
            lineEnd: node.endPosition.row + 1,
            properties,
            extends: extendsList,
            isExported,
        })
    }

    private extractTypeAlias(node: SyntaxNode, ast: FileAST, isExported: boolean): void {
        const nameNode = node.childForFieldName(FieldName.NAME)
        if (!nameNode) {
            return
        }

        ast.typeAliases.push({
            name: nameNode.text,
            line: node.startPosition.row + 1,
            isExported,
        })
    }

    private extractParameters(node: SyntaxNode): ParameterInfo[] {
        const params: ParameterInfo[] = []
        const paramsNode = node.childForFieldName(FieldName.PARAMETERS)

        if (paramsNode) {
            for (const param of paramsNode.children) {
                if (
                    param.type === NodeType.REQUIRED_PARAMETER ||
                    param.type === NodeType.OPTIONAL_PARAMETER ||
                    param.type === NodeType.IDENTIFIER
                ) {
                    const nameNode =
                        param.type === NodeType.IDENTIFIER
                            ? param
                            : param.childForFieldName(FieldName.PATTERN)
                    const typeNode = param.childForFieldName(FieldName.TYPE)
                    const defaultValue = param.childForFieldName(FieldName.VALUE)

                    params.push({
                        name: nameNode?.text ?? "",
                        type: typeNode?.text,
                        optional: param.type === NodeType.OPTIONAL_PARAMETER,
                        hasDefault: defaultValue !== null,
                    })
                }
            }
        }

        return params
    }

    private addExportInfo(
        ast: FileAST,
        node: SyntaxNode,
        kind: ExportInfo["kind"],
        isDefault: boolean,
    ): void {
        const nameNode = node.childForFieldName(FieldName.NAME)
        if (nameNode) {
            ast.exports.push({
                name: nameNode.text,
                line: node.startPosition.row + 1,
                isDefault,
                kind,
            })
        }
    }

    private classifyImport(from: string): ImportInfo["type"] {
        if (from.startsWith(".") || from.startsWith("/")) {
            return "internal"
        }
        if (from.startsWith("node:") || builtinModules.includes(from)) {
            return "builtin"
        }
        return "external"
    }

    private getStringValue(node: SyntaxNode): string {
        const text = node.text
        if (
            (text.startsWith('"') && text.endsWith('"')) ||
            (text.startsWith("'") && text.endsWith("'"))
        ) {
            return text.slice(1, -1)
        }
        return text
    }

    /**
     * Extract structure from JSON file.
     * For JSON files, we extract top-level keys from objects.
     */
    private extractJSONStructure(root: SyntaxNode, ast: FileAST): FileAST {
        for (const child of root.children) {
            if (child.type === "object") {
                this.extractJSONKeys(child, ast)
            }
        }
        return ast
    }

    /**
     * Extract keys from JSON object.
     */
    private extractJSONKeys(node: SyntaxNode, ast: FileAST): void {
        for (const child of node.children) {
            if (child.type === "pair") {
                const keyNode = child.childForFieldName("key")
                if (keyNode) {
                    const keyName = this.getStringValue(keyNode)
                    ast.exports.push({
                        name: keyName,
                        line: keyNode.startPosition.row + 1,
                        isDefault: false,
                        kind: "variable",
                    })
                }
            }
        }
    }
}
