import { describe, it, expect, vi, beforeEach } from "vitest"
import { ContextManager } from "../../../../src/application/use-cases/ContextManager.js"
import { Session } from "../../../../src/domain/entities/Session.js"
import type { ILLMClient, LLMResponse } from "../../../../src/domain/services/ILLMClient.js"
import {
    createUserMessage,
    createAssistantMessage,
} from "../../../../src/domain/value-objects/ChatMessage.js"

describe("ContextManager", () => {
    let manager: ContextManager
    const CONTEXT_SIZE = 128_000

    beforeEach(() => {
        manager = new ContextManager(CONTEXT_SIZE)
    })

    describe("addToContext", () => {
        it("should add file to context", () => {
            manager.addToContext("test.ts", 100)

            expect(manager.getFilesInContext()).toContain("test.ts")
            expect(manager.getTokenCount()).toBe(100)
        })

        it("should update token count when same file added", () => {
            manager.addToContext("test.ts", 100)
            manager.addToContext("test.ts", 200)

            expect(manager.getFilesInContext()).toHaveLength(1)
            expect(manager.getTokenCount()).toBe(200)
        })

        it("should accumulate tokens for different files", () => {
            manager.addToContext("a.ts", 100)
            manager.addToContext("b.ts", 200)

            expect(manager.getFilesInContext()).toHaveLength(2)
            expect(manager.getTokenCount()).toBe(300)
        })
    })

    describe("removeFromContext", () => {
        it("should remove file from context", () => {
            manager.addToContext("test.ts", 100)
            manager.removeFromContext("test.ts")

            expect(manager.getFilesInContext()).not.toContain("test.ts")
            expect(manager.getTokenCount()).toBe(0)
        })

        it("should handle removing non-existent file", () => {
            manager.removeFromContext("non-existent.ts")

            expect(manager.getTokenCount()).toBe(0)
        })
    })

    describe("getUsage", () => {
        it("should return 0 for empty context", () => {
            expect(manager.getUsage()).toBe(0)
        })

        it("should calculate usage ratio correctly", () => {
            manager.addToContext("test.ts", CONTEXT_SIZE / 2)

            expect(manager.getUsage()).toBe(0.5)
        })
    })

    describe("getAvailableTokens", () => {
        it("should return full context when empty", () => {
            expect(manager.getAvailableTokens()).toBe(CONTEXT_SIZE)
        })

        it("should calculate available tokens correctly", () => {
            manager.addToContext("test.ts", 1000)

            expect(manager.getAvailableTokens()).toBe(CONTEXT_SIZE - 1000)
        })
    })

    describe("needsCompression", () => {
        it("should return false when under threshold", () => {
            manager.addToContext("test.ts", CONTEXT_SIZE * 0.5)

            expect(manager.needsCompression()).toBe(false)
        })

        it("should return true when over threshold", () => {
            manager.addToContext("test.ts", CONTEXT_SIZE * 0.85)

            expect(manager.needsCompression()).toBe(true)
        })

        it("should return false at exactly threshold", () => {
            manager.addToContext("test.ts", CONTEXT_SIZE * 0.8)

            expect(manager.needsCompression()).toBe(false)
        })
    })

    describe("addTokens", () => {
        it("should add tokens to current count", () => {
            manager.addTokens(500)

            expect(manager.getTokenCount()).toBe(500)
        })

        it("should accumulate tokens", () => {
            manager.addTokens(100)
            manager.addTokens(200)

            expect(manager.getTokenCount()).toBe(300)
        })
    })

    describe("syncFromSession", () => {
        it("should sync files from session context", () => {
            const session = new Session("test", "project")
            session.context.filesInContext = ["a.ts", "b.ts"]
            session.context.tokenUsage = 0.5

            manager.syncFromSession(session)

            expect(manager.getFilesInContext()).toContain("a.ts")
            expect(manager.getFilesInContext()).toContain("b.ts")
            expect(manager.getTokenCount()).toBe(Math.floor(0.5 * CONTEXT_SIZE))
        })

        it("should clear previous state on sync", () => {
            manager.addToContext("old.ts", 1000)

            const session = new Session("test", "project")
            session.context.filesInContext = ["new.ts"]
            session.context.tokenUsage = 0.1

            manager.syncFromSession(session)

            expect(manager.getFilesInContext()).not.toContain("old.ts")
            expect(manager.getFilesInContext()).toContain("new.ts")
        })
    })

    describe("updateSession", () => {
        it("should update session with current context state", () => {
            const session = new Session("test", "project")

            manager.addToContext("test.ts", 1000)
            manager.updateSession(session)

            expect(session.context.filesInContext).toContain("test.ts")
            expect(session.context.tokenUsage).toBeCloseTo(1000 / CONTEXT_SIZE)
        })

        it("should set needsCompression flag", () => {
            const session = new Session("test", "project")

            manager.addToContext("large.ts", CONTEXT_SIZE * 0.9)
            manager.updateSession(session)

            expect(session.context.needsCompression).toBe(true)
        })
    })

    describe("compress", () => {
        let mockLLM: ILLMClient
        let session: Session

        beforeEach(() => {
            mockLLM = {
                chat: vi.fn().mockResolvedValue({
                    content: "Summary of previous conversation",
                    toolCalls: [],
                    tokens: 50,
                    timeMs: 100,
                    truncated: false,
                    stopReason: "end",
                } as LLMResponse),
                countTokens: vi.fn().mockResolvedValue(10),
                isAvailable: vi.fn().mockResolvedValue(true),
                getModelName: vi.fn().mockReturnValue("test-model"),
                getContextWindowSize: vi.fn().mockReturnValue(CONTEXT_SIZE),
                pullModel: vi.fn().mockResolvedValue(undefined),
                abort: vi.fn(),
            }

            session = new Session("test", "project")
        })

        it("should not compress when history is short", async () => {
            for (let i = 0; i < 5; i++) {
                session.addMessage(createUserMessage(`Message ${String(i)}`))
            }

            const result = await manager.compress(session, mockLLM)

            expect(result.compressed).toBe(false)
            expect(result.removedMessages).toBe(0)
        })

        it("should compress when history is long enough", async () => {
            for (let i = 0; i < 15; i++) {
                session.addMessage(createUserMessage(`Message ${String(i)}`))
                session.addMessage(createAssistantMessage(`Response ${String(i)}`))
            }
            manager.addToContext("test.ts", 10000)

            const result = await manager.compress(session, mockLLM)

            expect(result.compressed).toBe(true)
            expect(result.removedMessages).toBeGreaterThan(0)
            expect(result.summary).toBeDefined()
        })

        it("should keep recent messages after compression", async () => {
            for (let i = 0; i < 15; i++) {
                session.addMessage(createUserMessage(`Message ${String(i)}`))
            }

            await manager.compress(session, mockLLM)

            expect(session.history.length).toBeLessThan(15)
            expect(session.history[session.history.length - 1].content).toContain("Message 14")
        })

        it("should add summary as system message", async () => {
            for (let i = 0; i < 15; i++) {
                session.addMessage(createUserMessage(`Message ${String(i)}`))
            }

            await manager.compress(session, mockLLM)

            expect(session.history[0].role).toBe("system")
            expect(session.history[0].content).toContain("Summary")
        })
    })

    describe("createInitialState", () => {
        it("should create empty initial state", () => {
            const state = ContextManager.createInitialState()

            expect(state.filesInContext).toEqual([])
            expect(state.tokenUsage).toBe(0)
            expect(state.needsCompression).toBe(false)
        })
    })

    describe("configuration", () => {
        it("should use default compression threshold when no config provided", () => {
            const manager = new ContextManager(CONTEXT_SIZE)
            manager.addToContext("test.ts", CONTEXT_SIZE * 0.85)

            expect(manager.needsCompression()).toBe(true)
        })

        it("should use custom compression threshold from config", () => {
            const manager = new ContextManager(CONTEXT_SIZE, { autoCompressAt: 0.9 })
            manager.addToContext("test.ts", CONTEXT_SIZE * 0.85)

            expect(manager.needsCompression()).toBe(false)
        })

        it("should trigger compression at custom threshold", () => {
            const manager = new ContextManager(CONTEXT_SIZE, { autoCompressAt: 0.9 })
            manager.addToContext("test.ts", CONTEXT_SIZE * 0.95)

            expect(manager.needsCompression()).toBe(true)
        })

        it("should accept compression method in config", () => {
            const manager = new ContextManager(CONTEXT_SIZE, { compressionMethod: "truncate" })

            expect(manager).toBeDefined()
        })

        it("should use default compression method when not specified", () => {
            const manager = new ContextManager(CONTEXT_SIZE, {})

            expect(manager).toBeDefined()
        })

        it("should accept full context config", () => {
            const manager = new ContextManager(CONTEXT_SIZE, {
                systemPromptTokens: 3000,
                maxContextUsage: 0.9,
                autoCompressAt: 0.85,
                compressionMethod: "llm-summary",
            })

            manager.addToContext("test.ts", CONTEXT_SIZE * 0.87)
            expect(manager.needsCompression()).toBe(true)
        })

        it("should handle edge case: autoCompressAt = 0", () => {
            const manager = new ContextManager(CONTEXT_SIZE, { autoCompressAt: 0 })
            manager.addToContext("test.ts", 1)

            expect(manager.needsCompression()).toBe(true)
        })

        it("should handle edge case: autoCompressAt = 1", () => {
            const manager = new ContextManager(CONTEXT_SIZE, { autoCompressAt: 1 })
            manager.addToContext("test.ts", CONTEXT_SIZE * 0.99)

            expect(manager.needsCompression()).toBe(false)
        })
    })
})
