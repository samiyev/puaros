import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
    createUserMessage,
    createAssistantMessage,
    createToolMessage,
    createSystemMessage,
} from "../../../../src/domain/value-objects/ChatMessage.js"

describe("ChatMessage", () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2025-01-01T00:00:00Z"))
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    describe("createUserMessage", () => {
        it("should create user message", () => {
            const msg = createUserMessage("Hello")

            expect(msg.role).toBe("user")
            expect(msg.content).toBe("Hello")
            expect(msg.timestamp).toBe(Date.now())
        })
    })

    describe("createAssistantMessage", () => {
        it("should create assistant message without tool calls", () => {
            const msg = createAssistantMessage("Response")

            expect(msg.role).toBe("assistant")
            expect(msg.content).toBe("Response")
            expect(msg.toolCalls).toBeUndefined()
        })

        it("should create assistant message with tool calls", () => {
            const toolCalls = [{ id: "1", name: "get_lines", params: {}, timestamp: Date.now() }]
            const stats = { tokens: 100, timeMs: 500, toolCalls: 1 }
            const msg = createAssistantMessage("Response", toolCalls, stats)

            expect(msg.toolCalls).toEqual(toolCalls)
            expect(msg.stats).toEqual(stats)
        })
    })

    describe("createToolMessage", () => {
        it("should create tool message with results", () => {
            const results = [{ callId: "1", success: true, data: "data", executionTimeMs: 10 }]
            const msg = createToolMessage(results)

            expect(msg.role).toBe("tool")
            expect(msg.toolResults).toEqual(results)
            expect(msg.content).toContain("[1] Success")
        })

        it("should format error results", () => {
            const results = [
                { callId: "2", success: false, error: "Not found", executionTimeMs: 5 },
            ]
            const msg = createToolMessage(results)

            expect(msg.content).toContain("[2] Error: Not found")
        })
    })

    describe("createSystemMessage", () => {
        it("should create system message", () => {
            const msg = createSystemMessage("System prompt")

            expect(msg.role).toBe("system")
            expect(msg.content).toBe("System prompt")
        })
    })
})
