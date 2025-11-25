import {
    AnalyzeProject,
    AnalyzeProjectRequest,
    AnalyzeProjectResponse,
} from "./application/use-cases/AnalyzeProject"
import { IFileScanner } from "./domain/services/IFileScanner"
import { ICodeParser } from "./domain/services/ICodeParser"
import { IHardcodeDetector } from "./domain/services/IHardcodeDetector"
import { INamingConventionDetector } from "./domain/services/INamingConventionDetector"
import { IFrameworkLeakDetector } from "./domain/services/IFrameworkLeakDetector"
import { IEntityExposureDetector } from "./domain/services/IEntityExposureDetector"
import { IDependencyDirectionDetector } from "./domain/services/IDependencyDirectionDetector"
import { IRepositoryPatternDetector } from "./domain/services/RepositoryPatternDetectorService"
import { IAggregateBoundaryDetector } from "./domain/services/IAggregateBoundaryDetector"
import { ISecretDetector } from "./domain/services/ISecretDetector"
import { IAnemicModelDetector } from "./domain/services/IAnemicModelDetector"
import { FileScanner } from "./infrastructure/scanners/FileScanner"
import { CodeParser } from "./infrastructure/parsers/CodeParser"
import { HardcodeDetector } from "./infrastructure/analyzers/HardcodeDetector"
import { NamingConventionDetector } from "./infrastructure/analyzers/NamingConventionDetector"
import { FrameworkLeakDetector } from "./infrastructure/analyzers/FrameworkLeakDetector"
import { EntityExposureDetector } from "./infrastructure/analyzers/EntityExposureDetector"
import { DependencyDirectionDetector } from "./infrastructure/analyzers/DependencyDirectionDetector"
import { RepositoryPatternDetector } from "./infrastructure/analyzers/RepositoryPatternDetector"
import { AggregateBoundaryDetector } from "./infrastructure/analyzers/AggregateBoundaryDetector"
import { SecretDetector } from "./infrastructure/analyzers/SecretDetector"
import { AnemicModelDetector } from "./infrastructure/analyzers/AnemicModelDetector"
import { ERROR_MESSAGES } from "./shared/constants"

/**
 * Analyzes a TypeScript/JavaScript project for code quality issues
 *
 * Detects hardcoded values (magic numbers and strings) and validates
 * Clean Architecture layer dependencies.
 *
 * @param options - Configuration for the analysis
 * @param options.rootDir - Root directory to analyze
 * @param options.include - File patterns to include (optional)
 * @param options.exclude - Directories to exclude (optional, defaults to node_modules, dist, build)
 *
 * @returns Analysis results including violations, metrics, and dependency graph
 *
 * @throws {Error} If analysis fails or project cannot be scanned
 *
 * @example
 * ```typescript
 * import { analyzeProject } from '@puaros/guardian'
 *
 * const result = await analyzeProject({
 *     rootDir: './src',
 *     exclude: ['node_modules', 'dist', 'test']
 * })
 *
 * console.log(`Found ${result.hardcodeViolations.length} hardcoded values`)
 * console.log(`Found ${result.violations.length} architecture violations`)
 * console.log(`Analyzed ${result.metrics.totalFiles} files`)
 * ```
 *
 * @example
 * ```typescript
 * // Check for hardcoded values only
 * const result = await analyzeProject({ rootDir: './src' })
 *
 * result.hardcodeViolations.forEach(violation => {
 *     console.log(`${violation.file}:${violation.line}`)
 *     console.log(`  Type: ${violation.type}`)
 *     console.log(`  Value: ${violation.value}`)
 *     console.log(`  Suggestion: ${violation.suggestion.constantName}`)
 *     console.log(`  Location: ${violation.suggestion.location}`)
 * })
 * ```
 */
export async function analyzeProject(
    options: AnalyzeProjectRequest,
): Promise<AnalyzeProjectResponse> {
    const fileScanner: IFileScanner = new FileScanner()
    const codeParser: ICodeParser = new CodeParser()
    const hardcodeDetector: IHardcodeDetector = new HardcodeDetector()
    const namingConventionDetector: INamingConventionDetector = new NamingConventionDetector()
    const frameworkLeakDetector: IFrameworkLeakDetector = new FrameworkLeakDetector()
    const entityExposureDetector: IEntityExposureDetector = new EntityExposureDetector()
    const dependencyDirectionDetector: IDependencyDirectionDetector =
        new DependencyDirectionDetector()
    const repositoryPatternDetector: IRepositoryPatternDetector = new RepositoryPatternDetector()
    const aggregateBoundaryDetector: IAggregateBoundaryDetector = new AggregateBoundaryDetector()
    const secretDetector: ISecretDetector = new SecretDetector()
    const anemicModelDetector: IAnemicModelDetector = new AnemicModelDetector()
    const useCase = new AnalyzeProject(
        fileScanner,
        codeParser,
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

    const result = await useCase.execute(options)

    if (!result.success || !result.data) {
        throw new Error(result.error ?? ERROR_MESSAGES.FAILED_TO_ANALYZE)
    }

    return result.data
}

export type {
    AnalyzeProjectRequest,
    AnalyzeProjectResponse,
    ArchitectureViolation,
    HardcodeViolation,
    CircularDependencyViolation,
    NamingConventionViolation,
    FrameworkLeakViolation,
    EntityExposureViolation,
    DependencyDirectionViolation,
    RepositoryPatternViolation,
    AggregateBoundaryViolation,
    AnemicModelViolation,
    ProjectMetrics,
} from "./application/use-cases/AnalyzeProject"
