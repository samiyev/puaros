import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { promises as fs } from "node:fs"
import * as path from "node:path"
import * as os from "node:os"
import {
    CreateFileTool,
    type CreateFileResult,
} from "../../../../../src/infrastructure/tools/edit/CreateFileTool.js"
import type { ToolContext } from "../../../../../src/domain/services/ITool.js"
import type { IStorage } from "../../../../../src/domain/services/IStorage.js"
import { hashLines } from "../../../../../src/shared/utils/hash.js"

function createMockStorage(): IStorage {
    return {
        getFile: vi.fn().mockResolvedValue(null),
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

describe("CreateFileTool", () => {
    let tool: CreateFileTool

    beforeEach(() => {
        tool = new CreateFileTool()
    })

    describe("metadata", () => {
        it("should have correct name", () => {
            expect(tool.name).toBe("create_file")
        })

        it("should have correct category", () => {
            expect(tool.category).toBe("edit")
        })

        it("should require confirmation", () => {
            expect(tool.requiresConfirmation).toBe(true)
        })

        it("should have correct parameters", () => {
            expect(tool.parameters).toHaveLength(2)
            expect(tool.parameters[0].name).toBe("path")
            expect(tool.parameters[0].required).toBe(true)
            expect(tool.parameters[1].name).toBe("content")
            expect(tool.parameters[1].required).toBe(true)
        })

        it("should have description mentioning confirmation", () => {
            expect(tool.description).toContain("confirmation")
        })
    })

    describe("validateParams", () => {
        it("should return null for valid params", () => {
            expect(
                tool.validateParams({ path: "src/new-file.ts", content: "const x = 1" }),
            ).toBeNull()
        })

        it("should return error for missing path", () => {
            expect(tool.validateParams({ content: "x" })).toBe(
                "Parameter 'path' is required and must be a non-empty string",
            )
        })

        it("should return error for empty path", () => {
            expect(tool.validateParams({ path: "", content: "x" })).toBe(
                "Parameter 'path' is required and must be a non-empty string",
            )
            expect(tool.validateParams({ path: "   ", content: "x" })).toBe(
                "Parameter 'path' is required and must be a non-empty string",
            )
        })

        it("should return error for non-string path", () => {
            expect(tool.validateParams({ path: 123, content: "x" })).toBe(
                "Parameter 'path' is required and must be a non-empty string",
            )
        })

        it("should return error for missing content", () => {
            expect(tool.validateParams({ path: "test.ts" })).toBe(
                "Parameter 'content' is required and must be a string",
            )
        })

        it("should return error for non-string content", () => {
            expect(tool.validateParams({ path: "test.ts", content: 123 })).toBe(
                "Parameter 'content' is required and must be a string",
            )
        })

        it("should allow empty content string", () => {
            expect(tool.validateParams({ path: "test.ts", content: "" })).toBeNull()
        })
    })

    describe("execute", () => {
        let tempDir: string

        beforeEach(async () => {
            tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "create-file-test-"))
        })

        afterEach(async () => {
            await fs.rm(tempDir, { recursive: true, force: true })
        })

        it("should create new file with content", async () => {
            const storage = createMockStorage()
            const ctx = createMockContext(storage, true, tempDir)

            const content = "line 1\nline 2\nline 3"
            const result = await tool.execute({ path: "new-file.ts", content }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as CreateFileResult
            expect(data.path).toBe("new-file.ts")
            expect(data.lines).toBe(3)

            const filePath = path.join(tempDir, "new-file.ts")
            const fileContent = await fs.readFile(filePath, "utf-8")
            expect(fileContent).toBe(content)
        })

        it("should create directories if they do not exist", async () => {
            const storage = createMockStorage()
            const ctx = createMockContext(storage, true, tempDir)

            const result = await tool.execute(
                { path: "deep/nested/dir/file.ts", content: "test" },
                ctx,
            )

            expect(result.success).toBe(true)

            const filePath = path.join(tempDir, "deep/nested/dir/file.ts")
            const fileContent = await fs.readFile(filePath, "utf-8")
            expect(fileContent).toBe("test")
        })

        it("should call requestConfirmation with diff info", async () => {
            const storage = createMockStorage()
            const ctx = createMockContext(storage, true, tempDir)

            await tool.execute({ path: "new-file.ts", content: "line 1\nline 2" }, ctx)

            expect(ctx.requestConfirmation).toHaveBeenCalledWith(
                "Create new file: new-file.ts (2 lines)",
                {
                    filePath: "new-file.ts",
                    oldLines: [],
                    newLines: ["line 1", "line 2"],
                    startLine: 1,
                },
            )
        })

        it("should cancel creation when confirmation rejected", async () => {
            const storage = createMockStorage()
            const ctx = createMockContext(storage, false, tempDir)

            const result = await tool.execute({ path: "new-file.ts", content: "test" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toBe("File creation cancelled by user")

            const filePath = path.join(tempDir, "new-file.ts")
            await expect(fs.access(filePath)).rejects.toThrow()
        })

        it("should update storage after creation", async () => {
            const storage = createMockStorage()
            const ctx = createMockContext(storage, true, tempDir)

            await tool.execute({ path: "new-file.ts", content: "line 1\nline 2" }, ctx)

            expect(storage.setFile).toHaveBeenCalledWith(
                "new-file.ts",
                expect.objectContaining({
                    lines: ["line 1", "line 2"],
                    hash: hashLines(["line 1", "line 2"]),
                }),
            )
        })

        it("should return error for path outside project root", async () => {
            const ctx = createMockContext(undefined, true, tempDir)

            const result = await tool.execute({ path: "../outside/file.ts", content: "test" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toBe("Path contains traversal patterns")
        })

        it("should return error if file already exists", async () => {
            const existingFile = path.join(tempDir, "existing.ts")
            await fs.writeFile(existingFile, "original content", "utf-8")

            const storage = createMockStorage()
            const ctx = createMockContext(storage, true, tempDir)

            const result = await tool.execute({ path: "existing.ts", content: "new content" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toBe("File already exists: existing.ts")

            const content = await fs.readFile(existingFile, "utf-8")
            expect(content).toBe("original content")
        })

        it("should handle empty content", async () => {
            const storage = createMockStorage()
            const ctx = createMockContext(storage, true, tempDir)

            const result = await tool.execute({ path: "empty.ts", content: "" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as CreateFileResult
            expect(data.lines).toBe(1)

            const filePath = path.join(tempDir, "empty.ts")
            const fileContent = await fs.readFile(filePath, "utf-8")
            expect(fileContent).toBe("")
        })

        it("should handle single line content", async () => {
            const storage = createMockStorage()
            const ctx = createMockContext(storage, true, tempDir)

            const result = await tool.execute(
                { path: "single.ts", content: "export const x = 1" },
                ctx,
            )

            expect(result.success).toBe(true)
            const data = result.data as CreateFileResult
            expect(data.lines).toBe(1)
        })

        it("should return correct file size", async () => {
            const storage = createMockStorage()
            const ctx = createMockContext(storage, true, tempDir)

            const content = "hello world"
            const result = await tool.execute({ path: "file.ts", content }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as CreateFileResult
            expect(data.size).toBe(Buffer.byteLength(content, "utf-8"))
        })

        it("should include callId in result", async () => {
            const storage = createMockStorage()
            const ctx = createMockContext(storage, true, tempDir)

            const result = await tool.execute({ path: "new.ts", content: "test" }, ctx)

            expect(result.callId).toMatch(/^create_file-\d+$/)
        })

        it("should include executionTimeMs in result", async () => {
            const storage = createMockStorage()
            const ctx = createMockContext(storage, true, tempDir)

            const result = await tool.execute({ path: "new.ts", content: "test" }, ctx)

            expect(result.executionTimeMs).toBeGreaterThanOrEqual(0)
        })

        it("should handle multi-line content correctly", async () => {
            const storage = createMockStorage()
            const ctx = createMockContext(storage, true, tempDir)

            const content = "import { x } from './x'\n\nexport function foo() {\n  return x\n}\n"
            const result = await tool.execute({ path: "foo.ts", content }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as CreateFileResult
            expect(data.lines).toBe(6)

            const filePath = path.join(tempDir, "foo.ts")
            const fileContent = await fs.readFile(filePath, "utf-8")
            expect(fileContent).toBe(content)
        })

        it("should handle special characters in content", async () => {
            const storage = createMockStorage()
            const ctx = createMockContext(storage, true, tempDir)

            const content = "const emoji = '🚀'\nconst quote = \"hello 'world'\""
            const result = await tool.execute({ path: "special.ts", content }, ctx)

            expect(result.success).toBe(true)

            const filePath = path.join(tempDir, "special.ts")
            const fileContent = await fs.readFile(filePath, "utf-8")
            expect(fileContent).toBe(content)
        })
    })
})
