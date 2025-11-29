import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { Session } from "../../../../src/domain/entities/Session.js"
import { createUserMessage } from "../../../../src/domain/value-objects/ChatMessage.js"
import type { UndoEntry } from "../../../../src/domain/value-objects/UndoEntry.js"

describe("Session", () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2025-01-01T00:00:00Z"))
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it("should create session with defaults", () => {
        const session = new Session("session-1", "test-project")

        expect(session.id).toBe("session-1")
        expect(session.projectName).toBe("test-project")
        expect(session.history).toEqual([])
        expect(session.undoStack).toEqual([])
        expect(session.stats.totalTokens).toBe(0)
    })

    describe("addMessage", () => {
        it("should add message to history", () => {
            const session = new Session("1", "proj")
            const msg = createUserMessage("Hello")

            session.addMessage(msg)

            expect(session.history).toHaveLength(1)
            expect(session.history[0]).toBe(msg)
        })

        it("should update stats from message", () => {
            const session = new Session("1", "proj")
            const msg = {
                role: "assistant" as const,
                content: "Hi",
                timestamp: Date.now(),
                stats: { tokens: 50, timeMs: 100, toolCalls: 2 },
            }

            session.addMessage(msg)

            expect(session.stats.totalTokens).toBe(50)
            expect(session.stats.totalTimeMs).toBe(100)
            expect(session.stats.toolCalls).toBe(2)
        })
    })

    describe("undoStack", () => {
        it("should add undo entry", () => {
            const session = new Session("1", "proj")
            const entry: UndoEntry = {
                id: "undo-1",
                timestamp: Date.now(),
                filePath: "test.ts",
                previousContent: ["old"],
                newContent: ["new"],
                description: "Edit",
            }

            session.addUndoEntry(entry)

            expect(session.undoStack).toHaveLength(1)
        })

        it("should limit undo stack size", () => {
            const session = new Session("1", "proj")

            for (let i = 0; i < 15; i++) {
                session.addUndoEntry({
                    id: `undo-${i}`,
                    timestamp: Date.now(),
                    filePath: "test.ts",
                    previousContent: [],
                    newContent: [],
                    description: `Edit ${i}`,
                })
            }

            expect(session.undoStack).toHaveLength(10)
            expect(session.undoStack[0].id).toBe("undo-5")
        })

        it("should pop undo entry", () => {
            const session = new Session("1", "proj")
            const entry: UndoEntry = {
                id: "undo-1",
                timestamp: Date.now(),
                filePath: "test.ts",
                previousContent: [],
                newContent: [],
                description: "Edit",
            }

            session.addUndoEntry(entry)
            const popped = session.popUndoEntry()

            expect(popped).toBe(entry)
            expect(session.undoStack).toHaveLength(0)
        })
    })

    describe("inputHistory", () => {
        it("should add input to history", () => {
            const session = new Session("1", "proj")

            session.addInputToHistory("command 1")
            session.addInputToHistory("command 2")

            expect(session.inputHistory).toEqual(["command 1", "command 2"])
        })

        it("should not add duplicate consecutive inputs", () => {
            const session = new Session("1", "proj")

            session.addInputToHistory("command")
            session.addInputToHistory("command")

            expect(session.inputHistory).toHaveLength(1)
        })

        it("should not add empty inputs", () => {
            const session = new Session("1", "proj")

            session.addInputToHistory("")
            session.addInputToHistory("   ")

            expect(session.inputHistory).toHaveLength(0)
        })
    })

    describe("clearHistory", () => {
        it("should clear history and context", () => {
            const session = new Session("1", "proj")
            session.addMessage(createUserMessage("Hello"))
            session.context.filesInContext = ["file1.ts"]

            session.clearHistory()

            expect(session.history).toHaveLength(0)
            expect(session.context.filesInContext).toHaveLength(0)
        })
    })

    describe("getSessionDurationFormatted", () => {
        it("should format minutes only", () => {
            const session = new Session("1", "proj")
            vi.advanceTimersByTime(15 * 60 * 1000)

            expect(session.getSessionDurationFormatted()).toBe("15m")
        })

        it("should format hours and minutes", () => {
            const session = new Session("1", "proj")
            vi.advanceTimersByTime(90 * 60 * 1000)

            expect(session.getSessionDurationFormatted()).toBe("1h 30m")
        })
    })
})
