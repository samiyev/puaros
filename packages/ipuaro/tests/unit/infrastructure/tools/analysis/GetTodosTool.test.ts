import { describe, it, expect, vi, beforeEach } from "vitest"
import {
    GetTodosTool,
    type GetTodosResult,
} from "../../../../../src/infrastructure/tools/analysis/GetTodosTool.js"
import type { ToolContext } from "../../../../../src/domain/services/ITool.js"
import type { IStorage } from "../../../../../src/domain/services/IStorage.js"
import type { FileData } from "../../../../../src/domain/value-objects/FileData.js"

function createMockFileData(lines: string[]): FileData {
    return {
        lines,
        hash: "abc123",
        size: lines.join("\n").length,
        lastModified: Date.now(),
    }
}

function createMockStorage(files: Map<string, FileData> = new Map()): IStorage {
    return {
        getFile: vi.fn().mockImplementation((p: string) => Promise.resolve(files.get(p) ?? null)),
        setFile: vi.fn(),
        deleteFile: vi.fn(),
        getAllFiles: vi.fn().mockResolvedValue(files),
        getFileCount: vi.fn().mockResolvedValue(files.size),
        getAST: vi.fn().mockResolvedValue(null),
        setAST: vi.fn(),
        deleteAST: vi.fn(),
        getAllASTs: vi.fn().mockResolvedValue(new Map()),
        getMeta: vi.fn().mockResolvedValue(null),
        setMeta: vi.fn(),
        deleteMeta: vi.fn(),
        getAllMetas: vi.fn().mockResolvedValue(new Map()),
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

describe("GetTodosTool", () => {
    let tool: GetTodosTool

    beforeEach(() => {
        tool = new GetTodosTool()
    })

    describe("metadata", () => {
        it("should have correct name", () => {
            expect(tool.name).toBe("get_todos")
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
            expect(tool.parameters[1].name).toBe("type")
            expect(tool.parameters[1].required).toBe(false)
        })

        it("should have description", () => {
            expect(tool.description).toContain("TODO")
            expect(tool.description).toContain("FIXME")
        })
    })

    describe("validateParams", () => {
        it("should return null for no params", () => {
            expect(tool.validateParams({})).toBeNull()
        })

        it("should return null for valid path", () => {
            expect(tool.validateParams({ path: "src" })).toBeNull()
        })

        it("should return null for valid type", () => {
            expect(tool.validateParams({ type: "TODO" })).toBeNull()
        })

        it("should return null for lowercase type", () => {
            expect(tool.validateParams({ type: "fixme" })).toBeNull()
        })

        it("should return null for path and type", () => {
            expect(tool.validateParams({ path: "src", type: "TODO" })).toBeNull()
        })

        it("should return error for non-string path", () => {
            expect(tool.validateParams({ path: 123 })).toBe("Parameter 'path' must be a string")
        })

        it("should return error for non-string type", () => {
            expect(tool.validateParams({ type: 123 })).toBe("Parameter 'type' must be a string")
        })

        it("should return error for invalid type", () => {
            expect(tool.validateParams({ type: "INVALID" })).toBe(
                "Parameter 'type' must be one of: TODO, FIXME, HACK, XXX, BUG, NOTE",
            )
        })
    })

    describe("execute", () => {
        it("should find TODO comments", async () => {
            const files = new Map<string, FileData>([
                [
                    "src/index.ts",
                    createMockFileData([
                        "// TODO: implement this",
                        "function foo() {}",
                        "// TODO: add tests",
                    ]),
                ],
            ])
            const storage = createMockStorage(files)
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetTodosResult
            expect(data.totalTodos).toBe(2)
            expect(data.todos[0].type).toBe("TODO")
            expect(data.todos[0].text).toBe("implement this")
            expect(data.todos[1].text).toBe("add tests")
        })

        it("should find FIXME comments", async () => {
            const files = new Map<string, FileData>([
                [
                    "src/index.ts",
                    createMockFileData(["// FIXME: broken logic here", "const x = 1"]),
                ],
            ])
            const storage = createMockStorage(files)
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetTodosResult
            expect(data.totalTodos).toBe(1)
            expect(data.todos[0].type).toBe("FIXME")
            expect(data.todos[0].text).toBe("broken logic here")
        })

        it("should find HACK comments", async () => {
            const files = new Map<string, FileData>([
                ["src/index.ts", createMockFileData(["// HACK: temporary workaround"])],
            ])
            const storage = createMockStorage(files)
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetTodosResult
            expect(data.todos[0].type).toBe("HACK")
        })

        it("should find XXX comments", async () => {
            const files = new Map<string, FileData>([
                ["src/index.ts", createMockFileData(["// XXX: needs attention"])],
            ])
            const storage = createMockStorage(files)
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetTodosResult
            expect(data.todos[0].type).toBe("XXX")
        })

        it("should find BUG comments", async () => {
            const files = new Map<string, FileData>([
                ["src/index.ts", createMockFileData(["// BUG: race condition"])],
            ])
            const storage = createMockStorage(files)
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetTodosResult
            expect(data.todos[0].type).toBe("BUG")
        })

        it("should find NOTE comments", async () => {
            const files = new Map<string, FileData>([
                ["src/index.ts", createMockFileData(["// NOTE: important consideration"])],
            ])
            const storage = createMockStorage(files)
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetTodosResult
            expect(data.todos[0].type).toBe("NOTE")
        })

        it("should find comments in block comments", async () => {
            const files = new Map<string, FileData>([
                ["src/index.ts", createMockFileData(["/*", " * TODO: in block comment", " */"])],
            ])
            const storage = createMockStorage(files)
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetTodosResult
            expect(data.totalTodos).toBe(1)
            expect(data.todos[0].text).toBe("in block comment")
        })

        it("should find comments with author annotation", async () => {
            const files = new Map<string, FileData>([
                ["src/index.ts", createMockFileData(["// TODO(john): fix this"])],
            ])
            const storage = createMockStorage(files)
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetTodosResult
            expect(data.todos[0].text).toBe("fix this")
        })

        it("should handle TODO without colon", async () => {
            const files = new Map<string, FileData>([
                ["src/index.ts", createMockFileData(["// TODO implement feature"])],
            ])
            const storage = createMockStorage(files)
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetTodosResult
            expect(data.todos[0].text).toBe("implement feature")
        })

        it("should filter by type", async () => {
            const files = new Map<string, FileData>([
                [
                    "src/index.ts",
                    createMockFileData([
                        "// TODO: task one",
                        "// FIXME: bug here",
                        "// TODO: task two",
                    ]),
                ],
            ])
            const storage = createMockStorage(files)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ type: "TODO" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetTodosResult
            expect(data.totalTodos).toBe(2)
            expect(data.todos.every((t) => t.type === "TODO")).toBe(true)
        })

        it("should filter by type case-insensitively", async () => {
            const files = new Map<string, FileData>([
                ["src/index.ts", createMockFileData(["// TODO: task", "// FIXME: bug"])],
            ])
            const storage = createMockStorage(files)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ type: "todo" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetTodosResult
            expect(data.totalTodos).toBe(1)
            expect(data.todos[0].type).toBe("TODO")
        })

        it("should filter by path", async () => {
            const files = new Map<string, FileData>([
                ["src/a.ts", createMockFileData(["// TODO: in src"])],
                ["lib/b.ts", createMockFileData(["// TODO: in lib"])],
            ])
            const storage = createMockStorage(files)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "src" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetTodosResult
            expect(data.searchedPath).toBe("src")
            expect(data.totalTodos).toBe(1)
            expect(data.todos[0].path).toBe("src/a.ts")
        })

        it("should filter by specific file", async () => {
            const files = new Map<string, FileData>([
                ["src/a.ts", createMockFileData(["// TODO: in a"])],
                ["src/b.ts", createMockFileData(["// TODO: in b"])],
            ])
            const storage = createMockStorage(files)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "src/a.ts" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetTodosResult
            expect(data.totalTodos).toBe(1)
            expect(data.todos[0].path).toBe("src/a.ts")
        })

        it("should return error for non-existent path", async () => {
            const files = new Map<string, FileData>([
                ["src/a.ts", createMockFileData(["// TODO: task"])],
            ])
            const storage = createMockStorage(files)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "nonexistent" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toContain("No files found at path")
        })

        it("should count by type", async () => {
            const files = new Map<string, FileData>([
                [
                    "src/index.ts",
                    createMockFileData([
                        "// TODO: task 1",
                        "// TODO: task 2",
                        "// FIXME: bug",
                        "// HACK: workaround",
                    ]),
                ],
            ])
            const storage = createMockStorage(files)
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetTodosResult
            expect(data.byType.TODO).toBe(2)
            expect(data.byType.FIXME).toBe(1)
            expect(data.byType.HACK).toBe(1)
            expect(data.byType.XXX).toBe(0)
            expect(data.byType.BUG).toBe(0)
            expect(data.byType.NOTE).toBe(0)
        })

        it("should count files with todos", async () => {
            const files = new Map<string, FileData>([
                ["src/a.ts", createMockFileData(["// TODO: task"])],
                ["src/b.ts", createMockFileData(["const x = 1"])],
                ["src/c.ts", createMockFileData(["// TODO: another task"])],
            ])
            const storage = createMockStorage(files)
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetTodosResult
            expect(data.filesWithTodos).toBe(2)
        })

        it("should sort results by path then line", async () => {
            const files = new Map<string, FileData>([
                ["src/b.ts", createMockFileData(["// TODO: b1", "", "// TODO: b2"])],
                ["src/a.ts", createMockFileData(["// TODO: a1"])],
            ])
            const storage = createMockStorage(files)
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetTodosResult
            expect(data.todos[0].path).toBe("src/a.ts")
            expect(data.todos[1].path).toBe("src/b.ts")
            expect(data.todos[1].line).toBe(1)
            expect(data.todos[2].path).toBe("src/b.ts")
            expect(data.todos[2].line).toBe(3)
        })

        it("should include line context", async () => {
            const files = new Map<string, FileData>([
                ["src/index.ts", createMockFileData(["    // TODO: indented task"])],
            ])
            const storage = createMockStorage(files)
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetTodosResult
            expect(data.todos[0].context).toBe("// TODO: indented task")
        })

        it("should return empty result for empty project", async () => {
            const storage = createMockStorage()
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetTodosResult
            expect(data.totalTodos).toBe(0)
            expect(data.filesWithTodos).toBe(0)
            expect(data.todos).toEqual([])
        })

        it("should return empty result when no todos found", async () => {
            const files = new Map<string, FileData>([
                ["src/index.ts", createMockFileData(["const x = 1", "const y = 2"])],
            ])
            const storage = createMockStorage(files)
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetTodosResult
            expect(data.totalTodos).toBe(0)
        })

        it("should handle TODO without description", async () => {
            const files = new Map<string, FileData>([
                ["src/index.ts", createMockFileData(["// TODO:"])],
            ])
            const storage = createMockStorage(files)
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetTodosResult
            expect(data.todos[0].text).toBe("(no description)")
        })

        it("should handle absolute paths", async () => {
            const files = new Map<string, FileData>([
                ["src/a.ts", createMockFileData(["// TODO: task"])],
            ])
            const storage = createMockStorage(files)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "/test/project/src" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetTodosResult
            expect(data.searchedPath).toBe("src")
        })

        it("should find todos with hash comments", async () => {
            const files = new Map<string, FileData>([
                ["script.sh", createMockFileData(["# TODO: shell script task"])],
            ])
            const storage = createMockStorage(files)
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetTodosResult
            expect(data.totalTodos).toBe(1)
            expect(data.todos[0].text).toBe("shell script task")
        })

        it("should include callId in result", async () => {
            const storage = createMockStorage()
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.callId).toMatch(/^get_todos-\d+$/)
        })

        it("should include execution time in result", async () => {
            const storage = createMockStorage()
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.executionTimeMs).toBeGreaterThanOrEqual(0)
        })

        it("should handle storage errors gracefully", async () => {
            const storage = createMockStorage()
            ;(storage.getAllFiles as ReturnType<typeof vi.fn>).mockRejectedValue(
                new Error("Redis connection failed"),
            )
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toBe("Redis connection failed")
        })

        it("should find lowercase todo markers", async () => {
            const files = new Map<string, FileData>([
                ["src/index.ts", createMockFileData(["// todo: lowercase"])],
            ])
            const storage = createMockStorage(files)
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetTodosResult
            expect(data.totalTodos).toBe(1)
            expect(data.todos[0].type).toBe("TODO")
        })

        it("should handle multiple files with todos", async () => {
            const files = new Map<string, FileData>([
                ["src/a.ts", createMockFileData(["// TODO: a1", "// TODO: a2"])],
                ["src/b.ts", createMockFileData(["// FIXME: b1"])],
                ["src/c.ts", createMockFileData(["// HACK: c1", "// BUG: c2"])],
            ])
            const storage = createMockStorage(files)
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetTodosResult
            expect(data.totalTodos).toBe(5)
            expect(data.filesWithTodos).toBe(3)
        })

        it("should correctly identify line numbers", async () => {
            const files = new Map<string, FileData>([
                [
                    "src/index.ts",
                    createMockFileData([
                        "const a = 1",
                        "const b = 2",
                        "// TODO: on line 3",
                        "const c = 3",
                    ]),
                ],
            ])
            const storage = createMockStorage(files)
            const ctx = createMockContext(storage)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetTodosResult
            expect(data.todos[0].line).toBe(3)
        })
    })
})
