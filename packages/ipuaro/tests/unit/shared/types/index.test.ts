import { describe, it, expect } from "vitest"
import { ok, err, isOk, isErr, type Result } from "../../../../src/shared/types/index.js"

describe("Result type", () => {
    describe("ok", () => {
        it("should create success result", () => {
            const result = ok("data")

            expect(result.success).toBe(true)
            expect(result.data).toBe("data")
        })
    })

    describe("err", () => {
        it("should create error result", () => {
            const error = new Error("failed")
            const result = err(error)

            expect(result.success).toBe(false)
            expect(result.error).toBe(error)
        })
    })

    describe("isOk", () => {
        it("should return true for success", () => {
            const result: Result<string> = ok("data")

            expect(isOk(result)).toBe(true)
        })

        it("should return false for error", () => {
            const result: Result<string> = err(new Error("fail"))

            expect(isOk(result)).toBe(false)
        })
    })

    describe("isErr", () => {
        it("should return true for error", () => {
            const result: Result<string> = err(new Error("fail"))

            expect(isErr(result)).toBe(true)
        })

        it("should return false for success", () => {
            const result: Result<string> = ok("data")

            expect(isErr(result)).toBe(false)
        })
    })
})
