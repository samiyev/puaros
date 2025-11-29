import { describe, it, expect } from "vitest"
import {
    estimateTokens,
    estimateTokensForLines,
    truncateToTokens,
    formatTokenCount,
} from "../../../../src/shared/utils/tokens.js"

describe("tokens utils", () => {
    describe("estimateTokens", () => {
        it("should estimate ~4 chars per token", () => {
            expect(estimateTokens("")).toBe(0)
            expect(estimateTokens("test")).toBe(1)
            expect(estimateTokens("12345678")).toBe(2)
        })

        it("should round up", () => {
            expect(estimateTokens("12345")).toBe(2)
        })
    })

    describe("estimateTokensForLines", () => {
        it("should estimate tokens for array of lines", () => {
            const lines = ["line1", "line2"]
            const expected = estimateTokens("line1\nline2")

            expect(estimateTokensForLines(lines)).toBe(expected)
        })

        it("should handle empty array", () => {
            expect(estimateTokensForLines([])).toBe(0)
        })
    })

    describe("truncateToTokens", () => {
        it("should not truncate short text", () => {
            const text = "short"
            expect(truncateToTokens(text, 10)).toBe(text)
        })

        it("should truncate long text", () => {
            const text = "a".repeat(100)
            const result = truncateToTokens(text, 10)

            expect(result).toBe("a".repeat(40) + "...")
        })
    })

    describe("formatTokenCount", () => {
        it("should format small numbers as-is", () => {
            expect(formatTokenCount(500)).toBe("500")
            expect(formatTokenCount(999)).toBe("999")
        })

        it("should format thousands with k suffix", () => {
            expect(formatTokenCount(1000)).toBe("1.0k")
            expect(formatTokenCount(1500)).toBe("1.5k")
            expect(formatTokenCount(12345)).toBe("12.3k")
        })
    })
})
