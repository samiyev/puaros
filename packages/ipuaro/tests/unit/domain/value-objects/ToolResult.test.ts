import { describe, it, expect } from "vitest"
import {
    createSuccessResult,
    createErrorResult,
} from "../../../../src/domain/value-objects/ToolResult.js"

describe("ToolResult", () => {
    describe("createSuccessResult", () => {
        it("should create success result", () => {
            const data = { lines: ["line1", "line2"] }
            const result = createSuccessResult("call-1", data, 50)

            expect(result.callId).toBe("call-1")
            expect(result.success).toBe(true)
            expect(result.data).toEqual(data)
            expect(result.executionTimeMs).toBe(50)
            expect(result.error).toBeUndefined()
        })
    })

    describe("createErrorResult", () => {
        it("should create error result", () => {
            const result = createErrorResult("call-2", "File not found", 10)

            expect(result.callId).toBe("call-2")
            expect(result.success).toBe(false)
            expect(result.error).toBe("File not found")
            expect(result.executionTimeMs).toBe(10)
            expect(result.data).toBeUndefined()
        })
    })
})
