import { describe, it, expect, vi, beforeEach } from "vitest"
import {
    GetDependentsTool,
    type GetDependentsResult,
} from "../../../../../src/infrastructure/tools/analysis/GetDependentsTool.js"
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

describe("GetDependentsTool", () => {
    let tool: GetDependentsTool

    beforeEach(() => {
        tool = new GetDependentsTool()
    })

    describe("metadata", () => {
        it("should have correct name", () => {
            expect(tool.name).toBe("get_dependents")
        })

        it("should have correct category", () => {
            expect(tool.category).toBe("analysis")
        })

        it("should not require confirmation", () => {
            expect(tool.requiresConfirmation).toBe(false)
        })

        it("should have correct parameters", () => {
            expect(tool.parameters).toHaveLength(1)
            expect(tool.parameters[0].name).toBe("path")
            expect(tool.parameters[0].required).toBe(true)
        })

        it("should have description", () => {
            expect(tool.description).toContain("import")
        })
    })

    describe("validateParams", () => {
        it("should return null for valid path", () => {
            expect(tool.validateParams({ path: "src/utils.ts" })).toBeNull()
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
        })

        it("should return error for whitespace-only path", () => {
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
        it("should return dependents for a file", async () => {
            const metas = new Map<string, FileMeta>([
                [
                    "src/utils.ts",
                    createMockFileMeta({
                        dependents: ["src/index.ts", "src/app.ts"],
                        isHub: true,
                    }),
                ],
                ["src/index.ts", createMockFileMeta({ isEntryPoint: true })],
                ["src/app.ts", createMockFileMeta()],
            ])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "src/utils.ts" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetDependentsResult
            expect(data.file).toBe("src/utils.ts")
            expect(data.totalDependents).toBe(2)
            expect(data.isHub).toBe(true)
            expect(data.dependents).toHaveLength(2)
        })

        it("should include metadata for each dependent", async () => {
            const metas = new Map<string, FileMeta>([
                [
                    "src/utils.ts",
                    createMockFileMeta({
                        dependents: ["src/index.ts"],
                    }),
                ],
                [
                    "src/index.ts",
                    createMockFileMeta({
                        isHub: false,
                        isEntryPoint: true,
                        fileType: "source",
                        complexity: { loc: 50, nesting: 3, cyclomaticComplexity: 10, score: 45 },
                    }),
                ],
            ])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "src/utils.ts" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetDependentsResult
            expect(data.dependents[0]).toEqual({
                path: "src/index.ts",
                isEntryPoint: true,
                isHub: false,
                fileType: "source",
                complexityScore: 45,
            })
        })

        it("should handle file with no dependents", async () => {
            const metas = new Map<string, FileMeta>([
                ["src/isolated.ts", createMockFileMeta({ dependents: [] })],
            ])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "src/isolated.ts" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetDependentsResult
            expect(data.totalDependents).toBe(0)
            expect(data.isHub).toBe(false)
            expect(data.dependents).toEqual([])
        })

        it("should return error for non-existent file", async () => {
            const storage = createMockStorage()
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "nonexistent.ts" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toContain("File not found or not indexed")
        })

        it("should handle absolute paths", async () => {
            const metas = new Map<string, FileMeta>([
                ["src/utils.ts", createMockFileMeta({ dependents: [] })],
            ])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "/test/project/src/utils.ts" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetDependentsResult
            expect(data.file).toBe("src/utils.ts")
        })

        it("should handle missing dependent metadata", async () => {
            const metas = new Map<string, FileMeta>([
                [
                    "src/utils.ts",
                    createMockFileMeta({
                        dependents: ["src/missing.ts"],
                    }),
                ],
            ])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "src/utils.ts" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetDependentsResult
            expect(data.dependents[0].isHub).toBe(false)
            expect(data.dependents[0].isEntryPoint).toBe(false)
            expect(data.dependents[0].fileType).toBe("unknown")
            expect(data.dependents[0].complexityScore).toBe(0)
        })

        it("should sort dependents by path", async () => {
            const metas = new Map<string, FileMeta>([
                [
                    "src/utils.ts",
                    createMockFileMeta({
                        dependents: ["src/z.ts", "src/a.ts", "src/m.ts"],
                    }),
                ],
                ["src/z.ts", createMockFileMeta()],
                ["src/a.ts", createMockFileMeta()],
                ["src/m.ts", createMockFileMeta()],
            ])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "src/utils.ts" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetDependentsResult
            expect(data.dependents[0].path).toBe("src/a.ts")
            expect(data.dependents[1].path).toBe("src/m.ts")
            expect(data.dependents[2].path).toBe("src/z.ts")
        })

        it("should include file type of source file", async () => {
            const metas = new Map<string, FileMeta>([
                [
                    "src/types.ts",
                    createMockFileMeta({
                        fileType: "types",
                        dependents: [],
                    }),
                ],
            ])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "src/types.ts" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetDependentsResult
            expect(data.fileType).toBe("types")
        })

        it("should correctly identify hub files", async () => {
            const dependents = Array.from({ length: 10 }, (_, i) => `src/file${String(i)}.ts`)
            const metas = new Map<string, FileMeta>([
                [
                    "src/core.ts",
                    createMockFileMeta({
                        dependents,
                        isHub: true,
                    }),
                ],
                ...dependents.map((dep) => [dep, createMockFileMeta()] as [string, FileMeta]),
            ])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "src/core.ts" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetDependentsResult
            expect(data.isHub).toBe(true)
            expect(data.totalDependents).toBe(10)
        })

        it("should include callId in result", async () => {
            const metas = new Map<string, FileMeta>([["src/utils.ts", createMockFileMeta()]])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "src/utils.ts" }, ctx)

            expect(result.callId).toMatch(/^get_dependents-\d+$/)
        })

        it("should include execution time in result", async () => {
            const metas = new Map<string, FileMeta>([["src/utils.ts", createMockFileMeta()]])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "src/utils.ts" }, ctx)

            expect(result.executionTimeMs).toBeGreaterThanOrEqual(0)
        })

        it("should handle storage errors gracefully", async () => {
            const storage = createMockStorage()
            ;(storage.getMeta as ReturnType<typeof vi.fn>).mockRejectedValue(
                new Error("Redis connection failed"),
            )
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "src/utils.ts" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toBe("Redis connection failed")
        })

        it("should trim path before searching", async () => {
            const metas = new Map<string, FileMeta>([["src/utils.ts", createMockFileMeta()]])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "  src/utils.ts  " }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetDependentsResult
            expect(data.file).toBe("src/utils.ts")
        })

        it("should include complexity scores for dependents", async () => {
            const metas = new Map<string, FileMeta>([
                [
                    "src/utils.ts",
                    createMockFileMeta({
                        dependents: ["src/high.ts", "src/low.ts"],
                    }),
                ],
                [
                    "src/high.ts",
                    createMockFileMeta({
                        complexity: { loc: 200, nesting: 5, cyclomaticComplexity: 20, score: 80 },
                    }),
                ],
                [
                    "src/low.ts",
                    createMockFileMeta({
                        complexity: { loc: 20, nesting: 1, cyclomaticComplexity: 2, score: 10 },
                    }),
                ],
            ])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "src/utils.ts" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetDependentsResult
            const highDep = data.dependents.find((d) => d.path === "src/high.ts")
            const lowDep = data.dependents.find((d) => d.path === "src/low.ts")
            expect(highDep?.complexityScore).toBe(80)
            expect(lowDep?.complexityScore).toBe(10)
        })
    })
})
