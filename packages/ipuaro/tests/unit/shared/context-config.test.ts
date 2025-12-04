/**
 * Tests for ContextConfigSchema.
 */

import { describe, expect, it } from "vitest"
import { ContextConfigSchema } from "../../../src/shared/constants/config.js"

describe("ContextConfigSchema", () => {
    describe("default values", () => {
        it("should use defaults when empty object provided", () => {
            const result = ContextConfigSchema.parse({})

            expect(result).toEqual({
                systemPromptTokens: 2000,
                maxContextUsage: 0.8,
                autoCompressAt: 0.8,
                compressionMethod: "llm-summary",
                includeSignatures: true,
            })
        })

        it("should use defaults via .default({})", () => {
            const result = ContextConfigSchema.default({}).parse({})

            expect(result).toEqual({
                systemPromptTokens: 2000,
                maxContextUsage: 0.8,
                autoCompressAt: 0.8,
                compressionMethod: "llm-summary",
                includeSignatures: true,
            })
        })
    })

    describe("systemPromptTokens", () => {
        it("should accept valid positive integer", () => {
            const result = ContextConfigSchema.parse({ systemPromptTokens: 1500 })
            expect(result.systemPromptTokens).toBe(1500)
        })

        it("should accept default value", () => {
            const result = ContextConfigSchema.parse({ systemPromptTokens: 2000 })
            expect(result.systemPromptTokens).toBe(2000)
        })

        it("should accept large value", () => {
            const result = ContextConfigSchema.parse({ systemPromptTokens: 5000 })
            expect(result.systemPromptTokens).toBe(5000)
        })

        it("should reject zero", () => {
            expect(() => ContextConfigSchema.parse({ systemPromptTokens: 0 })).toThrow()
        })

        it("should reject negative number", () => {
            expect(() => ContextConfigSchema.parse({ systemPromptTokens: -100 })).toThrow()
        })

        it("should reject float", () => {
            expect(() => ContextConfigSchema.parse({ systemPromptTokens: 1500.5 })).toThrow()
        })

        it("should reject non-number", () => {
            expect(() => ContextConfigSchema.parse({ systemPromptTokens: "2000" })).toThrow()
        })
    })

    describe("maxContextUsage", () => {
        it("should accept valid ratio", () => {
            const result = ContextConfigSchema.parse({ maxContextUsage: 0.7 })
            expect(result.maxContextUsage).toBe(0.7)
        })

        it("should accept default value", () => {
            const result = ContextConfigSchema.parse({ maxContextUsage: 0.8 })
            expect(result.maxContextUsage).toBe(0.8)
        })

        it("should accept minimum value (0)", () => {
            const result = ContextConfigSchema.parse({ maxContextUsage: 0 })
            expect(result.maxContextUsage).toBe(0)
        })

        it("should accept maximum value (1)", () => {
            const result = ContextConfigSchema.parse({ maxContextUsage: 1 })
            expect(result.maxContextUsage).toBe(1)
        })

        it("should reject value above 1", () => {
            expect(() => ContextConfigSchema.parse({ maxContextUsage: 1.1 })).toThrow()
        })

        it("should reject negative value", () => {
            expect(() => ContextConfigSchema.parse({ maxContextUsage: -0.1 })).toThrow()
        })

        it("should reject non-number", () => {
            expect(() => ContextConfigSchema.parse({ maxContextUsage: "0.8" })).toThrow()
        })
    })

    describe("autoCompressAt", () => {
        it("should accept valid ratio", () => {
            const result = ContextConfigSchema.parse({ autoCompressAt: 0.75 })
            expect(result.autoCompressAt).toBe(0.75)
        })

        it("should accept default value", () => {
            const result = ContextConfigSchema.parse({ autoCompressAt: 0.8 })
            expect(result.autoCompressAt).toBe(0.8)
        })

        it("should accept minimum value (0)", () => {
            const result = ContextConfigSchema.parse({ autoCompressAt: 0 })
            expect(result.autoCompressAt).toBe(0)
        })

        it("should accept maximum value (1)", () => {
            const result = ContextConfigSchema.parse({ autoCompressAt: 1 })
            expect(result.autoCompressAt).toBe(1)
        })

        it("should reject value above 1", () => {
            expect(() => ContextConfigSchema.parse({ autoCompressAt: 1.5 })).toThrow()
        })

        it("should reject negative value", () => {
            expect(() => ContextConfigSchema.parse({ autoCompressAt: -0.5 })).toThrow()
        })

        it("should reject non-number", () => {
            expect(() => ContextConfigSchema.parse({ autoCompressAt: "0.8" })).toThrow()
        })
    })

    describe("compressionMethod", () => {
        it("should accept llm-summary", () => {
            const result = ContextConfigSchema.parse({ compressionMethod: "llm-summary" })
            expect(result.compressionMethod).toBe("llm-summary")
        })

        it("should accept truncate", () => {
            const result = ContextConfigSchema.parse({ compressionMethod: "truncate" })
            expect(result.compressionMethod).toBe("truncate")
        })

        it("should reject invalid method", () => {
            expect(() => ContextConfigSchema.parse({ compressionMethod: "invalid" })).toThrow()
        })

        it("should reject non-string", () => {
            expect(() => ContextConfigSchema.parse({ compressionMethod: 123 })).toThrow()
        })
    })

    describe("partial config", () => {
        it("should merge partial config with defaults (systemPromptTokens)", () => {
            const result = ContextConfigSchema.parse({
                systemPromptTokens: 3000,
            })

            expect(result).toEqual({
                systemPromptTokens: 3000,
                maxContextUsage: 0.8,
                autoCompressAt: 0.8,
                compressionMethod: "llm-summary",
                includeSignatures: true,
            })
        })

        it("should merge partial config with defaults (autoCompressAt)", () => {
            const result = ContextConfigSchema.parse({
                autoCompressAt: 0.9,
            })

            expect(result).toEqual({
                systemPromptTokens: 2000,
                maxContextUsage: 0.8,
                autoCompressAt: 0.9,
                compressionMethod: "llm-summary",
                includeSignatures: true,
            })
        })

        it("should merge multiple partial fields", () => {
            const result = ContextConfigSchema.parse({
                maxContextUsage: 0.7,
                compressionMethod: "truncate",
            })

            expect(result).toEqual({
                systemPromptTokens: 2000,
                maxContextUsage: 0.7,
                autoCompressAt: 0.8,
                compressionMethod: "truncate",
                includeSignatures: true,
            })
        })
    })

    describe("full config", () => {
        it("should accept valid full config", () => {
            const config = {
                systemPromptTokens: 3000,
                maxContextUsage: 0.9,
                autoCompressAt: 0.85,
                compressionMethod: "truncate" as const,
                includeSignatures: false,
            }

            const result = ContextConfigSchema.parse(config)
            expect(result).toEqual(config)
        })

        it("should accept all defaults explicitly", () => {
            const config = {
                systemPromptTokens: 2000,
                maxContextUsage: 0.8,
                autoCompressAt: 0.8,
                compressionMethod: "llm-summary" as const,
                includeSignatures: true,
            }

            const result = ContextConfigSchema.parse(config)
            expect(result).toEqual(config)
        })
    })

    describe("includeSignatures", () => {
        it("should accept true", () => {
            const result = ContextConfigSchema.parse({ includeSignatures: true })
            expect(result.includeSignatures).toBe(true)
        })

        it("should accept false", () => {
            const result = ContextConfigSchema.parse({ includeSignatures: false })
            expect(result.includeSignatures).toBe(false)
        })

        it("should default to true", () => {
            const result = ContextConfigSchema.parse({})
            expect(result.includeSignatures).toBe(true)
        })

        it("should reject non-boolean", () => {
            expect(() => ContextConfigSchema.parse({ includeSignatures: "true" })).toThrow()
        })

        it("should reject number", () => {
            expect(() => ContextConfigSchema.parse({ includeSignatures: 1 })).toThrow()
        })
    })
})
