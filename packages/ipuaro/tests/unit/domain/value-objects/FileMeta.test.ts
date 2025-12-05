import { describe, it, expect } from "vitest"
import {
    calculateImpactScore,
    createFileMeta,
    isHubFile,
} from "../../../../src/domain/value-objects/FileMeta.js"

describe("FileMeta", () => {
    describe("createFileMeta", () => {
        it("should create FileMeta with defaults", () => {
            const meta = createFileMeta()

            expect(meta.complexity.loc).toBe(0)
            expect(meta.complexity.nesting).toBe(0)
            expect(meta.complexity.cyclomaticComplexity).toBe(1)
            expect(meta.complexity.score).toBe(0)
            expect(meta.dependencies).toEqual([])
            expect(meta.dependents).toEqual([])
            expect(meta.isHub).toBe(false)
            expect(meta.isEntryPoint).toBe(false)
            expect(meta.fileType).toBe("unknown")
            expect(meta.impactScore).toBe(0)
        })

        it("should merge partial values", () => {
            const meta = createFileMeta({
                isHub: true,
                fileType: "source",
                dependencies: ["dep1.ts"],
            })

            expect(meta.isHub).toBe(true)
            expect(meta.fileType).toBe("source")
            expect(meta.dependencies).toEqual(["dep1.ts"])
            expect(meta.dependents).toEqual([])
        })
    })

    describe("isHubFile", () => {
        it("should return true for >5 dependents", () => {
            expect(isHubFile(6)).toBe(true)
            expect(isHubFile(10)).toBe(true)
        })

        it("should return false for <=5 dependents", () => {
            expect(isHubFile(5)).toBe(false)
            expect(isHubFile(0)).toBe(false)
        })
    })

    describe("calculateImpactScore", () => {
        it("should return 0 for file with 0 dependents", () => {
            expect(calculateImpactScore(0, 10)).toBe(0)
        })

        it("should return 0 when totalFiles is 0", () => {
            expect(calculateImpactScore(5, 0)).toBe(0)
        })

        it("should return 0 when totalFiles is 1", () => {
            expect(calculateImpactScore(0, 1)).toBe(0)
        })

        it("should calculate correct percentage", () => {
            // 5 dependents out of 10 files (excluding itself = 9 possible)
            // 5/9 * 100 = 55.56 → rounded to 56
            expect(calculateImpactScore(5, 10)).toBe(56)
        })

        it("should return 100 when all other files depend on it", () => {
            // 9 dependents out of 10 files (9 possible dependents)
            expect(calculateImpactScore(9, 10)).toBe(100)
        })

        it("should cap at 100", () => {
            // Edge case: more dependents than possible (shouldn't happen normally)
            expect(calculateImpactScore(20, 10)).toBe(100)
        })

        it("should round the percentage", () => {
            // 1 dependent out of 3 files (2 possible)
            // 1/2 * 100 = 50
            expect(calculateImpactScore(1, 3)).toBe(50)
        })

        it("should calculate impact for small projects", () => {
            // 1 dependent out of 2 files (1 possible)
            expect(calculateImpactScore(1, 2)).toBe(100)
        })

        it("should calculate impact for larger projects", () => {
            // 50 dependents out of 100 files (99 possible)
            // 50/99 * 100 = 50.51 → rounded to 51
            expect(calculateImpactScore(50, 100)).toBe(51)
        })
    })
})
