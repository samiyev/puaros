import { SourceFile } from "../../../domain/entities/SourceFile"
import { DependencyGraph } from "../../../domain/entities/DependencyGraph"
import type {
    AggregateBoundaryViolation,
    AnalyzeProjectResponse,
    AnemicModelViolation,
    ArchitectureViolation,
    CircularDependencyViolation,
    DependencyDirectionViolation,
    EntityExposureViolation,
    FrameworkLeakViolation,
    HardcodeViolation,
    NamingConventionViolation,
    ProjectMetrics,
    RepositoryPatternViolation,
    SecretViolation,
} from "../AnalyzeProject"

export interface AggregationRequest {
    sourceFiles: SourceFile[]
    dependencyGraph: DependencyGraph
    totalFunctions: number
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
}

/**
 * Pipeline step responsible for building final response DTO
 */
export class AggregateResults {
    public execute(request: AggregationRequest): AnalyzeProjectResponse {
        const metrics = this.calculateMetrics(
            request.sourceFiles,
            request.totalFunctions,
            request.dependencyGraph,
        )

        return {
            files: request.sourceFiles,
            dependencyGraph: request.dependencyGraph,
            violations: request.violations,
            hardcodeViolations: request.hardcodeViolations,
            circularDependencyViolations: request.circularDependencyViolations,
            namingViolations: request.namingViolations,
            frameworkLeakViolations: request.frameworkLeakViolations,
            entityExposureViolations: request.entityExposureViolations,
            dependencyDirectionViolations: request.dependencyDirectionViolations,
            repositoryPatternViolations: request.repositoryPatternViolations,
            aggregateBoundaryViolations: request.aggregateBoundaryViolations,
            secretViolations: request.secretViolations,
            anemicModelViolations: request.anemicModelViolations,
            metrics,
        }
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
