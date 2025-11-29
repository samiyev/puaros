import { describe, it, expect } from "vitest"
import { createFileMeta, isHubFile } from "../../../../src/domain/value-objects/FileMeta.js"

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
})
