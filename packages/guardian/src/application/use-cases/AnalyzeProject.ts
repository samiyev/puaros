import { UseCase } from "./BaseUseCase"
import { ResponseDto } from "../dtos/ResponseDto"
import { IFileScanner } from "../../domain/services/IFileScanner"
import { ICodeParser } from "../../domain/services/ICodeParser"
import { IHardcodeDetector } from "../../domain/services/IHardcodeDetector"
import { INamingConventionDetector } from "../../domain/services/INamingConventionDetector"
import { IFrameworkLeakDetector } from "../../domain/services/IFrameworkLeakDetector"
import { SourceFile } from "../../domain/entities/SourceFile"
import { DependencyGraph } from "../../domain/entities/DependencyGraph"
import { ProjectPath } from "../../domain/value-objects/ProjectPath"
import {
    ERROR_MESSAGES,
    HARDCODE_TYPES,
    LAYERS,
    NAMING_VIOLATION_TYPES,
    REGEX_PATTERNS,
    RULES,
    SEVERITY_LEVELS,
} from "../../shared/constants"

export interface AnalyzeProjectRequest {
    rootDir: string
    include?: string[]
    exclude?: string[]
}

export interface AnalyzeProjectResponse {
    files: SourceFile[]
    dependencyGraph: DependencyGraph
    violations: ArchitectureViolation[]
    hardcodeViolations: HardcodeViolation[]
    circularDependencyViolations: CircularDependencyViolation[]
    namingViolations: NamingConventionViolation[]
    frameworkLeakViolations: FrameworkLeakViolation[]
    metrics: ProjectMetrics
}

export interface ArchitectureViolation {
    rule: string
    message: string
    file: string
    line?: number
}

export interface HardcodeViolation {
    rule: typeof RULES.HARDCODED_VALUE
    type:
        | typeof HARDCODE_TYPES.MAGIC_NUMBER
        | typeof HARDCODE_TYPES.MAGIC_STRING
        | typeof HARDCODE_TYPES.MAGIC_CONFIG
    value: string | number
    file: string
    line: number
    column: number
    context: string
    suggestion: {
        constantName: string
        location: string
    }
}

export interface CircularDependencyViolation {
    rule: typeof RULES.CIRCULAR_DEPENDENCY
    message: string
    cycle: string[]
    severity: typeof SEVERITY_LEVELS.ERROR
}

export interface NamingConventionViolation {
    rule: typeof RULES.NAMING_CONVENTION
    type:
        | typeof NAMING_VIOLATION_TYPES.WRONG_SUFFIX
        | typeof NAMING_VIOLATION_TYPES.WRONG_PREFIX
        | typeof NAMING_VIOLATION_TYPES.WRONG_CASE
        | typeof NAMING_VIOLATION_TYPES.FORBIDDEN_PATTERN
        | typeof NAMING_VIOLATION_TYPES.WRONG_VERB_NOUN
    fileName: string
    layer: string
    file: string
    expected: string
    actual: string
    message: string
    suggestion?: string
}

export interface FrameworkLeakViolation {
    rule: typeof RULES.FRAMEWORK_LEAK
    packageName: string
    category: string
    categoryDescription: string
    file: string
    layer: string
    line?: number
    message: string
    suggestion: string
}

export interface ProjectMetrics {
    totalFiles: number
    totalFunctions: number
    totalImports: number
    layerDistribution: Record<string, number>
}

/**
 * Main use case for analyzing a project's codebase
 */
export class AnalyzeProject extends UseCase<
    AnalyzeProjectRequest,
    ResponseDto<AnalyzeProjectResponse>
> {
    constructor(
        private readonly fileScanner: IFileScanner,
        private readonly codeParser: ICodeParser,
        private readonly hardcodeDetector: IHardcodeDetector,
        private readonly namingConventionDetector: INamingConventionDetector,
        private readonly frameworkLeakDetector: IFrameworkLeakDetector,
    ) {
        super()
    }

    public async execute(
        request: AnalyzeProjectRequest,
    ): Promise<ResponseDto<AnalyzeProjectResponse>> {
        try {
            const filePaths = await this.fileScanner.scan({
                rootDir: request.rootDir,
                include: request.include,
                exclude: request.exclude,
            })

            const sourceFiles: SourceFile[] = []
            const dependencyGraph = new DependencyGraph()
            let totalFunctions = 0

            for (const filePath of filePaths) {
                const content = await this.fileScanner.readFile(filePath)
                const projectPath = ProjectPath.create(filePath, request.rootDir)

                const imports = this.extractImports(content)
                const exports = this.extractExports(content)

                const sourceFile = new SourceFile(projectPath, content, imports, exports)

                sourceFiles.push(sourceFile)
                dependencyGraph.addFile(sourceFile)

                if (projectPath.isTypeScript()) {
                    const tree = this.codeParser.parseTypeScript(content)
                    const functions = this.codeParser.extractFunctions(tree)
                    totalFunctions += functions.length
                }

                for (const imp of imports) {
                    dependencyGraph.addDependency(
                        projectPath.relative,
                        this.resolveImportPath(imp, filePath, request.rootDir),
                    )
                }
            }

            const violations = this.detectViolations(sourceFiles)
            const hardcodeViolations = this.detectHardcode(sourceFiles)
            const circularDependencyViolations = this.detectCircularDependencies(dependencyGraph)
            const namingViolations = this.detectNamingConventions(sourceFiles)
            const frameworkLeakViolations = this.detectFrameworkLeaks(sourceFiles)
            const metrics = this.calculateMetrics(sourceFiles, totalFunctions, dependencyGraph)

            return ResponseDto.ok({
                files: sourceFiles,
                dependencyGraph,
                violations,
                hardcodeViolations,
                circularDependencyViolations,
                namingViolations,
                frameworkLeakViolations,
                metrics,
            })
        } catch (error) {
            const errorMessage = `${ERROR_MESSAGES.FAILED_TO_ANALYZE}: ${error instanceof Error ? error.message : String(error)}`
            return ResponseDto.fail(errorMessage)
        }
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

    private resolveImportPath(importPath: string, _currentFile: string, _rootDir: string): string {
        if (importPath.startsWith(".")) {
            return importPath
        }
        return importPath
    }

    private detectViolations(sourceFiles: SourceFile[]): ArchitectureViolation[] {
        const violations: ArchitectureViolation[] = []

        const layerRules: Record<string, string[]> = {
            [LAYERS.DOMAIN]: [LAYERS.SHARED],
            [LAYERS.APPLICATION]: [LAYERS.DOMAIN, LAYERS.SHARED],
            [LAYERS.INFRASTRUCTURE]: [LAYERS.DOMAIN, LAYERS.APPLICATION, LAYERS.SHARED],
            [LAYERS.SHARED]: [],
        }

        for (const file of sourceFiles) {
            if (!file.layer) {
                continue
            }

            const allowedLayers = layerRules[file.layer]

            for (const imp of file.imports) {
                const importedLayer = this.detectLayerFromImport(imp)

                if (
                    importedLayer &&
                    importedLayer !== file.layer &&
                    !allowedLayers.includes(importedLayer)
                ) {
                    violations.push({
                        rule: RULES.CLEAN_ARCHITECTURE,
                        message: `Layer "${file.layer}" cannot import from "${importedLayer}"`,
                        file: file.path.relative,
                    })
                }
            }
        }

        return violations
    }

    private detectLayerFromImport(importPath: string): string | undefined {
        const layers = Object.values(LAYERS)

        for (const layer of layers) {
            if (importPath.toLowerCase().includes(layer)) {
                return layer
            }
        }

        return undefined
    }

    private detectHardcode(sourceFiles: SourceFile[]): HardcodeViolation[] {
        const violations: HardcodeViolation[] = []

        for (const file of sourceFiles) {
            const hardcodedValues = this.hardcodeDetector.detectAll(
                file.content,
                file.path.relative,
            )

            for (const hardcoded of hardcodedValues) {
                violations.push({
                    rule: RULES.HARDCODED_VALUE,
                    type: hardcoded.type,
                    value: hardcoded.value,
                    file: file.path.relative,
                    line: hardcoded.line,
                    column: hardcoded.column,
                    context: hardcoded.context,
                    suggestion: {
                        constantName: hardcoded.suggestConstantName(),
                        location: hardcoded.suggestLocation(file.layer),
                    },
                })
            }
        }

        return violations
    }

    private detectCircularDependencies(
        dependencyGraph: DependencyGraph,
    ): CircularDependencyViolation[] {
        const violations: CircularDependencyViolation[] = []
        const cycles = dependencyGraph.findCycles()

        for (const cycle of cycles) {
            const cycleChain = [...cycle, cycle[0]].join(" → ")
            violations.push({
                rule: RULES.CIRCULAR_DEPENDENCY,
                message: `Circular dependency detected: ${cycleChain}`,
                cycle,
                severity: SEVERITY_LEVELS.ERROR,
            })
        }

        return violations
    }

    private detectNamingConventions(sourceFiles: SourceFile[]): NamingConventionViolation[] {
        const violations: NamingConventionViolation[] = []

        for (const file of sourceFiles) {
            const namingViolations = this.namingConventionDetector.detectViolations(
                file.path.filename,
                file.layer,
                file.path.relative,
            )

            for (const violation of namingViolations) {
                violations.push({
                    rule: RULES.NAMING_CONVENTION,
                    type: violation.violationType,
                    fileName: violation.fileName,
                    layer: violation.layer,
                    file: violation.filePath,
                    expected: violation.expected,
                    actual: violation.actual,
                    message: violation.getMessage(),
                    suggestion: violation.suggestion,
                })
            }
        }

        return violations
    }

    private detectFrameworkLeaks(sourceFiles: SourceFile[]): FrameworkLeakViolation[] {
        const violations: FrameworkLeakViolation[] = []

        for (const file of sourceFiles) {
            const leaks = this.frameworkLeakDetector.detectLeaks(
                file.imports,
                file.path.relative,
                file.layer,
            )

            for (const leak of leaks) {
                violations.push({
                    rule: RULES.FRAMEWORK_LEAK,
                    packageName: leak.packageName,
                    category: leak.category,
                    categoryDescription: leak.getCategoryDescription(),
                    file: file.path.relative,
                    layer: leak.layer,
                    line: leak.line,
                    message: leak.getMessage(),
                    suggestion: leak.getSuggestion(),
                })
            }
        }

        return violations
    }

    private calculateMetrics(
        sourceFiles: SourceFile[],
        totalFunctions: number,
        _dependencyGraph: DependencyGraph,
    ): ProjectMetrics {
        const layerDistribution: Record<string, number> = {}
        let totalImports = 0

        for (const file of sourceFiles) {
            if (file.layer) {
                layerDistribution[file.layer] = (layerDistribution[file.layer] || 0) + 1
            }
            totalImports += file.imports.length
        }

        return {
            totalFiles: sourceFiles.length,
            totalFunctions,
            totalImports,
            layerDistribution,
        }
    }
}
