import { IFileScanner } from "../../../domain/services/IFileScanner"
import { SourceFile } from "../../../domain/entities/SourceFile"
import { ProjectPath } from "../../../domain/value-objects/ProjectPath"
import { REGEX_PATTERNS } from "../../../shared/constants"

export interface FileCollectionRequest {
    rootDir: string
    include?: string[]
    exclude?: string[]
}

export interface FileCollectionResult {
    sourceFiles: SourceFile[]
}

/**
 * Pipeline step responsible for file collection and basic parsing
 */
export class CollectFiles {
    constructor(private readonly fileScanner: IFileScanner) {}

    public async execute(request: FileCollectionRequest): Promise<FileCollectionResult> {
        const filePaths = await this.fileScanner.scan({
            rootDir: request.rootDir,
            include: request.include,
            exclude: request.exclude,
        })

        const sourceFiles: SourceFile[] = []

        for (const filePath of filePaths) {
            const content = await this.fileScanner.readFile(filePath)
            const projectPath = ProjectPath.create(filePath, request.rootDir)

            const imports = this.extractImports(content)
            const exports = this.extractExports(content)

            const sourceFile = new SourceFile(projectPath, content, imports, exports)
            sourceFiles.push(sourceFile)
        }

        return { sourceFiles }
    }

    private extractImports(content: string): string[] {
        const imports: string[] = []
        let match

        while ((match = REGEX_PATTERNS.IMPORT_STATEMENT.exec(content)) !== null) {
            imports.push(match[1])
        }

        return imports
    }

    private extractExports(content: string): string[] {
        const exports: string[] = []
        let match

        while ((match = REGEX_PATTERNS.EXPORT_STATEMENT.exec(content)) !== null) {
            exports.push(match[1])
        }

        return exports
    }
}
