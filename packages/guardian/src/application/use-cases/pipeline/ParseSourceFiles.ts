import { ICodeParser } from "../../../domain/services/ICodeParser"
import { SourceFile } from "../../../domain/entities/SourceFile"
import { DependencyGraph } from "../../../domain/entities/DependencyGraph"

export interface ParsingRequest {
    sourceFiles: SourceFile[]
    rootDir: string
}

export interface ParsingResult {
    dependencyGraph: DependencyGraph
    totalFunctions: number
}

/**
 * Pipeline step responsible for AST parsing and dependency graph construction
 */
export class ParseSourceFiles {
    constructor(private readonly codeParser: ICodeParser) {}

    public execute(request: ParsingRequest): ParsingResult {
        const dependencyGraph = new DependencyGraph()
        let totalFunctions = 0

        for (const sourceFile of request.sourceFiles) {
            dependencyGraph.addFile(sourceFile)

            if (sourceFile.path.isTypeScript()) {
                const tree = this.codeParser.parseTypeScript(sourceFile.content)
                const functions = this.codeParser.extractFunctions(tree)
                totalFunctions += functions.length
            }

            for (const imp of sourceFile.imports) {
                dependencyGraph.addDependency(
                    sourceFile.path.relative,
                    this.resolveImportPath(imp, sourceFile.path.relative, request.rootDir),
                )
            }
        }

        return { dependencyGraph, totalFunctions }
    }

    private resolveImportPath(importPath: string, _currentFile: string, _rootDir: string): string {
        if (importPath.startsWith(".")) {
            return importPath
        }
        return importPath
    }
}
