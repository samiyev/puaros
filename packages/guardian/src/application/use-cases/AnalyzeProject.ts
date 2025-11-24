import { UseCase } from "./BaseUseCase"
import { ResponseDto } from "../dtos/ResponseDto"
import { IFileScanner } from "../../domain/services/IFileScanner"
import { ICodeParser } from "../../domain/services/ICodeParser"
import { IHardcodeDetector } from "../../domain/services/IHardcodeDetector"
import { INamingConventionDetector } from "../../domain/services/INamingConventionDetector"
import { IFrameworkLeakDetector } from "../../domain/services/IFrameworkLeakDetector"
import { IEntityExposureDetector } from "../../domain/services/IEntityExposureDetector"
import { IDependencyDirectionDetector } from "../../domain/services/IDependencyDirectionDetector"
import { IRepositoryPatternDetector } from "../../domain/services/RepositoryPatternDetectorService"
import { SourceFile } from "../../domain/entities/SourceFile"
import { DependencyGraph } from "../../domain/entities/DependencyGraph"
import { ProjectPath } from "../../domain/value-objects/ProjectPath"
import {
    ERROR_MESSAGES,
    HARDCODE_TYPES,
    LAYERS,
    NAMING_VIOLATION_TYPES,
    REGEX_PATTERNS,
    REPOSITORY_VIOLATION_TYPES,
    RULES,
    SEVERITY_ORDER,
    type SeverityLevel,
    VIOLATION_SEVERITY_MAP,
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
    entityExposureViolations: EntityExposureViolation[]
    dependencyDirectionViolations: DependencyDirectionViolation[]
    repositoryPatternViolations: RepositoryPatternViolation[]
    metrics: ProjectMetrics
}

export interface ArchitectureViolation {
    rule: string
    message: string
    file: string
    line?: number
    severity: SeverityLevel
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
    severity: SeverityLevel
}

export interface CircularDependencyViolation {
    rule: typeof RULES.CIRCULAR_DEPENDENCY
    message: string
    cycle: string[]
    severity: SeverityLevel
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
    severity: SeverityLevel
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
    severity: SeverityLevel
}

export interface EntityExposureViolation {
    rule: typeof RULES.ENTITY_EXPOSURE
    entityName: string
    returnType: string
    file: string
    layer: string
    line?: number
    methodName?: string
    message: string
    suggestion: string
    severity: SeverityLevel
}

export interface DependencyDirectionViolation {
    rule: typeof RULES.DEPENDENCY_DIRECTION
    fromLayer: string
    toLayer: string
    importPath: string
    file: string
    line?: number
    message: string
    suggestion: string
    severity: SeverityLevel
}

export interface RepositoryPatternViolation {
    rule: typeof RULES.REPOSITORY_PATTERN
    violationType:
        | typeof REPOSITORY_VIOLATION_TYPES.ORM_TYPE_IN_INTERFACE
        | typeof REPOSITORY_VIOLATION_TYPES.CONCRETE_REPOSITORY_IN_USE_CASE
        | typeof REPOSITORY_VIOLATION_TYPES.NEW_REPOSITORY_IN_USE_CASE
        | typeof REPOSITORY_VIOLATION_TYPES.NON_DOMAIN_METHOD_NAME
    file: string
    layer: string
    line?: number
    details: string
    message: string
    suggestion: string
    severity: SeverityLevel
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
        private readonly entityExposureDetector: IEntityExposureDetector,
        private readonly dependencyDirectionDetector: IDependencyDirectionDetector,
        private readonly repositoryPatternDetector: IRepositoryPatternDetector,
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

            const violations = this.sortBySeverity(this.detectViolations(sourceFiles))
            const hardcodeViolations = this.sortBySeverity(this.detectHardcode(sourceFiles))
            const circularDependencyViolations = this.sortBySeverity(
                this.detectCircularDependencies(dependencyGraph),
            )
            const namingViolations = this.sortBySeverity(this.detectNamingConventions(sourceFiles))
            const frameworkLeakViolations = this.sortBySeverity(
                this.detectFrameworkLeaks(sourceFiles),
            )
            const entityExposureViolations = this.sortBySeverity(
                this.detectEntityExposures(sourceFiles),
            )
            const dependencyDirectionViolations = this.sortBySeverity(
                this.detectDependencyDirections(sourceFiles),
            )
            const repositoryPatternViolations = this.sortBySeverity(
                this.detectRepositoryPatternViolations(sourceFiles),
            )
            const metrics = this.calculateMetrics(sourceFiles, totalFunctions, dependencyGraph)

            return ResponseDto.ok({
                files: sourceFiles,
                dependencyGraph,
                violations,
                hardcodeViolations,
                circularDependencyViolations,
                namingViolations,
                frameworkLeakViolations,
                entityExposureViolations,
                dependencyDirectionViolations,
                repositoryPatternViolations,
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
                        severity: VIOLATION_SEVERITY_MAP.ARCHITECTURE,
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
                    severity: VIOLATION_SEVERITY_MAP.HARDCODE,
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
                severity: VIOLATION_SEVERITY_MAP.CIRCULAR_DEPENDENCY,
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
                    severity: VIOLATION_SEVERITY_MAP.NAMING_CONVENTION,
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
                    severity: VIOLATION_SEVERITY_MAP.FRAMEWORK_LEAK,
                })
            }
        }

        return violations
    }

    private detectEntityExposures(sourceFiles: SourceFile[]): EntityExposureViolation[] {
        const violations: EntityExposureViolation[] = []

        for (const file of sourceFiles) {
            const exposures = this.entityExposureDetector.detectExposures(
                file.content,
                file.path.relative,
                file.layer,
            )

            for (const exposure of exposures) {
                violations.push({
                    rule: RULES.ENTITY_EXPOSURE,
                    entityName: exposure.entityName,
                    returnType: exposure.returnType,
                    file: file.path.relative,
                    layer: exposure.layer,
                    line: exposure.line,
                    methodName: exposure.methodName,
                    message: exposure.getMessage(),
                    suggestion: exposure.getSuggestion(),
                    severity: VIOLATION_SEVERITY_MAP.ENTITY_EXPOSURE,
                })
            }
        }

        return violations
    }

    private detectDependencyDirections(sourceFiles: SourceFile[]): DependencyDirectionViolation[] {
        const violations: DependencyDirectionViolation[] = []

        for (const file of sourceFiles) {
            const directionViolations = this.dependencyDirectionDetector.detectViolations(
                file.content,
                file.path.relative,
                file.layer,
            )

            for (const violation of directionViolations) {
                violations.push({
                    rule: RULES.DEPENDENCY_DIRECTION,
                    fromLayer: violation.fromLayer,
                    toLayer: violation.toLayer,
                    importPath: violation.importPath,
                    file: file.path.relative,
                    line: violation.line,
                    message: violation.getMessage(),
                    suggestion: violation.getSuggestion(),
                    severity: VIOLATION_SEVERITY_MAP.DEPENDENCY_DIRECTION,
                })
            }
        }

        return violations
    }

    private detectRepositoryPatternViolations(
        sourceFiles: SourceFile[],
    ): RepositoryPatternViolation[] {
        const violations: RepositoryPatternViolation[] = []

        for (const file of sourceFiles) {
            const patternViolations = this.repositoryPatternDetector.detectViolations(
                file.content,
                file.path.relative,
                file.layer,
            )

            for (const violation of patternViolations) {
                violations.push({
                    rule: RULES.REPOSITORY_PATTERN,
                    violationType: violation.violationType as
                        | typeof REPOSITORY_VIOLATION_TYPES.ORM_TYPE_IN_INTERFACE
                        | typeof REPOSITORY_VIOLATION_TYPES.CONCRETE_REPOSITORY_IN_USE_CASE
                        | typeof REPOSITORY_VIOLATION_TYPES.NEW_REPOSITORY_IN_USE_CASE
                        | typeof REPOSITORY_VIOLATION_TYPES.NON_DOMAIN_METHOD_NAME,
                    file: file.path.relative,
                    layer: violation.layer,
                    line: violation.line,
                    details: violation.details,
                    message: violation.getMessage(),
                    suggestion: violation.getSuggestion(),
                    severity: VIOLATION_SEVERITY_MAP.REPOSITORY_PATTERN,
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

    private sortBySeverity<T extends { severity: SeverityLevel }>(violations: T[]): T[] {
        return violations.sort((a, b) => {
            return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
        })
    }
}
