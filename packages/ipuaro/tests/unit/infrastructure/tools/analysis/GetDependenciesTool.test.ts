import { describe, it, expect, vi, beforeEach } from "vitest"
import {
    GetDependenciesTool,
    type GetDependenciesResult,
} from "../../../../../src/infrastructure/tools/analysis/GetDependenciesTool.js"
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

describe("GetDependenciesTool", () => {
    let tool: GetDependenciesTool

    beforeEach(() => {
        tool = new GetDependenciesTool()
    })

    describe("metadata", () => {
        it("should have correct name", () => {
            expect(tool.name).toBe("get_dependencies")
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
            expect(tool.description).toContain("imports")
        })
    })

    describe("validateParams", () => {
        it("should return null for valid path", () => {
            expect(tool.validateParams({ path: "src/index.ts" })).toBeNull()
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
        it("should return dependencies for a file", async () => {
            const metas = new Map<string, FileMeta>([
                [
                    "src/index.ts",
                    createMockFileMeta({
                        dependencies: ["src/utils.ts", "src/config.ts"],
                    }),
                ],
                ["src/utils.ts", createMockFileMeta({ isHub: true })],
                ["src/config.ts", createMockFileMeta({ isEntryPoint: true })],
            ])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "src/index.ts" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetDependenciesResult
            expect(data.file).toBe("src/index.ts")
            expect(data.totalDependencies).toBe(2)
            expect(data.dependencies).toHaveLength(2)
        })

        it("should include metadata for each dependency", async () => {
            const metas = new Map<string, FileMeta>([
                [
                    "src/index.ts",
                    createMockFileMeta({
                        dependencies: ["src/utils.ts"],
                    }),
                ],
                [
                    "src/utils.ts",
                    createMockFileMeta({
                        isHub: true,
                        isEntryPoint: false,
                        fileType: "source",
                    }),
                ],
            ])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "src/index.ts" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetDependenciesResult
            expect(data.dependencies[0]).toEqual({
                path: "src/utils.ts",
                exists: true,
                isEntryPoint: false,
                isHub: true,
                fileType: "source",
            })
        })

        it("should handle file with no dependencies", async () => {
            const metas = new Map<string, FileMeta>([
                ["src/standalone.ts", createMockFileMeta({ dependencies: [] })],
            ])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "src/standalone.ts" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetDependenciesResult
            expect(data.totalDependencies).toBe(0)
            expect(data.dependencies).toEqual([])
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
                ["src/index.ts", createMockFileMeta({ dependencies: [] })],
            ])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "/test/project/src/index.ts" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetDependenciesResult
            expect(data.file).toBe("src/index.ts")
        })

        it("should mark non-existent dependencies", async () => {
            const metas = new Map<string, FileMeta>([
                [
                    "src/index.ts",
                    createMockFileMeta({
                        dependencies: ["src/missing.ts"],
                    }),
                ],
            ])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "src/index.ts" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetDependenciesResult
            expect(data.dependencies[0].exists).toBe(false)
            expect(data.dependencies[0].isHub).toBe(false)
            expect(data.dependencies[0].fileType).toBe("unknown")
        })

        it("should sort dependencies by path", async () => {
            const metas = new Map<string, FileMeta>([
                [
                    "src/index.ts",
                    createMockFileMeta({
                        dependencies: ["src/z.ts", "src/a.ts", "src/m.ts"],
                    }),
                ],
                ["src/z.ts", createMockFileMeta()],
                ["src/a.ts", createMockFileMeta()],
                ["src/m.ts", createMockFileMeta()],
            ])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "src/index.ts" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetDependenciesResult
            expect(data.dependencies[0].path).toBe("src/a.ts")
            expect(data.dependencies[1].path).toBe("src/m.ts")
            expect(data.dependencies[2].path).toBe("src/z.ts")
        })

        it("should include file type of source file", async () => {
            const metas = new Map<string, FileMeta>([
                [
                    "tests/index.test.ts",
                    createMockFileMeta({
                        fileType: "test",
                        dependencies: [],
                    }),
                ],
            ])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "tests/index.test.ts" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetDependenciesResult
            expect(data.fileType).toBe("test")
        })

        it("should include callId in result", async () => {
            const metas = new Map<string, FileMeta>([["src/index.ts", createMockFileMeta()]])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "src/index.ts" }, ctx)

            expect(result.callId).toMatch(/^get_dependencies-\d+$/)
        })

        it("should include execution time in result", async () => {
            const metas = new Map<string, FileMeta>([["src/index.ts", createMockFileMeta()]])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "src/index.ts" }, ctx)

            expect(result.executionTimeMs).toBeGreaterThanOrEqual(0)
        })

        it("should handle storage errors gracefully", async () => {
            const storage = createMockStorage()
            ;(storage.getMeta as ReturnType<typeof vi.fn>).mockRejectedValue(
                new Error("Redis connection failed"),
            )
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "src/index.ts" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toBe("Redis connection failed")
        })

        it("should trim path before searching", async () => {
            const metas = new Map<string, FileMeta>([["src/index.ts", createMockFileMeta()]])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "  src/index.ts  " }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetDependenciesResult
            expect(data.file).toBe("src/index.ts")
        })

        it("should handle many dependencies", async () => {
            const deps = Array.from({ length: 50 }, (_, i) => `src/dep${String(i)}.ts`)
            const metas = new Map<string, FileMeta>([
                ["src/index.ts", createMockFileMeta({ dependencies: deps })],
                ...deps.map((dep) => [dep, createMockFileMeta()] as [string, FileMeta]),
            ])
            const storage = createMockStorage(metas)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "src/index.ts" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetDependenciesResult
            expect(data.totalDependencies).toBe(50)
        })
    })
})
