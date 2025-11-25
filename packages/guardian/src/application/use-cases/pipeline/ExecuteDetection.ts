import { IHardcodeDetector } from "../../../domain/services/IHardcodeDetector"
import { INamingConventionDetector } from "../../../domain/services/INamingConventionDetector"
import { IFrameworkLeakDetector } from "../../../domain/services/IFrameworkLeakDetector"
import { IEntityExposureDetector } from "../../../domain/services/IEntityExposureDetector"
import { IDependencyDirectionDetector } from "../../../domain/services/IDependencyDirectionDetector"
import { IRepositoryPatternDetector } from "../../../domain/services/RepositoryPatternDetectorService"
import { IAggregateBoundaryDetector } from "../../../domain/services/IAggregateBoundaryDetector"
import { ISecretDetector } from "../../../domain/services/ISecretDetector"
import { IAnemicModelDetector } from "../../../domain/services/IAnemicModelDetector"
import { SourceFile } from "../../../domain/entities/SourceFile"
import { DependencyGraph } from "../../../domain/entities/DependencyGraph"
import {
    LAYERS,
    REPOSITORY_VIOLATION_TYPES,
    RULES,
    SEVERITY_ORDER,
    type SeverityLevel,
    VIOLATION_SEVERITY_MAP,
} from "../../../shared/constants"
import type {
    AggregateBoundaryViolation,
    AnemicModelViolation,
    ArchitectureViolation,
    CircularDependencyViolation,
    DependencyDirectionViolation,
    EntityExposureViolation,
    FrameworkLeakViolation,
    HardcodeViolation,
    NamingConventionViolation,
    RepositoryPatternViolation,
    SecretViolation,
} from "../AnalyzeProject"

export interface DetectionRequest {
    sourceFiles: SourceFile[]
    dependencyGraph: DependencyGraph
}

export interface DetectionResult {
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
 * Pipeline step responsible for running all detectors
 */
export class ExecuteDetection {
    constructor(
        private readonly hardcodeDetector: IHardcodeDetector,
        private readonly namingConventionDetector: INamingConventionDetector,
        private readonly frameworkLeakDetector: IFrameworkLeakDetector,
        private readonly entityExposureDetector: IEntityExposureDetector,
        private readonly dependencyDirectionDetector: IDependencyDirectionDetector,
        private readonly repositoryPatternDetector: IRepositoryPatternDetector,
        private readonly aggregateBoundaryDetector: IAggregateBoundaryDetector,
        private readonly secretDetector: ISecretDetector,
        private readonly anemicModelDetector: IAnemicModelDetector,
    ) {}

    public async execute(request: DetectionRequest): Promise<DetectionResult> {
        const secretViolations = await this.detectSecrets(request.sourceFiles)

        return {
            violations: this.sortBySeverity(this.detectViolations(request.sourceFiles)),
            hardcodeViolations: this.sortBySeverity(this.detectHardcode(request.sourceFiles)),
            circularDependencyViolations: this.sortBySeverity(
                this.detectCircularDependencies(request.dependencyGraph),
            ),
            namingViolations: this.sortBySeverity(
                this.detectNamingConventions(request.sourceFiles),
            ),
            frameworkLeakViolations: this.sortBySeverity(
                this.detectFrameworkLeaks(request.sourceFiles),
            ),
            entityExposureViolations: this.sortBySeverity(
                this.detectEntityExposures(request.sourceFiles),
            ),
            dependencyDirectionViolations: this.sortBySeverity(
                this.detectDependencyDirections(request.sourceFiles),
            ),
            repositoryPatternViolations: this.sortBySeverity(
                this.detectRepositoryPatternViolations(request.sourceFiles),
            ),
            aggregateBoundaryViolations: this.sortBySeverity(
                this.detectAggregateBoundaryViolations(request.sourceFiles),
            ),
            secretViolations: this.sortBySeverity(secretViolations),
            anemicModelViolations: this.sortBySeverity(
                this.detectAnemicModels(request.sourceFiles),
            ),
        }
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

    private detectAggregateBoundaryViolations(
        sourceFiles: SourceFile[],
    ): AggregateBoundaryViolation[] {
        const violations: AggregateBoundaryViolation[] = []

        for (const file of sourceFiles) {
            const boundaryViolations = this.aggregateBoundaryDetector.detectViolations(
                file.content,
                file.path.relative,
                file.layer,
            )

            for (const violation of boundaryViolations) {
                violations.push({
                    rule: RULES.AGGREGATE_BOUNDARY,
                    fromAggregate: violation.fromAggregate,
                    toAggregate: violation.toAggregate,
                    entityName: violation.entityName,
                    importPath: violation.importPath,
                    file: file.path.relative,
                    line: violation.line,
                    message: violation.getMessage(),
                    suggestion: violation.getSuggestion(),
                    severity: VIOLATION_SEVERITY_MAP.AGGREGATE_BOUNDARY,
                })
            }
        }

        return violations
    }

    private async detectSecrets(sourceFiles: SourceFile[]): Promise<SecretViolation[]> {
        const violations: SecretViolation[] = []

        for (const file of sourceFiles) {
            const secretViolations = await this.secretDetector.detectAll(
                file.content,
                file.path.relative,
            )

            for (const secret of secretViolations) {
                violations.push({
                    rule: RULES.SECRET_EXPOSURE,
                    secretType: secret.secretType,
                    file: file.path.relative,
                    line: secret.line,
                    column: secret.column,
                    message: secret.getMessage(),
                    suggestion: secret.getSuggestion(),
                    severity: "critical",
                })
            }
        }

        return violations
    }

    private detectAnemicModels(sourceFiles: SourceFile[]): AnemicModelViolation[] {
        const violations: AnemicModelViolation[] = []

        for (const file of sourceFiles) {
            const anemicModels = this.anemicModelDetector.detectAnemicModels(
                file.content,
                file.path.relative,
                file.layer,
            )

            for (const anemicModel of anemicModels) {
                violations.push({
                    rule: RULES.ANEMIC_MODEL,
                    className: anemicModel.className,
                    file: file.path.relative,
                    layer: anemicModel.layer,
                    line: anemicModel.line,
                    methodCount: anemicModel.methodCount,
                    propertyCount: anemicModel.propertyCount,
                    hasOnlyGettersSetters: anemicModel.hasOnlyGettersSetters,
                    hasPublicSetters: anemicModel.hasPublicSetters,
                    message: anemicModel.getMessage(),
                    suggestion: anemicModel.getSuggestion(),
                    severity: VIOLATION_SEVERITY_MAP.ANEMIC_MODEL,
                })
            }
        }

        return violations
    }

    private sortBySeverity<T extends { severity: SeverityLevel }>(violations: T[]): T[] {
        return violations.sort((a, b) => {
            return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
        })
    }
}
