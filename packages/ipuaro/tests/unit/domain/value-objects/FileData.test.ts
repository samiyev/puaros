import { describe, it, expect } from "vitest"
import {
    createFileData,
    isFileDataEqual,
} from "../../../../src/domain/value-objects/FileData.js"

describe("FileData", () => {
    describe("createFileData", () => {
        it("should create FileData with all fields", () => {
            const lines = ["line1", "line2"]
            const hash = "abc123"
            const size = 100
            const lastModified = Date.now()

            const result = createFileData(lines, hash, size, lastModified)

            expect(result.lines).toEqual(lines)
            expect(result.hash).toBe(hash)
            expect(result.size).toBe(size)
            expect(result.lastModified).toBe(lastModified)
        })
    })

    describe("isFileDataEqual", () => {
        it("should return true for equal hashes", () => {
            const a = createFileData(["a"], "hash1", 1, 1)
            const b = createFileData(["b"], "hash1", 2, 2)

            expect(isFileDataEqual(a, b)).toBe(true)
        })

        it("should return false for different hashes", () => {
            const a = createFileData(["a"], "hash1", 1, 1)
            const b = createFileData(["a"], "hash2", 1, 1)

            expect(isFileDataEqual(a, b)).toBe(false)
        })
    })
})
