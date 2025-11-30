import { describe, it, expect, vi, beforeEach } from "vitest"
import {
    GetComplexityTool,
    type GetComplexityResult,
} from "../../../../../src/infrastructure/tools/analysis/GetComplexityTool.js"
import type { ToolContext } from "../../../../../src/domain/services/ITool.js"
import type { IStorage } from "../../../../../src/domain/services/IStorage.js"
import type { FileMeta } from "../../../../../src/domain/value-objects/FileMeta.js"

function createMockFileMeta(partial: Partial<FileMeta> = {}): FileMeta {
    return {
        complexity: { loc: 10, nesting: 2, cyclomaticComplexity: 5, score: 25 },
        dependencies: [],
        dependents: [],
        isHub: false,
        isEntryPoint: false,
        fileType: "source",
        ...partial,
    }
}

function createMockStorage(metas: Map<string, FileMeta> = new Map()): IStorage {
    return {
        getFile: vi.fn().mockResolvedValue(null),
        setFile: vi.fn(),
        deleteFile: vi.fn(),
        getAllFiles: vi.fn().mockResolvedValue(new Map()),
        getFileCount: vi.fn().mockResolvedValue(0),
        getAST: vi.fn().mockResolvedValue(null),
        setAST: vi.fn(),
        deleteAST: vi.fn(),
        getAllASTs: vi.fn().mockResolvedValue(new Map()),
        getMeta: vi.fn().mockImplementation((p: string) => Promise.resolve(metas.get(p) ?? null)),
        setMeta: vi.fn(),
        deleteMeta: vi.fn(),
        getAllMetas: vi.fn().mockResolvedValue(metas),
        getSymbolIndex: vi.fn().mockResolvedValue(new Map()),
        setSymbolIndex: vi.fn(),
        getDepsGraph: vi.fn().mockResolvedValue({ imports: new Map(), importedBy: new Map() }),
        setDepsGraph: vi.fn(),
        getProjectConfig: vi.fn(),
        setProjectConfig: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
        isConnected: vi.fn().mockReturnValue(true),
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

describe("GetComplexityTool", () => {
    let tool: GetComplexityTool

    beforeEach(() => {
        tool = new GetComplexityTool()
    })

    describe("metadata", () => {
        it("should have correct name", () => {
            expect(tool.name).toBe("get_complexity")
        })

        it("should have correct category", () => {
            expect(tool.category).toBe("analysis")
        })

        it("should not require confirmation", () => {
            expect(tool.requiresConfirmation).toBe(false)
        })

        it("should have correct parameters", () => {
            expect(tool.parameters).toHaveLength(2)
            expect(tool.parameters[0].name).toBe("path")
            expect(tool.parameters[0].required).toBe(false)
            expect(tool.parameters[1].name).toBe("limit")
            expect(tool.parameters[1].required).toBe(false)
        })

        it("should have description", () => {
            expect(tool.description).toContain("complexity")
        })
    })

    describe("validateParams", () => {
        it("should return null for no params", () => {
            expect(tool.validateParams({})).toBeNull()
        })

        it("should return null for valid path", () => {
            expect(tool.validateParams({ path: "src/index.ts" })).toBeNull()
        })

        it("should return null for valid limit", () => {
            expect(tool.validateParams({ limit: 10 })).toBeNull()
        })

        it("should return null for valid path and limit", () => {
            expect(tool.validateParams({ path: "src", limit: 5 })).toBeNull()
        })

        it("should return error for non-string path", () => {
            expect(tool.validateParams({ path: 123 })).toBe("Parameter 'path' must be a string")
        })

        it("should return error for non-integer limit", () => {
            expect(tool.validateParams({ limit: 10.5 })).toBe(
                "Parameter 'limit' must be an integer",
            )
        })

        it("should return error for non-number limit", () => {
            expect(tool.validateParams({ limit: "10" })).toBe(
                "Parameter 'limit' must be an integer",
            )
        })

        it("should return error for limit less than 1", () => {
            expect(tool.validateParams({ limit: 0 })).toBe("Parameter 'limit' must be at least 1")
        })

        it("should return error for negative limit", () => {
            expect(tool.validateParams({ limit: -5 })).toBe("Parameter 'limit' must be at least 1")
        })
    })

    describe("execute", () => {
        it("should return complexity for all files without path", async () => {
            const metas = new Map<string, FileMeta>([
                [
                    "src/a.ts",
                    createMockFileMeta({
                        complexity: { loc: 100, nesting: 3, cyclomaticComplexity: 10, score: 50 },
                    }),
                ],
                [
                    "src/b.ts",
                    createMockFileMeta({
                        complexity: { loc: 50, nesting: 2, cyclomaticComplexity: 5, score: 25 },
                    }),
                ],
            ])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetComplexityResult
            expect(data.analyzedPath).toBeNull()
            expect(data.totalFiles).toBe(2)
            expect(data.files).toHaveLength(2)
        })

        it("should sort files by complexity score descending", async () => {
            const metas = new Map<string, FileMeta>([
                [
                    "src/low.ts",
                    createMockFileMeta({
                        complexity: { loc: 10, nesting: 1, cyclomaticComplexity: 2, score: 10 },
                    }),
                ],
                [
                    "src/high.ts",
                    createMockFileMeta({
                        complexity: { loc: 200, nesting: 5, cyclomaticComplexity: 25, score: 80 },
                    }),
                ],
                [
                    "src/mid.ts",
                    createMockFileMeta({
                        complexity: { loc: 50, nesting: 3, cyclomaticComplexity: 10, score: 40 },
                    }),
                ],
            ])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetComplexityResult
            expect(data.files[0].path).toBe("src/high.ts")
            expect(data.files[1].path).toBe("src/mid.ts")
            expect(data.files[2].path).toBe("src/low.ts")
        })

        it("should filter by path prefix", async () => {
            const metas = new Map<string, FileMeta>([
                ["src/a.ts", createMockFileMeta()],
                ["src/b.ts", createMockFileMeta()],
                ["lib/c.ts", createMockFileMeta()],
            ])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "src" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetComplexityResult
            expect(data.analyzedPath).toBe("src")
            expect(data.totalFiles).toBe(2)
            expect(data.files.every((f) => f.path.startsWith("src/"))).toBe(true)
        })

        it("should filter by specific file path", async () => {
            const metas = new Map<string, FileMeta>([
                [
                    "src/a.ts",
                    createMockFileMeta({
                        complexity: { loc: 100, nesting: 3, cyclomaticComplexity: 15, score: 55 },
                    }),
                ],
                ["src/b.ts", createMockFileMeta()],
            ])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "src/a.ts" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetComplexityResult
            expect(data.totalFiles).toBe(1)
            expect(data.files[0].path).toBe("src/a.ts")
            expect(data.files[0].metrics.score).toBe(55)
        })

        it("should respect limit parameter", async () => {
            const metas = new Map<string, FileMeta>([
                [
                    "src/a.ts",
                    createMockFileMeta({
                        complexity: { loc: 100, nesting: 3, cyclomaticComplexity: 10, score: 70 },
                    }),
                ],
                [
                    "src/b.ts",
                    createMockFileMeta({
                        complexity: { loc: 50, nesting: 2, cyclomaticComplexity: 5, score: 50 },
                    }),
                ],
                [
                    "src/c.ts",
                    createMockFileMeta({
                        complexity: { loc: 20, nesting: 1, cyclomaticComplexity: 2, score: 20 },
                    }),
                ],
            ])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ limit: 2 }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetComplexityResult
            expect(data.totalFiles).toBe(3)
            expect(data.files).toHaveLength(2)
            expect(data.files[0].metrics.score).toBe(70)
            expect(data.files[1].metrics.score).toBe(50)
        })

        it("should use default limit of 20", async () => {
            const metas = new Map<string, FileMeta>()
            for (let i = 0; i < 30; i++) {
                metas.set(`src/file${String(i)}.ts`, createMockFileMeta())
            }
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetComplexityResult
            expect(data.totalFiles).toBe(30)
            expect(data.files).toHaveLength(20)
        })

        it("should calculate average score", async () => {
            const metas = new Map<string, FileMeta>([
                [
                    "src/a.ts",
                    createMockFileMeta({
                        complexity: { loc: 100, nesting: 3, cyclomaticComplexity: 10, score: 60 },
                    }),
                ],
                [
                    "src/b.ts",
                    createMockFileMeta({
                        complexity: { loc: 50, nesting: 2, cyclomaticComplexity: 5, score: 40 },
                    }),
                ],
            ])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetComplexityResult
            expect(data.averageScore).toBe(50)
        })

        it("should calculate summary statistics", async () => {
            const metas = new Map<string, FileMeta>([
                [
                    "src/high.ts",
                    createMockFileMeta({
                        complexity: { loc: 200, nesting: 5, cyclomaticComplexity: 25, score: 75 },
                    }),
                ],
                [
                    "src/medium.ts",
                    createMockFileMeta({
                        complexity: { loc: 80, nesting: 3, cyclomaticComplexity: 12, score: 45 },
                    }),
                ],
                [
                    "src/low.ts",
                    createMockFileMeta({
                        complexity: { loc: 20, nesting: 1, cyclomaticComplexity: 3, score: 15 },
                    }),
                ],
            ])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetComplexityResult
            expect(data.summary.highComplexity).toBe(1)
            expect(data.summary.mediumComplexity).toBe(1)
            expect(data.summary.lowComplexity).toBe(1)
        })

        it("should return empty result for empty project", async () => {
            const storage = createMockStorage()
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetComplexityResult
            expect(data.totalFiles).toBe(0)
            expect(data.averageScore).toBe(0)
            expect(data.files).toEqual([])
            expect(data.summary).toEqual({
                highComplexity: 0,
                mediumComplexity: 0,
                lowComplexity: 0,
            })
        })

        it("should return error for non-existent path", async () => {
            const metas = new Map<string, FileMeta>([["src/a.ts", createMockFileMeta()]])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "nonexistent" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toContain("No files found at path")
        })

        it("should handle absolute paths", async () => {
            const metas = new Map<string, FileMeta>([
                ["src/a.ts", createMockFileMeta()],
                ["src/b.ts", createMockFileMeta()],
            ])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "/test/project/src" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetComplexityResult
            expect(data.analyzedPath).toBe("src")
            expect(data.totalFiles).toBe(2)
        })

        it("should include file metadata", async () => {
            const metas = new Map<string, FileMeta>([
                [
                    "src/hub.ts",
                    createMockFileMeta({
                        fileType: "source",
                        isHub: true,
                        complexity: { loc: 150, nesting: 4, cyclomaticComplexity: 18, score: 65 },
                    }),
                ],
            ])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetComplexityResult
            expect(data.files[0].fileType).toBe("source")
            expect(data.files[0].isHub).toBe(true)
            expect(data.files[0].metrics).toEqual({
                loc: 150,
                nesting: 4,
                cyclomaticComplexity: 18,
                score: 65,
            })
        })

        it("should include callId in result", async () => {
            const metas = new Map<string, FileMeta>([["src/a.ts", createMockFileMeta()]])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.callId).toMatch(/^get_complexity-\d+$/)
        })

        it("should include execution time in result", async () => {
            const metas = new Map<string, FileMeta>([["src/a.ts", createMockFileMeta()]])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.executionTimeMs).toBeGreaterThanOrEqual(0)
        })

        it("should handle storage errors gracefully", async () => {
            const storage = createMockStorage()
            ;(storage.getAllMetas as ReturnType<typeof vi.fn>).mockRejectedValue(
                new Error("Redis connection failed"),
            )
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toBe("Redis connection failed")
        })

        it("should round average score to 2 decimal places", async () => {
            const metas = new Map<string, FileMeta>([
                [
                    "src/a.ts",
                    createMockFileMeta({
                        complexity: { loc: 100, nesting: 3, cyclomaticComplexity: 10, score: 33 },
                    }),
                ],
                [
                    "src/b.ts",
                    createMockFileMeta({
                        complexity: { loc: 50, nesting: 2, cyclomaticComplexity: 5, score: 33 },
                    }),
                ],
                [
                    "src/c.ts",
                    createMockFileMeta({
                        complexity: { loc: 20, nesting: 1, cyclomaticComplexity: 2, score: 34 },
                    }),
                ],
            ])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetComplexityResult
            expect(data.averageScore).toBe(33.33)
        })

        it("should handle complexity threshold boundaries", async () => {
            const metas = new Map<string, FileMeta>([
                [
                    "src/exact-high.ts",
                    createMockFileMeta({
                        complexity: { loc: 200, nesting: 5, cyclomaticComplexity: 20, score: 60 },
                    }),
                ],
                [
                    "src/exact-medium.ts",
                    createMockFileMeta({
                        complexity: { loc: 100, nesting: 3, cyclomaticComplexity: 10, score: 30 },
                    }),
                ],
                [
                    "src/below-medium.ts",
                    createMockFileMeta({
                        complexity: { loc: 50, nesting: 2, cyclomaticComplexity: 5, score: 29 },
                    }),
                ],
            ])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetComplexityResult
            expect(data.summary.highComplexity).toBe(1)
            expect(data.summary.mediumComplexity).toBe(1)
            expect(data.summary.lowComplexity).toBe(1)
        })
    })
})
