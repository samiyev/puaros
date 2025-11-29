import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
    createUndoEntry,
    canUndo,
} from "../../../../src/domain/value-objects/UndoEntry.js"

describe("UndoEntry", () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2025-01-01T00:00:00Z"))
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    describe("createUndoEntry", () => {
        it("should create undo entry with all fields", () => {
            const entry = createUndoEntry(
                "undo-1",
                "test.ts",
                ["old line"],
                ["new line"],
                "Edit line 1"
            )

            expect(entry.id).toBe("undo-1")
            expect(entry.filePath).toBe("test.ts")
            expect(entry.previousContent).toEqual(["old line"])
            expect(entry.newContent).toEqual(["new line"])
            expect(entry.description).toBe("Edit line 1")
            expect(entry.timestamp).toBe(Date.now())
            expect(entry.toolCallId).toBeUndefined()
        })

        it("should create undo entry with toolCallId", () => {
            const entry = createUndoEntry(
                "undo-2",
                "test.ts",
                [],
                [],
                "Create file",
                "tool-123"
            )

            expect(entry.toolCallId).toBe("tool-123")
        })
    })

    describe("canUndo", () => {
        it("should return true when current content matches newContent", () => {
            const entry = createUndoEntry(
                "undo-1",
                "test.ts",
                ["old"],
                ["new"],
                "Edit"
            )

            expect(canUndo(entry, ["new"])).toBe(true)
        })

        it("should return false when content differs", () => {
            const entry = createUndoEntry(
                "undo-1",
                "test.ts",
                ["old"],
                ["new"],
                "Edit"
            )

            expect(canUndo(entry, ["modified"])).toBe(false)
        })

        it("should return false when length differs", () => {
            const entry = createUndoEntry(
                "undo-1",
                "test.ts",
                ["old"],
                ["new"],
                "Edit"
            )

            expect(canUndo(entry, ["new", "extra"])).toBe(false)
        })
    })
})
