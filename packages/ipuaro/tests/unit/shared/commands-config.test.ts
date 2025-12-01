/**
 * Tests for CommandsConfigSchema.
 */

import { describe, expect, it } from "vitest"
import { CommandsConfigSchema } from "../../../src/shared/constants/config.js"

describe("CommandsConfigSchema", () => {
    describe("default values", () => {
        it("should use defaults when empty object provided", () => {
            const result = CommandsConfigSchema.parse({})

            expect(result).toEqual({
                timeout: null,
            })
        })

        it("should use defaults via .default({})", () => {
            const result = CommandsConfigSchema.default({}).parse({})

            expect(result).toEqual({
                timeout: null,
            })
        })
    })

    describe("timeout", () => {
        it("should accept null (default)", () => {
            const result = CommandsConfigSchema.parse({ timeout: null })
            expect(result.timeout).toBe(null)
        })

        it("should accept positive integer", () => {
            const result = CommandsConfigSchema.parse({ timeout: 5000 })
            expect(result.timeout).toBe(5000)
        })

        it("should accept large timeout", () => {
            const result = CommandsConfigSchema.parse({ timeout: 600000 })
            expect(result.timeout).toBe(600000)
        })

        it("should accept 1", () => {
            const result = CommandsConfigSchema.parse({ timeout: 1 })
            expect(result.timeout).toBe(1)
        })

        it("should accept small timeout", () => {
            const result = CommandsConfigSchema.parse({ timeout: 100 })
            expect(result.timeout).toBe(100)
        })

        it("should reject zero", () => {
            expect(() => CommandsConfigSchema.parse({ timeout: 0 })).toThrow()
        })

        it("should reject negative number", () => {
            expect(() => CommandsConfigSchema.parse({ timeout: -5000 })).toThrow()
        })

        it("should reject float", () => {
            expect(() => CommandsConfigSchema.parse({ timeout: 5000.5 })).toThrow()
        })

        it("should reject string", () => {
            expect(() => CommandsConfigSchema.parse({ timeout: "5000" })).toThrow()
        })

        it("should reject boolean", () => {
            expect(() => CommandsConfigSchema.parse({ timeout: true })).toThrow()
        })

        it("should reject undefined (use null instead)", () => {
            const result = CommandsConfigSchema.parse({ timeout: undefined })
            expect(result.timeout).toBe(null)
        })
    })

    describe("partial config", () => {
        it("should use default null when timeout not provided", () => {
            const result = CommandsConfigSchema.parse({})

            expect(result).toEqual({
                timeout: null,
            })
        })

        it("should accept explicit null", () => {
            const result = CommandsConfigSchema.parse({
                timeout: null,
            })

            expect(result).toEqual({
                timeout: null,
            })
        })

        it("should accept explicit timeout value", () => {
            const result = CommandsConfigSchema.parse({
                timeout: 10000,
            })

            expect(result).toEqual({
                timeout: 10000,
            })
        })
    })

    describe("full config", () => {
        it("should accept valid config with null", () => {
            const config = {
                timeout: null,
            }

            const result = CommandsConfigSchema.parse(config)
            expect(result).toEqual(config)
        })

        it("should accept valid config with timeout", () => {
            const config = {
                timeout: 30000,
            }

            const result = CommandsConfigSchema.parse(config)
            expect(result).toEqual(config)
        })

        it("should accept default explicitly", () => {
            const config = {
                timeout: null,
            }

            const result = CommandsConfigSchema.parse(config)
            expect(result).toEqual(config)
        })
    })
})
