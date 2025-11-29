import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
    loadConfig,
    validateConfig,
    getConfigErrors,
} from "../../../../src/shared/config/loader.js"
import { DEFAULT_CONFIG } from "../../../../src/shared/constants/config.js"
import * as fs from "node:fs"

vi.mock("node:fs")

describe("config loader", () => {
    beforeEach(() => {
        vi.resetAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe("loadConfig", () => {
        it("should return default config when no files exist", () => {
            vi.mocked(fs.existsSync).mockReturnValue(false)

            const config = loadConfig("/project")

            expect(config).toEqual(DEFAULT_CONFIG)
        })

        it("should merge project config with defaults", () => {
            vi.mocked(fs.existsSync).mockImplementation((path) => {
                return path === "/project/.ipuaro.json"
            })
            vi.mocked(fs.readFileSync).mockReturnValue(
                JSON.stringify({ llm: { model: "custom-model" } }),
            )

            const config = loadConfig("/project")

            expect(config.llm.model).toBe("custom-model")
            expect(config.redis.host).toBe("localhost")
        })

        it("should handle invalid JSON gracefully", () => {
            vi.mocked(fs.existsSync).mockReturnValue(true)
            vi.mocked(fs.readFileSync).mockReturnValue("invalid json")

            const config = loadConfig("/project")

            expect(config).toEqual(DEFAULT_CONFIG)
        })
    })

    describe("validateConfig", () => {
        it("should return true for valid config", () => {
            expect(validateConfig(DEFAULT_CONFIG)).toBe(true)
        })

        it("should return true for partial valid config", () => {
            expect(validateConfig({ redis: { host: "redis.local" } })).toBe(true)
        })

        it("should return false for invalid config", () => {
            expect(validateConfig({ redis: { port: "not a number" } })).toBe(false)
        })
    })

    describe("getConfigErrors", () => {
        it("should return empty array for valid config", () => {
            const errors = getConfigErrors(DEFAULT_CONFIG)

            expect(errors).toHaveLength(0)
        })

        it("should return errors for invalid config", () => {
            const errors = getConfigErrors({
                redis: { port: "invalid" },
            })

            expect(errors.length).toBeGreaterThan(0)
            expect(errors[0]).toContain("redis.port")
        })
    })
})
