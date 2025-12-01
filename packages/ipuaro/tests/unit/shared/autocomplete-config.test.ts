/**
 * Tests for AutocompleteConfigSchema.
 */

import { describe, expect, it } from "vitest"
import { AutocompleteConfigSchema } from "../../../src/shared/constants/config.js"

describe("AutocompleteConfigSchema", () => {
    describe("default values", () => {
        it("should use defaults when empty object provided", () => {
            const result = AutocompleteConfigSchema.parse({})

            expect(result).toEqual({
                enabled: true,
                source: "redis-index",
                maxSuggestions: 10,
            })
        })

        it("should use defaults via .default({})", () => {
            const result = AutocompleteConfigSchema.default({}).parse({})

            expect(result).toEqual({
                enabled: true,
                source: "redis-index",
                maxSuggestions: 10,
            })
        })
    })

    describe("enabled", () => {
        it("should accept true", () => {
            const result = AutocompleteConfigSchema.parse({ enabled: true })
            expect(result.enabled).toBe(true)
        })

        it("should accept false", () => {
            const result = AutocompleteConfigSchema.parse({ enabled: false })
            expect(result.enabled).toBe(false)
        })

        it("should reject non-boolean", () => {
            expect(() => AutocompleteConfigSchema.parse({ enabled: "true" })).toThrow()
        })

        it("should reject number", () => {
            expect(() => AutocompleteConfigSchema.parse({ enabled: 1 })).toThrow()
        })
    })

    describe("source", () => {
        it("should accept redis-index", () => {
            const result = AutocompleteConfigSchema.parse({ source: "redis-index" })
            expect(result.source).toBe("redis-index")
        })

        it("should accept filesystem", () => {
            const result = AutocompleteConfigSchema.parse({ source: "filesystem" })
            expect(result.source).toBe("filesystem")
        })

        it("should accept both", () => {
            const result = AutocompleteConfigSchema.parse({ source: "both" })
            expect(result.source).toBe("both")
        })

        it("should use default redis-index", () => {
            const result = AutocompleteConfigSchema.parse({})
            expect(result.source).toBe("redis-index")
        })

        it("should reject invalid source", () => {
            expect(() => AutocompleteConfigSchema.parse({ source: "invalid" })).toThrow()
        })

        it("should reject non-string", () => {
            expect(() => AutocompleteConfigSchema.parse({ source: 123 })).toThrow()
        })
    })

    describe("maxSuggestions", () => {
        it("should accept valid positive integer", () => {
            const result = AutocompleteConfigSchema.parse({ maxSuggestions: 5 })
            expect(result.maxSuggestions).toBe(5)
        })

        it("should accept default value", () => {
            const result = AutocompleteConfigSchema.parse({ maxSuggestions: 10 })
            expect(result.maxSuggestions).toBe(10)
        })

        it("should accept large value", () => {
            const result = AutocompleteConfigSchema.parse({ maxSuggestions: 100 })
            expect(result.maxSuggestions).toBe(100)
        })

        it("should accept 1", () => {
            const result = AutocompleteConfigSchema.parse({ maxSuggestions: 1 })
            expect(result.maxSuggestions).toBe(1)
        })

        it("should reject zero", () => {
            expect(() => AutocompleteConfigSchema.parse({ maxSuggestions: 0 })).toThrow()
        })

        it("should reject negative number", () => {
            expect(() => AutocompleteConfigSchema.parse({ maxSuggestions: -5 })).toThrow()
        })

        it("should reject float", () => {
            expect(() => AutocompleteConfigSchema.parse({ maxSuggestions: 10.5 })).toThrow()
        })

        it("should reject non-number", () => {
            expect(() => AutocompleteConfigSchema.parse({ maxSuggestions: "10" })).toThrow()
        })
    })

    describe("partial config", () => {
        it("should merge partial config with defaults (enabled only)", () => {
            const result = AutocompleteConfigSchema.parse({
                enabled: false,
            })

            expect(result).toEqual({
                enabled: false,
                source: "redis-index",
                maxSuggestions: 10,
            })
        })

        it("should merge partial config with defaults (source only)", () => {
            const result = AutocompleteConfigSchema.parse({
                source: "filesystem",
            })

            expect(result).toEqual({
                enabled: true,
                source: "filesystem",
                maxSuggestions: 10,
            })
        })

        it("should merge partial config with defaults (maxSuggestions only)", () => {
            const result = AutocompleteConfigSchema.parse({
                maxSuggestions: 20,
            })

            expect(result).toEqual({
                enabled: true,
                source: "redis-index",
                maxSuggestions: 20,
            })
        })

        it("should merge multiple partial fields", () => {
            const result = AutocompleteConfigSchema.parse({
                enabled: false,
                maxSuggestions: 5,
            })

            expect(result).toEqual({
                enabled: false,
                source: "redis-index",
                maxSuggestions: 5,
            })
        })
    })

    describe("full config", () => {
        it("should accept valid full config", () => {
            const config = {
                enabled: false,
                source: "both" as const,
                maxSuggestions: 15,
            }

            const result = AutocompleteConfigSchema.parse(config)
            expect(result).toEqual(config)
        })

        it("should accept all defaults explicitly", () => {
            const config = {
                enabled: true,
                source: "redis-index" as const,
                maxSuggestions: 10,
            }

            const result = AutocompleteConfigSchema.parse(config)
            expect(result).toEqual(config)
        })

        it("should accept filesystem as source", () => {
            const config = {
                enabled: true,
                source: "filesystem" as const,
                maxSuggestions: 20,
            }

            const result = AutocompleteConfigSchema.parse(config)
            expect(result).toEqual(config)
        })
    })
})
