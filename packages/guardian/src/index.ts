export * from "./domain"
export * from "./application"
export * from "./infrastructure"
export * from "./shared"

export { analyzeProject } from "./api"
export type {
    AnalyzeProjectRequest,
    AnalyzeProjectResponse,
    ArchitectureViolation,
    HardcodeViolation,
    CircularDependencyViolation,
    FrameworkLeakViolation,
    ProjectMetrics,
} from "./api"
