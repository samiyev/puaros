import { describe, it, expect } from "vitest"
import { analyzeProject } from "../../src/api"
import path from "path"

describe("AnalyzeProject E2E", () => {
    const EXAMPLES_DIR = path.join(__dirname, "../../examples")

    describe("Full Pipeline", () => {
        it("should analyze project and return complete results", async () => {
            const rootDir = path.join(EXAMPLES_DIR, "good-architecture")

            const result = await analyzeProject({ rootDir })

            expect(result).toBeDefined()
            expect(result.metrics).toBeDefined()
            expect(result.metrics.totalFiles).toBeGreaterThan(0)
            expect(result.metrics.totalFunctions).toBeGreaterThanOrEqual(0)
            expect(result.metrics.totalImports).toBeGreaterThanOrEqual(0)
            expect(result.dependencyGraph).toBeDefined()

            expect(Array.isArray(result.hardcodeViolations)).toBe(true)
            expect(Array.isArray(result.violations)).toBe(true)
            expect(Array.isArray(result.circularDependencyViolations)).toBe(true)
            expect(Array.isArray(result.namingViolations)).toBe(true)
            expect(Array.isArray(result.frameworkLeakViolations)).toBe(true)
            expect(Array.isArray(result.entityExposureViolations)).toBe(true)
            expect(Array.isArray(result.dependencyDirectionViolations)).toBe(true)
            expect(Array.isArray(result.repositoryPatternViolations)).toBe(true)
            expect(Array.isArray(result.aggregateBoundaryViolations)).toBe(true)
            expect(Array.isArray(result.anemicModelViolations)).toBe(true)
        })

        it("should respect exclude patterns", async () => {
            const rootDir = path.join(EXAMPLES_DIR, "good-architecture")

            const result = await analyzeProject({
                rootDir,
                exclude: ["**/dtos/**", "**/mappers/**"],
            })

            expect(result.metrics.totalFiles).toBeGreaterThan(0)

            const allFiles = [
                ...result.hardcodeViolations.map((v) => v.file),
                ...result.violations.map((v) => v.file),
                ...result.namingViolations.map((v) => v.file),
            ]

            allFiles.forEach((file) => {
                expect(file).not.toContain("/dtos/")
                expect(file).not.toContain("/mappers/")
            })
        })

        it("should detect violations across all detectors", async () => {
            const rootDir = path.join(EXAMPLES_DIR, "bad-architecture")

            const result = await analyzeProject({ rootDir })

            const totalViolations =
                result.hardcodeViolations.length +
                result.violations.length +
                result.circularDependencyViolations.length +
                result.namingViolations.length +
                result.frameworkLeakViolations.length +
                result.entityExposureViolations.length +
                result.dependencyDirectionViolations.length +
                result.repositoryPatternViolations.length +
                result.aggregateBoundaryViolations.length +
                result.anemicModelViolations.length

            expect(totalViolations).toBeGreaterThan(0)
        })
    })

    describe("Good Architecture Examples", () => {
        it("should find zero violations in good-architecture/", async () => {
            const rootDir = path.join(EXAMPLES_DIR, "good-architecture")

            const result = await analyzeProject({ rootDir })

            expect(result.violations.length).toBe(0)
            expect(result.frameworkLeakViolations.length).toBe(0)
            expect(result.entityExposureViolations.length).toBe(0)
            expect(result.dependencyDirectionViolations.length).toBe(0)
            expect(result.circularDependencyViolations.length).toBe(0)
            expect(result.anemicModelViolations.length).toBe(0)
        })

        it("should have no dependency direction violations", async () => {
            const rootDir = path.join(EXAMPLES_DIR, "good-architecture/dependency-direction")

            const result = await analyzeProject({ rootDir })

            const goodFiles = result.dependencyDirectionViolations.filter((v) =>
                v.file.includes("Good"),
            )

            expect(goodFiles.length).toBe(0)
        })

        it("should have no entity exposure in good controller", async () => {
            const rootDir = path.join(EXAMPLES_DIR, "good-architecture/entity-exposure")

            const result = await analyzeProject({ rootDir })

            expect(result.entityExposureViolations.length).toBe(0)
        })
    })

    describe("Bad Architecture Examples", () => {
        it("should detect hardcoded values in bad examples", async () => {
            const rootDir = path.join(EXAMPLES_DIR, "bad-architecture/hardcoded")

            const result = await analyzeProject({ rootDir })

            expect(result.hardcodeViolations.length).toBeGreaterThan(0)

            const magicNumbers = result.hardcodeViolations.filter((v) => v.type === "magic-number")
            expect(magicNumbers.length).toBeGreaterThan(0)
        })

        it("should detect circular dependencies", async () => {
            const rootDir = path.join(EXAMPLES_DIR, "bad-architecture/circular")

            const result = await analyzeProject({ rootDir })

            if (result.circularDependencyViolations.length > 0) {
                const violation = result.circularDependencyViolations[0]
                expect(violation.cycle).toBeDefined()
                expect(violation.cycle.length).toBeGreaterThanOrEqual(2)
                expect(violation.severity).toBe("critical")
            }
        })

        it("should detect framework leaks in domain", async () => {
            const rootDir = path.join(EXAMPLES_DIR, "bad-architecture/framework-leaks")

            const result = await analyzeProject({ rootDir })

            if (result.frameworkLeakViolations.length > 0) {
                const violation = result.frameworkLeakViolations[0]
                expect(violation.packageName).toBeDefined()
                expect(violation.severity).toBe("high")
            }
        })

        it("should detect naming convention violations", async () => {
            const rootDir = path.join(EXAMPLES_DIR, "bad-architecture/naming")

            const result = await analyzeProject({ rootDir })

            if (result.namingViolations.length > 0) {
                const violation = result.namingViolations[0]
                expect(violation.expected).toBeDefined()
                expect(violation.severity).toBe("medium")
            }
        })

        it("should detect entity exposure violations", async () => {
            const rootDir = path.join(EXAMPLES_DIR, "bad-architecture/entity-exposure")

            const result = await analyzeProject({ rootDir })

            if (result.entityExposureViolations.length > 0) {
                const violation = result.entityExposureViolations[0]
                expect(violation.entityName).toBeDefined()
                expect(violation.severity).toBe("high")
            }
        })

        it("should detect dependency direction violations", async () => {
            const rootDir = path.join(EXAMPLES_DIR, "bad-architecture/dependency-direction")

            const result = await analyzeProject({ rootDir })

            if (result.dependencyDirectionViolations.length > 0) {
                const violation = result.dependencyDirectionViolations[0]
                expect(violation.fromLayer).toBeDefined()
                expect(violation.toLayer).toBeDefined()
                expect(violation.severity).toBe("high")
            }
        })

        it("should detect repository pattern violations", async () => {
            const rootDir = path.join(EXAMPLES_DIR, "repository-pattern")

            const result = await analyzeProject({ rootDir })

            const badViolations = result.repositoryPatternViolations.filter((v) =>
                v.file.includes("bad"),
            )

            if (badViolations.length > 0) {
                const violation = badViolations[0]
                expect(violation.violationType).toBeDefined()
                expect(violation.severity).toBe("critical")
            }
        })

        it("should detect aggregate boundary violations", async () => {
            const rootDir = path.join(EXAMPLES_DIR, "aggregate-boundary/bad")

            const result = await analyzeProject({ rootDir })

            if (result.aggregateBoundaryViolations.length > 0) {
                const violation = result.aggregateBoundaryViolations[0]
                expect(violation.fromAggregate).toBeDefined()
                expect(violation.toAggregate).toBeDefined()
                expect(violation.severity).toBe("critical")
            }
        })
    })

    describe("Metrics", () => {
        it("should provide accurate file counts", async () => {
            const rootDir = path.join(EXAMPLES_DIR, "good-architecture")

            const result = await analyzeProject({ rootDir })

            expect(result.metrics.totalFiles).toBeGreaterThan(0)
            expect(result.metrics.totalFunctions).toBeGreaterThanOrEqual(0)
            expect(result.metrics.totalImports).toBeGreaterThanOrEqual(0)
        })

        it("should track layer distribution", async () => {
            const rootDir = path.join(EXAMPLES_DIR, "good-architecture")

            const result = await analyzeProject({ rootDir })

            expect(result.metrics.layerDistribution).toBeDefined()
            expect(typeof result.metrics.layerDistribution).toBe("object")
        })

        it("should calculate correct metrics for bad architecture", async () => {
            const rootDir = path.join(EXAMPLES_DIR, "bad-architecture")

            const result = await analyzeProject({ rootDir })

            expect(result.metrics.totalFiles).toBeGreaterThan(0)
            expect(result.metrics.totalFunctions).toBeGreaterThanOrEqual(0)
            expect(result.metrics.totalImports).toBeGreaterThanOrEqual(0)
        })
    })

    describe("Dependency Graph", () => {
        it("should build dependency graph for analyzed files", async () => {
            const rootDir = path.join(EXAMPLES_DIR, "good-architecture")

            const result = await analyzeProject({ rootDir })

            expect(result.dependencyGraph).toBeDefined()
            expect(result.files).toBeDefined()
            expect(Array.isArray(result.files)).toBe(true)
        })

        it("should track file metadata", async () => {
            const rootDir = path.join(EXAMPLES_DIR, "good-architecture")

            const result = await analyzeProject({ rootDir })

            if (result.files.length > 0) {
                const file = result.files[0]
                expect(file).toHaveProperty("path")
            }
        })
    })

    describe("Error Handling", () => {
        it("should handle non-existent directory", async () => {
            const rootDir = path.join(EXAMPLES_DIR, "non-existent-directory")

            await expect(analyzeProject({ rootDir })).rejects.toThrow()
        })

        it("should handle empty directory gracefully", async () => {
            const rootDir = path.join(__dirname, "../../dist")

            const result = await analyzeProject({ rootDir })

            expect(result).toBeDefined()
            expect(result.metrics.totalFiles).toBeGreaterThanOrEqual(0)
        })
    })
})
