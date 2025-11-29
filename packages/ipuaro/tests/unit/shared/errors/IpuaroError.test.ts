import { describe, it, expect } from "vitest"
import { IpuaroError } from "../../../../src/shared/errors/IpuaroError.js"

describe("IpuaroError", () => {
    describe("constructor", () => {
        it("should create error with all fields", () => {
            const error = new IpuaroError("file", "Not found", true, "Check path")

            expect(error.name).toBe("IpuaroError")
            expect(error.type).toBe("file")
            expect(error.message).toBe("Not found")
            expect(error.recoverable).toBe(true)
            expect(error.suggestion).toBe("Check path")
        })

        it("should default recoverable to true", () => {
            const error = new IpuaroError("parse", "Parse failed")

            expect(error.recoverable).toBe(true)
        })
    })

    describe("static factories", () => {
        it("should create redis error", () => {
            const error = IpuaroError.redis("Connection failed")

            expect(error.type).toBe("redis")
            expect(error.recoverable).toBe(false)
            expect(error.suggestion).toContain("Redis")
        })

        it("should create parse error", () => {
            const error = IpuaroError.parse("Syntax error", "test.ts")

            expect(error.type).toBe("parse")
            expect(error.message).toContain("test.ts")
            expect(error.recoverable).toBe(true)
        })

        it("should create parse error without file", () => {
            const error = IpuaroError.parse("Syntax error")

            expect(error.message).toBe("Syntax error")
        })

        it("should create llm error", () => {
            const error = IpuaroError.llm("Timeout")

            expect(error.type).toBe("llm")
            expect(error.recoverable).toBe(true)
            expect(error.suggestion).toContain("Ollama")
        })

        it("should create file error", () => {
            const error = IpuaroError.file("Not found")

            expect(error.type).toBe("file")
        })

        it("should create command error", () => {
            const error = IpuaroError.command("Blacklisted")

            expect(error.type).toBe("command")
        })

        it("should create conflict error", () => {
            const error = IpuaroError.conflict("File changed")

            expect(error.type).toBe("conflict")
            expect(error.suggestion).toContain("Regenerate")
        })

        it("should create validation error", () => {
            const error = IpuaroError.validation("Invalid param")

            expect(error.type).toBe("validation")
        })

        it("should create timeout error", () => {
            const error = IpuaroError.timeout("Request timeout")

            expect(error.type).toBe("timeout")
            expect(error.suggestion).toContain("timeout")
        })
    })
})
