import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { createToolCall } from "../../../../src/domain/value-objects/ToolCall.js"

describe("ToolCall", () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2025-01-01T00:00:00Z"))
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    describe("createToolCall", () => {
        it("should create tool call with all fields", () => {
            const params = { path: "test.ts", line: 10 }
            const call = createToolCall("call-1", "get_lines", params)

            expect(call.id).toBe("call-1")
            expect(call.name).toBe("get_lines")
            expect(call.params).toEqual(params)
            expect(call.timestamp).toBe(Date.now())
        })

        it("should handle empty params", () => {
            const call = createToolCall("call-2", "git_status", {})

            expect(call.params).toEqual({})
        })
    })
})
