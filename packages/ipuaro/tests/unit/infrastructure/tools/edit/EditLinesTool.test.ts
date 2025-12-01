import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { promises as fs } from "node:fs"
import * as path from "node:path"
import * as os from "node:os"
import {
    EditLinesTool,
    type EditLinesResult,
} from "../../../../../src/infrastructure/tools/edit/EditLinesTool.js"
import type { ToolContext } from "../../../../../src/domain/services/ITool.js"
import type { IStorage } from "../../../../../src/domain/services/IStorage.js"
import { hashLines } from "../../../../../src/shared/utils/hash.js"

function createMockStorage(fileData: { lines: string[]; hash: string } | null = null): IStorage {
    return {
        getFile: vi.fn().mockResolvedValue(fileData),
        setFile: vi.fn().mockResolvedValue(undefined),
        deleteFile: vi.fn(),
        getAllFiles: vi.fn(),
        getFileCount: vi.fn(),
        getAST: vi.fn(),
        setAST: vi.fn(),
        deleteAST: vi.fn(),
        getAllASTs: vi.fn(),
        getMeta: vi.fn(),
        setMeta: vi.fn(),
        deleteMeta: vi.fn(),
        getAllMetas: vi.fn(),
        getSymbolIndex: vi.fn(),
        setSymbolIndex: vi.fn(),
        getDepsGraph: vi.fn(),
        setDepsGraph: vi.fn(),
        getProjectConfig: vi.fn(),
        setProjectConfig: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
        isConnected: vi.fn(),
        clear: vi.fn(),
    } as unknown as IStorage
}

function createMockContext(
    storage?: IStorage,
    confirmResult = true,
    projectRoot = "/test/project",
): ToolContext {
    return {
        projectRoot,
        storage: storage ?? createMockStorage(),
        requestConfirmation: vi.fn().mockResolvedValue(confirmResult),
        onProgress: vi.fn(),
    }
}

describe("EditLinesTool", () => {
    let tool: EditLinesTool

    beforeEach(() => {
        tool = new EditLinesTool()
    })

    describe("metadata", () => {
        it("should have correct name", () => {
            expect(tool.name).toBe("edit_lines")
        })

        it("should have correct category", () => {
            expect(tool.category).toBe("edit")
        })

        it("should require confirmation", () => {
            expect(tool.requiresConfirmation).toBe(true)
        })

        it("should have correct parameters", () => {
            expect(tool.parameters).toHaveLength(4)
            expect(tool.parameters[0].name).toBe("path")
            expect(tool.parameters[0].required).toBe(true)
            expect(tool.parameters[1].name).toBe("start")
            expect(tool.parameters[1].required).toBe(true)
            expect(tool.parameters[2].name).toBe("end")
            expect(tool.parameters[2].required).toBe(true)
            expect(tool.parameters[3].name).toBe("content")
            expect(tool.parameters[3].required).toBe(true)
        })

        it("should have description mentioning confirmation", () => {
            expect(tool.description).toContain("confirmation")
        })
    })

    describe("validateParams", () => {
        it("should return null for valid params", () => {
            expect(
                tool.validateParams({
                    path: "src/index.ts",
                    start: 1,
                    end: 5,
                    content: "new content",
                }),
            ).toBeNull()
        })

        it("should return error for missing path", () => {
            expect(tool.validateParams({ start: 1, end: 5, content: "x" })).toBe(
                "Parameter 'path' is required and must be a non-empty string",
            )
        })

        it("should return error for empty path", () => {
            expect(tool.validateParams({ path: "", start: 1, end: 5, content: "x" })).toBe(
                "Parameter 'path' is required and must be a non-empty string",
            )
            expect(tool.validateParams({ path: "   ", start: 1, end: 5, content: "x" })).toBe(
                "Parameter 'path' is required and must be a non-empty string",
            )
        })

        it("should return error for non-string path", () => {
            expect(tool.validateParams({ path: 123, start: 1, end: 5, content: "x" })).toBe(
                "Parameter 'path' is required and must be a non-empty string",
            )
        })

        it("should return error for missing start", () => {
            expect(tool.validateParams({ path: "test.ts", end: 5, content: "x" })).toBe(
                "Parameter 'start' is required and must be an integer",
            )
        })

        it("should return error for non-integer start", () => {
            expect(tool.validateParams({ path: "test.ts", start: 1.5, end: 5, content: "x" })).toBe(
                "Parameter 'start' is required and must be an integer",
            )
            expect(tool.validateParams({ path: "test.ts", start: "1", end: 5, content: "x" })).toBe(
                "Parameter 'start' is required and must be an integer",
            )
        })

        it("should return error for start < 1", () => {
            expect(tool.validateParams({ path: "test.ts", start: 0, end: 5, content: "x" })).toBe(
                "Parameter 'start' must be >= 1",
            )
            expect(tool.validateParams({ path: "test.ts", start: -1, end: 5, content: "x" })).toBe(
                "Parameter 'start' must be >= 1",
            )
        })

        it("should return error for missing end", () => {
            expect(tool.validateParams({ path: "test.ts", start: 1, content: "x" })).toBe(
                "Parameter 'end' is required and must be an integer",
            )
        })

        it("should return error for non-integer end", () => {
            expect(tool.validateParams({ path: "test.ts", start: 1, end: 5.5, content: "x" })).toBe(
                "Parameter 'end' is required and must be an integer",
            )
        })

        it("should return error for end < 1", () => {
            expect(tool.validateParams({ path: "test.ts", start: 1, end: 0, content: "x" })).toBe(
                "Parameter 'end' must be >= 1",
            )
        })

        it("should return error for start > end", () => {
            expect(tool.validateParams({ path: "test.ts", start: 10, end: 5, content: "x" })).toBe(
                "Parameter 'start' must be <= 'end'",
            )
        })

        it("should return error for missing content", () => {
            expect(tool.validateParams({ path: "test.ts", start: 1, end: 5 })).toBe(
                "Parameter 'content' is required and must be a string",
            )
        })

        it("should return error for non-string content", () => {
            expect(tool.validateParams({ path: "test.ts", start: 1, end: 5, content: 123 })).toBe(
                "Parameter 'content' is required and must be a string",
            )
        })

        it("should allow empty content string", () => {
            expect(
                tool.validateParams({ path: "test.ts", start: 1, end: 5, content: "" }),
            ).toBeNull()
        })
    })

    describe("execute", () => {
        let tempDir: string
        let testFilePath: string

        beforeEach(async () => {
            tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "edit-lines-test-"))
            testFilePath = path.join(tempDir, "test.ts")
        })

        afterEach(async () => {
            await fs.rm(tempDir, { recursive: true, force: true })
        })

        it("should replace lines with new content", async () => {
            const originalLines = ["line 1", "line 2", "line 3", "line 4", "line 5"]
            const originalContent = originalLines.join("\n")
            await fs.writeFile(testFilePath, originalContent, "utf-8")

            const lines = [...originalLines]
            const hash = hashLines(lines)
            const storage = createMockStorage({ lines, hash })
            const ctx = createMockContext(storage, true, tempDir)

            const result = await tool.execute(
                { path: "test.ts", start: 2, end: 4, content: "new line A\nnew line B" },
                ctx,
            )

            expect(result.success).toBe(true)
            const data = result.data as EditLinesResult
            expect(data.path).toBe("test.ts")
            expect(data.startLine).toBe(2)
            expect(data.endLine).toBe(4)
            expect(data.linesReplaced).toBe(3)
            expect(data.linesInserted).toBe(2)
            expect(data.totalLines).toBe(4)

            const newContent = await fs.readFile(testFilePath, "utf-8")
            expect(newContent).toBe("line 1\nnew line A\nnew line B\nline 5")
        })

        it("should call requestConfirmation with diff info", async () => {
            const originalLines = ["line 1", "line 2", "line 3"]
            await fs.writeFile(testFilePath, originalLines.join("\n"), "utf-8")

            const hash = hashLines(originalLines)
            const storage = createMockStorage({ lines: originalLines, hash })
            const ctx = createMockContext(storage, true, tempDir)

            await tool.execute({ path: "test.ts", start: 2, end: 2, content: "replaced" }, ctx)

            expect(ctx.requestConfirmation).toHaveBeenCalledWith("Replace lines 2-2 in test.ts", {
                filePath: "test.ts",
                oldLines: ["line 2"],
                newLines: ["replaced"],
                startLine: 2,
            })
        })

        it("should cancel edit when confirmation rejected", async () => {
            const originalLines = ["line 1", "line 2", "line 3"]
            const originalContent = originalLines.join("\n")
            await fs.writeFile(testFilePath, originalContent, "utf-8")

            const hash = hashLines(originalLines)
            const storage = createMockStorage({ lines: originalLines, hash })
            const ctx = createMockContext(storage, false, tempDir)

            const result = await tool.execute(
                { path: "test.ts", start: 1, end: 1, content: "changed" },
                ctx,
            )

            expect(result.success).toBe(false)
            expect(result.error).toBe("Edit cancelled by user")

            const content = await fs.readFile(testFilePath, "utf-8")
            expect(content).toBe(originalContent)
        })

        it("should update storage after edit", async () => {
            const originalLines = ["line 1", "line 2"]
            await fs.writeFile(testFilePath, originalLines.join("\n"), "utf-8")

            const hash = hashLines(originalLines)
            const storage = createMockStorage({ lines: originalLines, hash })
            const ctx = createMockContext(storage, true, tempDir)

            await tool.execute({ path: "test.ts", start: 1, end: 1, content: "changed" }, ctx)

            expect(storage.setFile).toHaveBeenCalledWith(
                "test.ts",
                expect.objectContaining({
                    lines: ["changed", "line 2"],
                    hash: hashLines(["changed", "line 2"]),
                }),
            )
        })

        it("should return error for path outside project root", async () => {
            const ctx = createMockContext()

            const result = await tool.execute(
                { path: "../outside/file.ts", start: 1, end: 1, content: "x" },
                ctx,
            )

            expect(result.success).toBe(false)
            expect(result.error).toBe("Path contains traversal patterns")
        })

        it("should return error when start exceeds file length", async () => {
            const originalLines = ["line 1", "line 2"]
            await fs.writeFile(testFilePath, originalLines.join("\n"), "utf-8")

            const hash = hashLines(originalLines)
            const storage = createMockStorage({ lines: originalLines, hash })
            const ctx = createMockContext(storage, true, tempDir)

            const result = await tool.execute(
                { path: "test.ts", start: 10, end: 15, content: "x" },
                ctx,
            )

            expect(result.success).toBe(false)
            expect(result.error).toBe("Start line 10 exceeds file length (2 lines)")
        })

        it("should adjust end to file length if it exceeds", async () => {
            const originalLines = ["line 1", "line 2", "line 3"]
            await fs.writeFile(testFilePath, originalLines.join("\n"), "utf-8")

            const hash = hashLines(originalLines)
            const storage = createMockStorage({ lines: originalLines, hash })
            const ctx = createMockContext(storage, true, tempDir)

            const result = await tool.execute(
                { path: "test.ts", start: 2, end: 100, content: "new" },
                ctx,
            )

            expect(result.success).toBe(true)
            const data = result.data as EditLinesResult
            expect(data.endLine).toBe(3)
            expect(data.linesReplaced).toBe(2)
        })

        it("should detect hash conflict", async () => {
            const originalLines = ["line 1", "line 2"]
            await fs.writeFile(testFilePath, originalLines.join("\n"), "utf-8")

            const oldHash = hashLines(["old content"])
            const storage = createMockStorage({ lines: originalLines, hash: oldHash })
            const ctx = createMockContext(storage, true, tempDir)

            const result = await tool.execute(
                { path: "test.ts", start: 1, end: 1, content: "new" },
                ctx,
            )

            expect(result.success).toBe(false)
            expect(result.error).toBe(
                "File has been modified externally. Please refresh the file before editing.",
            )
        })

        it("should allow edit when file not in storage", async () => {
            const originalLines = ["line 1", "line 2"]
            await fs.writeFile(testFilePath, originalLines.join("\n"), "utf-8")

            const storage = createMockStorage(null)
            const ctx = createMockContext(storage, true, tempDir)

            const result = await tool.execute(
                { path: "test.ts", start: 1, end: 1, content: "new" },
                ctx,
            )

            expect(result.success).toBe(true)
        })

        it("should handle single line replacement", async () => {
            const originalLines = ["line 1", "line 2", "line 3"]
            await fs.writeFile(testFilePath, originalLines.join("\n"), "utf-8")

            const hash = hashLines(originalLines)
            const storage = createMockStorage({ lines: originalLines, hash })
            const ctx = createMockContext(storage, true, tempDir)

            const result = await tool.execute(
                { path: "test.ts", start: 2, end: 2, content: "replaced line 2" },
                ctx,
            )

            expect(result.success).toBe(true)
            const content = await fs.readFile(testFilePath, "utf-8")
            expect(content).toBe("line 1\nreplaced line 2\nline 3")
        })

        it("should handle replacing all lines", async () => {
            const originalLines = ["line 1", "line 2"]
            await fs.writeFile(testFilePath, originalLines.join("\n"), "utf-8")

            const hash = hashLines(originalLines)
            const storage = createMockStorage({ lines: originalLines, hash })
            const ctx = createMockContext(storage, true, tempDir)

            const result = await tool.execute(
                { path: "test.ts", start: 1, end: 2, content: "completely\nnew\nfile" },
                ctx,
            )

            expect(result.success).toBe(true)
            const content = await fs.readFile(testFilePath, "utf-8")
            expect(content).toBe("completely\nnew\nfile")
        })

        it("should handle inserting more lines than replaced", async () => {
            const originalLines = ["line 1", "line 2"]
            await fs.writeFile(testFilePath, originalLines.join("\n"), "utf-8")

            const hash = hashLines(originalLines)
            const storage = createMockStorage({ lines: originalLines, hash })
            const ctx = createMockContext(storage, true, tempDir)

            const result = await tool.execute(
                { path: "test.ts", start: 1, end: 1, content: "a\nb\nc\nd" },
                ctx,
            )

            expect(result.success).toBe(true)
            const data = result.data as EditLinesResult
            expect(data.linesReplaced).toBe(1)
            expect(data.linesInserted).toBe(4)
            expect(data.totalLines).toBe(5)
        })

        it("should handle deleting lines (empty content)", async () => {
            const originalLines = ["line 1", "line 2", "line 3"]
            await fs.writeFile(testFilePath, originalLines.join("\n"), "utf-8")

            const hash = hashLines(originalLines)
            const storage = createMockStorage({ lines: originalLines, hash })
            const ctx = createMockContext(storage, true, tempDir)

            const result = await tool.execute(
                { path: "test.ts", start: 2, end: 2, content: "" },
                ctx,
            )

            expect(result.success).toBe(true)
            const data = result.data as EditLinesResult
            expect(data.linesReplaced).toBe(1)
            expect(data.linesInserted).toBe(1)
            expect(data.totalLines).toBe(3)
        })

        it("should include callId in result", async () => {
            const originalLines = ["line 1"]
            await fs.writeFile(testFilePath, originalLines.join("\n"), "utf-8")

            const hash = hashLines(originalLines)
            const storage = createMockStorage({ lines: originalLines, hash })
            const ctx = createMockContext(storage, true, tempDir)

            const result = await tool.execute(
                { path: "test.ts", start: 1, end: 1, content: "new" },
                ctx,
            )

            expect(result.callId).toMatch(/^edit_lines-\d+$/)
        })

        it("should include executionTimeMs in result", async () => {
            const originalLines = ["line 1"]
            await fs.writeFile(testFilePath, originalLines.join("\n"), "utf-8")

            const hash = hashLines(originalLines)
            const storage = createMockStorage({ lines: originalLines, hash })
            const ctx = createMockContext(storage, true, tempDir)

            const result = await tool.execute(
                { path: "test.ts", start: 1, end: 1, content: "new" },
                ctx,
            )

            expect(result.executionTimeMs).toBeGreaterThanOrEqual(0)
        })

        it("should return error when file not found", async () => {
            const storage = createMockStorage(null)
            const ctx = createMockContext(storage, true, tempDir)

            const result = await tool.execute(
                { path: "nonexistent.ts", start: 1, end: 1, content: "x" },
                ctx,
            )

            expect(result.success).toBe(false)
            expect(result.error).toContain("ENOENT")
        })
    })
})
