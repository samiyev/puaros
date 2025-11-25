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
import { IAggregateBoundaryDetector } from "../../domain/services/IAggregateBoundaryDetector"
import { ISecretDetector } from "../../domain/services/ISecretDetector"
import { IAnemicModelDetector } from "../../domain/services/IAnemicModelDetector"
import { SourceFile } from "../../domain/entities/SourceFile"
import { DependencyGraph } from "../../domain/entities/DependencyGraph"
import { CollectFiles } from "./pipeline/CollectFiles"
import { ParseSourceFiles } from "./pipeline/ParseSourceFiles"
import { ExecuteDetection } from "./pipeline/ExecuteDetection"
import { AggregateResults } from "./pipeline/AggregateResults"
import {
    ERROR_MESSAGES,
    HARDCODE_TYPES,
    NAMING_VIOLATION_TYPES,
    REPOSITORY_VIOLATION_TYPES,
    RULES,
    type SeverityLevel,
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
    aggregateBoundaryViolations: AggregateBoundaryViolation[]
    secretViolations: SecretViolation[]
    anemicModelViolations: AnemicModelViolation[]
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

export interface AggregateBoundaryViolation {
    rule: typeof RULES.AGGREGATE_BOUNDARY
    fromAggregate: string
    toAggregate: string
    entityName: string
    importPath: string
    file: string
    line?: number
    message: string
    suggestion: string
    severity: SeverityLevel
}

export interface SecretViolation {
    rule: typeof RULES.SECRET_EXPOSURE
    secretType: string
    file: string
    line: number
    column: number
    message: string
    suggestion: string
    severity: SeverityLevel
}

export interface AnemicModelViolation {
    rule: typeof RULES.ANEMIC_MODEL
    className: string
    file: string
    layer: string
    line?: number
    methodCount: number
    propertyCount: number
    hasOnlyGettersSetters: boolean
    hasPublicSetters: boolean
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
 * Orchestrates the analysis pipeline through focused components
 */
export class AnalyzeProject extends UseCase<
    AnalyzeProjectRequest,
    ResponseDto<AnalyzeProjectResponse>
> {
    private readonly fileCollectionStep: CollectFiles
    private readonly parsingStep: ParseSourceFiles
    private readonly detectionPipeline: ExecuteDetection
    private readonly resultAggregator: AggregateResults

    constructor(
        fileScanner: IFileScanner,
        codeParser: ICodeParser,
        hardcodeDetector: IHardcodeDetector,
        namingConventionDetector: INamingConventionDetector,
        frameworkLeakDetector: IFrameworkLeakDetector,
        entityExposureDetector: IEntityExposureDetector,
        dependencyDirectionDetector: IDependencyDirectionDetector,
        repositoryPatternDetector: IRepositoryPatternDetector,
        aggregateBoundaryDetector: IAggregateBoundaryDetector,
        secretDetector: ISecretDetector,
        anemicModelDetector: IAnemicModelDetector,
    ) {
        super()
        this.fileCollectionStep = new CollectFiles(fileScanner)
        this.parsingStep = new ParseSourceFiles(codeParser)
        this.detectionPipeline = new ExecuteDetection(
            hardcodeDetector,
            namingConventionDetector,
            frameworkLeakDetector,
            entityExposureDetector,
            dependencyDirectionDetector,
            repositoryPatternDetector,
            aggregateBoundaryDetector,
            secretDetector,
            anemicModelDetector,
        )
        this.resultAggregator = new AggregateResults()
    }

    public async execute(
        request: AnalyzeProjectRequest,
    ): Promise<ResponseDto<AnalyzeProjectResponse>> {
        try {
            const { sourceFiles } = await this.fileCollectionStep.execute({
                rootDir: request.rootDir,
                include: request.include,
                exclude: request.exclude,
            })

            const { dependencyGraph, totalFunctions } = this.parsingStep.execute({
                sourceFiles,
                rootDir: request.rootDir,
            })

            const detectionResult = await this.detectionPipeline.execute({
                sourceFiles,
                dependencyGraph,
            })

            const response = this.resultAggregator.execute({
                sourceFiles,
                dependencyGraph,
                totalFunctions,
                ...detectionResult,
            })

            return ResponseDto.ok(response)
        } catch (error) {
            const errorMessage = `${ERROR_MESSAGES.FAILED_TO_ANALYZE}: ${error instanceof Error ? error.message : String(error)}`
            return ResponseDto.fail(errorMessage)
        }
    }
}
