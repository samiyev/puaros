import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { promises as fs } from "node:fs"
import * as path from "node:path"
import * as os from "node:os"
import {
    DeleteFileTool,
    type DeleteFileResult,
} from "../../../../../src/infrastructure/tools/edit/DeleteFileTool.js"
import type { ToolContext } from "../../../../../src/domain/services/ITool.js"
import type { IStorage } from "../../../../../src/domain/services/IStorage.js"

function createMockStorage(fileData: { lines: string[] } | null = null): IStorage {
    return {
        getFile: vi.fn().mockResolvedValue(fileData),
        setFile: vi.fn().mockResolvedValue(undefined),
        deleteFile: vi.fn().mockResolvedValue(undefined),
        getAllFiles: vi.fn(),
        getFileCount: vi.fn(),
        getAST: vi.fn(),
        setAST: vi.fn(),
        deleteAST: vi.fn().mockResolvedValue(undefined),
        getAllASTs: vi.fn(),
        getMeta: vi.fn(),
        setMeta: vi.fn(),
        deleteMeta: vi.fn().mockResolvedValue(undefined),
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

describe("DeleteFileTool", () => {
    let tool: DeleteFileTool

    beforeEach(() => {
        tool = new DeleteFileTool()
    })

    describe("metadata", () => {
        it("should have correct name", () => {
            expect(tool.name).toBe("delete_file")
        })

        it("should have correct category", () => {
            expect(tool.category).toBe("edit")
        })

        it("should require confirmation", () => {
            expect(tool.requiresConfirmation).toBe(true)
        })

        it("should have correct parameters", () => {
            expect(tool.parameters).toHaveLength(1)
            expect(tool.parameters[0].name).toBe("path")
            expect(tool.parameters[0].required).toBe(true)
        })

        it("should have description mentioning confirmation", () => {
            expect(tool.description).toContain("confirmation")
        })
    })

    describe("validateParams", () => {
        it("should return null for valid params", () => {
            expect(tool.validateParams({ path: "src/file.ts" })).toBeNull()
        })

        it("should return error for missing path", () => {
            expect(tool.validateParams({})).toBe(
                "Parameter 'path' is required and must be a non-empty string",
            )
        })

        it("should return error for empty path", () => {
            expect(tool.validateParams({ path: "" })).toBe(
                "Parameter 'path' is required and must be a non-empty string",
            )
            expect(tool.validateParams({ path: "   " })).toBe(
                "Parameter 'path' is required and must be a non-empty string",
            )
        })

        it("should return error for non-string path", () => {
            expect(tool.validateParams({ path: 123 })).toBe(
                "Parameter 'path' is required and must be a non-empty string",
            )
        })
    })

    describe("execute", () => {
        let tempDir: string

        beforeEach(async () => {
            tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "delete-file-test-"))
        })

        afterEach(async () => {
            await fs.rm(tempDir, { recursive: true, force: true })
        })

        it("should delete existing file", async () => {
            const testFile = path.join(tempDir, "to-delete.ts")
            await fs.writeFile(testFile, "content to delete", "utf-8")

            const storage = createMockStorage({ lines: ["content to delete"] })
            const ctx = createMockContext(storage, true, tempDir)

            const result = await tool.execute({ path: "to-delete.ts" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as DeleteFileResult
            expect(data.path).toBe("to-delete.ts")
            expect(data.deleted).toBe(true)

            await expect(fs.access(testFile)).rejects.toThrow()
        })

        it("should delete file from storage", async () => {
            const testFile = path.join(tempDir, "to-delete.ts")
            await fs.writeFile(testFile, "content", "utf-8")

            const storage = createMockStorage({ lines: ["content"] })
            const ctx = createMockContext(storage, true, tempDir)

            await tool.execute({ path: "to-delete.ts" }, ctx)

            expect(storage.deleteFile).toHaveBeenCalledWith("to-delete.ts")
            expect(storage.deleteAST).toHaveBeenCalledWith("to-delete.ts")
            expect(storage.deleteMeta).toHaveBeenCalledWith("to-delete.ts")
        })

        it("should call requestConfirmation with diff info", async () => {
            const testFile = path.join(tempDir, "to-delete.ts")
            await fs.writeFile(testFile, "line 1\nline 2", "utf-8")

            const storage = createMockStorage({ lines: ["line 1", "line 2"] })
            const ctx = createMockContext(storage, true, tempDir)

            await tool.execute({ path: "to-delete.ts" }, ctx)

            expect(ctx.requestConfirmation).toHaveBeenCalledWith("Delete file: to-delete.ts", {
                filePath: "to-delete.ts",
                oldLines: ["line 1", "line 2"],
                newLines: [],
                startLine: 1,
            })
        })

        it("should cancel deletion when confirmation rejected", async () => {
            const testFile = path.join(tempDir, "keep.ts")
            await fs.writeFile(testFile, "keep this", "utf-8")

            const storage = createMockStorage({ lines: ["keep this"] })
            const ctx = createMockContext(storage, false, tempDir)

            const result = await tool.execute({ path: "keep.ts" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toBe("File deletion cancelled by user")

            const content = await fs.readFile(testFile, "utf-8")
            expect(content).toBe("keep this")
        })

        it("should return error for path outside project root", async () => {
            const ctx = createMockContext(undefined, true, tempDir)

            const result = await tool.execute({ path: "../outside/file.ts" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toBe("Path contains traversal patterns")
        })

        it("should return error if file does not exist", async () => {
            const storage = createMockStorage(null)
            const ctx = createMockContext(storage, true, tempDir)

            const result = await tool.execute({ path: "nonexistent.ts" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toBe("File not found: nonexistent.ts")
        })

        it("should read content from filesystem if not in storage", async () => {
            const testFile = path.join(tempDir, "not-indexed.ts")
            await fs.writeFile(testFile, "filesystem content\nline 2", "utf-8")

            const storage = createMockStorage(null)
            const ctx = createMockContext(storage, true, tempDir)

            await tool.execute({ path: "not-indexed.ts" }, ctx)

            expect(ctx.requestConfirmation).toHaveBeenCalledWith(
                "Delete file: not-indexed.ts",
                expect.objectContaining({
                    oldLines: ["filesystem content", "line 2"],
                }),
            )
        })

        it("should include callId in result", async () => {
            const testFile = path.join(tempDir, "file.ts")
            await fs.writeFile(testFile, "x", "utf-8")

            const storage = createMockStorage({ lines: ["x"] })
            const ctx = createMockContext(storage, true, tempDir)

            const result = await tool.execute({ path: "file.ts" }, ctx)

            expect(result.callId).toMatch(/^delete_file-\d+$/)
        })

        it("should include executionTimeMs in result", async () => {
            const testFile = path.join(tempDir, "file.ts")
            await fs.writeFile(testFile, "x", "utf-8")

            const storage = createMockStorage({ lines: ["x"] })
            const ctx = createMockContext(storage, true, tempDir)

            const result = await tool.execute({ path: "file.ts" }, ctx)

            expect(result.executionTimeMs).toBeGreaterThanOrEqual(0)
        })

        it("should not delete directories", async () => {
            const dirPath = path.join(tempDir, "some-dir")
            await fs.mkdir(dirPath)

            const storage = createMockStorage(null)
            const ctx = createMockContext(storage, true, tempDir)

            const result = await tool.execute({ path: "some-dir" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toBe("File not found: some-dir")
        })

        it("should handle nested file paths", async () => {
            const nestedDir = path.join(tempDir, "a/b/c")
            await fs.mkdir(nestedDir, { recursive: true })
            const testFile = path.join(nestedDir, "file.ts")
            await fs.writeFile(testFile, "nested", "utf-8")

            const storage = createMockStorage({ lines: ["nested"] })
            const ctx = createMockContext(storage, true, tempDir)

            const result = await tool.execute({ path: "a/b/c/file.ts" }, ctx)

            expect(result.success).toBe(true)
            await expect(fs.access(testFile)).rejects.toThrow()
        })
    })
})
