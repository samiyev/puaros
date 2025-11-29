import { describe, it, expect } from "vitest"
import { md5, hashLines, shortHash } from "../../../../src/shared/utils/hash.js"

describe("hash utils", () => {
    describe("md5", () => {
        it("should return consistent hash for same input", () => {
            const hash1 = md5("hello")
            const hash2 = md5("hello")

            expect(hash1).toBe(hash2)
        })

        it("should return different hash for different input", () => {
            const hash1 = md5("hello")
            const hash2 = md5("world")

            expect(hash1).not.toBe(hash2)
        })

        it("should return 32 character hex string", () => {
            const hash = md5("test")

            expect(hash).toHaveLength(32)
            expect(hash).toMatch(/^[a-f0-9]+$/)
        })
    })

    describe("hashLines", () => {
        it("should hash joined lines", () => {
            const lines = ["line1", "line2", "line3"]
            const hash = hashLines(lines)

            expect(hash).toBe(md5("line1\nline2\nline3"))
        })

        it("should handle empty array", () => {
            const hash = hashLines([])

            expect(hash).toBe(md5(""))
        })
    })

    describe("shortHash", () => {
        it("should return truncated hash", () => {
            const hash = shortHash("test")

            expect(hash).toHaveLength(8)
        })

        it("should accept custom length", () => {
            const hash = shortHash("test", 12)

            expect(hash).toHaveLength(12)
        })
    })
})
