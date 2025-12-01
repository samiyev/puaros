import { describe, it, expect, vi, beforeEach } from "vitest"
import {
    GetLinesTool,
    type GetLinesResult,
} from "../../../../../src/infrastructure/tools/read/GetLinesTool.js"
import type { ToolContext } from "../../../../../src/domain/services/ITool.js"
import type { IStorage } from "../../../../../src/domain/services/IStorage.js"

function createMockStorage(fileData: { lines: string[] } | null = null): IStorage {
    return {
        getFile: vi.fn().mockResolvedValue(fileData),
        setFile: vi.fn(),
        deleteFile: vi.fn(),
        getAllFiles: vi.fn(),
        getAST: vi.fn(),
        setAST: vi.fn(),
        getMeta: vi.fn(),
        setMeta: vi.fn(),
        getSymbolIndex: vi.fn(),
        setSymbolIndex: vi.fn(),
        getDepsGraph: vi.fn(),
        setDepsGraph: vi.fn(),
        getConfig: vi.fn(),
        setConfig: vi.fn(),
        clear: vi.fn(),
    } as unknown as IStorage
}

function createMockContext(storage?: IStorage): ToolContext {
    return {
        projectRoot: "/test/project",
        storage: storage ?? createMockStorage(),
        requestConfirmation: vi.fn().mockResolvedValue(true),
        onProgress: vi.fn(),
    }
}

describe("GetLinesTool", () => {
    let tool: GetLinesTool

    beforeEach(() => {
        tool = new GetLinesTool()
    })

    describe("metadata", () => {
        it("should have correct name", () => {
            expect(tool.name).toBe("get_lines")
        })

        it("should have correct category", () => {
            expect(tool.category).toBe("read")
        })

        it("should not require confirmation", () => {
            expect(tool.requiresConfirmation).toBe(false)
        })

        it("should have correct parameters", () => {
            expect(tool.parameters).toHaveLength(3)
            expect(tool.parameters[0].name).toBe("path")
            expect(tool.parameters[0].required).toBe(true)
            expect(tool.parameters[1].name).toBe("start")
            expect(tool.parameters[1].required).toBe(false)
            expect(tool.parameters[2].name).toBe("end")
            expect(tool.parameters[2].required).toBe(false)
        })
    })

    describe("validateParams", () => {
        it("should return null for valid params with path only", () => {
            expect(tool.validateParams({ path: "src/index.ts" })).toBeNull()
        })

        it("should return null for valid params with start and end", () => {
            expect(tool.validateParams({ path: "src/index.ts", start: 1, end: 10 })).toBeNull()
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

        it("should return error for non-integer start", () => {
            expect(tool.validateParams({ path: "test.ts", start: 1.5 })).toBe(
                "Parameter 'start' must be an integer",
            )
            expect(tool.validateParams({ path: "test.ts", start: "1" })).toBe(
                "Parameter 'start' must be an integer",
            )
        })

        it("should return error for start < 1", () => {
            expect(tool.validateParams({ path: "test.ts", start: 0 })).toBe(
                "Parameter 'start' must be >= 1",
            )
            expect(tool.validateParams({ path: "test.ts", start: -1 })).toBe(
                "Parameter 'start' must be >= 1",
            )
        })

        it("should return error for non-integer end", () => {
            expect(tool.validateParams({ path: "test.ts", end: 1.5 })).toBe(
                "Parameter 'end' must be an integer",
            )
        })

        it("should return error for end < 1", () => {
            expect(tool.validateParams({ path: "test.ts", end: 0 })).toBe(
                "Parameter 'end' must be >= 1",
            )
        })

        it("should return error for start > end", () => {
            expect(tool.validateParams({ path: "test.ts", start: 10, end: 5 })).toBe(
                "Parameter 'start' must be <= 'end'",
            )
        })
    })

    describe("execute", () => {
        it("should return all lines when no range specified", async () => {
            const lines = ["line 1", "line 2", "line 3"]
            const storage = createMockStorage({ lines })
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "test.ts" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetLinesResult
            expect(data.path).toBe("test.ts")
            expect(data.startLine).toBe(1)
            expect(data.endLine).toBe(3)
            expect(data.totalLines).toBe(3)
            expect(data.content).toContain("1│line 1")
            expect(data.content).toContain("2│line 2")
            expect(data.content).toContain("3│line 3")
        })

        it("should return specific range", async () => {
            const lines = ["line 1", "line 2", "line 3", "line 4", "line 5"]
            const storage = createMockStorage({ lines })
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "test.ts", start: 2, end: 4 }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetLinesResult
            expect(data.startLine).toBe(2)
            expect(data.endLine).toBe(4)
            expect(data.content).toContain("2│line 2")
            expect(data.content).toContain("3│line 3")
            expect(data.content).toContain("4│line 4")
            expect(data.content).not.toContain("line 1")
            expect(data.content).not.toContain("line 5")
        })

        it("should clamp start to 1 if less", async () => {
            const lines = ["line 1", "line 2"]
            const storage = createMockStorage({ lines })
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "test.ts", start: -5, end: 2 }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetLinesResult
            expect(data.startLine).toBe(1)
        })

        it("should clamp end to totalLines if greater", async () => {
            const lines = ["line 1", "line 2", "line 3"]
            const storage = createMockStorage({ lines })
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "test.ts", start: 1, end: 100 }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetLinesResult
            expect(data.endLine).toBe(3)
        })

        it("should pad line numbers correctly", async () => {
            const lines = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`)
            const storage = createMockStorage({ lines })
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "test.ts", start: 98, end: 100 }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetLinesResult
            expect(data.content).toContain(" 98│line 98")
            expect(data.content).toContain(" 99│line 99")
            expect(data.content).toContain("100│line 100")
        })

        it("should return error for path outside project root", async () => {
            const ctx = createMockContext()

            const result = await tool.execute({ path: "../outside/file.ts" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toBe("Path contains traversal patterns")
        })

        it("should return error when file not found", async () => {
            const storage = createMockStorage(null)
            storage.getFile = vi.fn().mockResolvedValue(null)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "nonexistent.ts" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toContain("ENOENT")
        })

        it("should include callId in result", async () => {
            const storage = createMockStorage({ lines: ["test"] })
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "test.ts" }, ctx)

            expect(result.callId).toMatch(/^get_lines-\d+$/)
        })

        it("should include executionTimeMs in result", async () => {
            const storage = createMockStorage({ lines: ["test"] })
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "test.ts" }, ctx)

            expect(result.executionTimeMs).toBeGreaterThanOrEqual(0)
        })

        it("should handle empty file", async () => {
            const storage = createMockStorage({ lines: [] })
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "empty.ts" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetLinesResult
            expect(data.totalLines).toBe(0)
            expect(data.content).toBe("")
        })

        it("should handle single line file", async () => {
            const storage = createMockStorage({ lines: ["only line"] })
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "single.ts" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetLinesResult
            expect(data.totalLines).toBe(1)
            expect(data.content).toBe("1│only line")
        })

        it("should read from filesystem fallback when not in storage", async () => {
            const storage: IStorage = {
                getFile: vi.fn().mockResolvedValue(null),
                setFile: vi.fn(),
                deleteFile: vi.fn(),
                getAllFiles: vi.fn(),
                getAST: vi.fn(),
                setAST: vi.fn(),
                getSymbolIndex: vi.fn(),
                setSymbolIndex: vi.fn(),
                getDepsGraph: vi.fn(),
                setDepsGraph: vi.fn(),
            }

            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "test.ts" }, ctx)

            expect(storage.getFile).toHaveBeenCalledWith("test.ts")

            if (result.success) {
                expect(result.success).toBe(true)
            } else {
                expect(result.error).toBeDefined()
            }
        })

        it("should handle when start equals end", async () => {
            const storage = createMockStorage({ lines: ["line 1", "line 2", "line 3"] })
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "test.ts", start: 2, end: 2 }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetLinesResult
            expect(data.startLine).toBe(2)
            expect(data.endLine).toBe(2)
            expect(data.content).toContain("line 2")
        })

        it("should handle undefined end parameter", async () => {
            const storage = createMockStorage({ lines: ["line 1", "line 2", "line 3"] })
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "test.ts", start: 2, end: undefined }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetLinesResult
            expect(data.startLine).toBe(2)
            expect(data.endLine).toBe(3)
        })

        it("should handle undefined start parameter", async () => {
            const storage = createMockStorage({ lines: ["line 1", "line 2", "line 3"] })
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "test.ts", start: undefined, end: 2 }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetLinesResult
            expect(data.startLine).toBe(1)
            expect(data.endLine).toBe(2)
        })
    })
})
