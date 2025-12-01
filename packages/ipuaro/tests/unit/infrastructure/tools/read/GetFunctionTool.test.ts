import { describe, it, expect, vi, beforeEach } from "vitest"
import {
    GetFunctionTool,
    type GetFunctionResult,
} from "../../../../../src/infrastructure/tools/read/GetFunctionTool.js"
import type { ToolContext } from "../../../../../src/domain/services/ITool.js"
import type { IStorage } from "../../../../../src/domain/services/IStorage.js"
import type { FileAST, FunctionInfo } from "../../../../../src/domain/value-objects/FileAST.js"

function createMockFunction(overrides: Partial<FunctionInfo> = {}): FunctionInfo {
    return {
        name: "testFunction",
        lineStart: 1,
        lineEnd: 5,
        params: [{ name: "arg1", optional: false, hasDefault: false }],
        isAsync: false,
        isExported: true,
        returnType: "void",
        ...overrides,
    }
}

function createMockAST(functions: FunctionInfo[] = []): FileAST {
    return {
        imports: [],
        exports: [],
        functions,
        classes: [],
        interfaces: [],
        typeAliases: [],
        parseError: false,
    }
}

function createMockStorage(
    fileData: { lines: string[] } | null = null,
    ast: FileAST | null = null,
): IStorage {
    return {
        getFile: vi.fn().mockResolvedValue(fileData),
        setFile: vi.fn(),
        deleteFile: vi.fn(),
        getAllFiles: vi.fn(),
        getAST: vi.fn().mockResolvedValue(ast),
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

describe("GetFunctionTool", () => {
    let tool: GetFunctionTool

    beforeEach(() => {
        tool = new GetFunctionTool()
    })

    describe("metadata", () => {
        it("should have correct name", () => {
            expect(tool.name).toBe("get_function")
        })

        it("should have correct category", () => {
            expect(tool.category).toBe("read")
        })

        it("should not require confirmation", () => {
            expect(tool.requiresConfirmation).toBe(false)
        })

        it("should have correct parameters", () => {
            expect(tool.parameters).toHaveLength(2)
            expect(tool.parameters[0].name).toBe("path")
            expect(tool.parameters[0].required).toBe(true)
            expect(tool.parameters[1].name).toBe("name")
            expect(tool.parameters[1].required).toBe(true)
        })
    })

    describe("validateParams", () => {
        it("should return null for valid params", () => {
            expect(tool.validateParams({ path: "src/index.ts", name: "myFunc" })).toBeNull()
        })

        it("should return error for missing path", () => {
            expect(tool.validateParams({ name: "myFunc" })).toBe(
                "Parameter 'path' is required and must be a non-empty string",
            )
        })

        it("should return error for empty path", () => {
            expect(tool.validateParams({ path: "", name: "myFunc" })).toBe(
                "Parameter 'path' is required and must be a non-empty string",
            )
        })

        it("should return error for missing name", () => {
            expect(tool.validateParams({ path: "test.ts" })).toBe(
                "Parameter 'name' is required and must be a non-empty string",
            )
        })

        it("should return error for empty name", () => {
            expect(tool.validateParams({ path: "test.ts", name: "" })).toBe(
                "Parameter 'name' is required and must be a non-empty string",
            )
        })

        it("should return error for whitespace-only name", () => {
            expect(tool.validateParams({ path: "test.ts", name: "   " })).toBe(
                "Parameter 'name' is required and must be a non-empty string",
            )
        })
    })

    describe("execute", () => {
        it("should return function code with line numbers", async () => {
            const lines = [
                "function testFunction(arg1) {",
                "    console.log(arg1)",
                "    return arg1",
                "}",
                "",
            ]
            const func = createMockFunction({
                name: "testFunction",
                lineStart: 1,
                lineEnd: 4,
            })
            const ast = createMockAST([func])
            const storage = createMockStorage({ lines }, ast)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "test.ts", name: "testFunction" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetFunctionResult
            expect(data.path).toBe("test.ts")
            expect(data.name).toBe("testFunction")
            expect(data.startLine).toBe(1)
            expect(data.endLine).toBe(4)
            expect(data.content).toContain("1│function testFunction(arg1) {")
            expect(data.content).toContain("4│}")
        })

        it("should return function metadata", async () => {
            const lines = ["async function fetchData(url, options) {", "    return fetch(url)", "}"]
            const func = createMockFunction({
                name: "fetchData",
                lineStart: 1,
                lineEnd: 3,
                isAsync: true,
                isExported: false,
                params: [
                    { name: "url", optional: false, hasDefault: false },
                    { name: "options", optional: true, hasDefault: false },
                ],
                returnType: "Promise<Response>",
            })
            const ast = createMockAST([func])
            const storage = createMockStorage({ lines }, ast)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "api.ts", name: "fetchData" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetFunctionResult
            expect(data.isAsync).toBe(true)
            expect(data.isExported).toBe(false)
            expect(data.params).toEqual(["url", "options"])
            expect(data.returnType).toBe("Promise<Response>")
        })

        it("should return error when AST not found", async () => {
            const storage = createMockStorage({ lines: [] }, null)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "test.ts", name: "myFunc" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toContain('AST not found for "test.ts"')
        })

        it("should return error when function not found", async () => {
            const ast = createMockAST([
                createMockFunction({ name: "existingFunc" }),
                createMockFunction({ name: "anotherFunc" }),
            ])
            const storage = createMockStorage({ lines: [] }, ast)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "test.ts", name: "nonExistent" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toContain('Function "nonExistent" not found')
            expect(result.error).toContain("Available: existingFunc, anotherFunc")
        })

        it("should return error when no functions available", async () => {
            const ast = createMockAST([])
            const storage = createMockStorage({ lines: [] }, ast)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "test.ts", name: "myFunc" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toContain("Available: none")
        })

        it("should return error for path outside project root", async () => {
            const ctx = createMockContext()

            const result = await tool.execute({ path: "../outside/file.ts", name: "myFunc" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toBe("Path contains traversal patterns")
        })

        it("should pad line numbers correctly for large files", async () => {
            const lines = Array.from({ length: 200 }, (_, i) => `line ${i + 1}`)
            const func = createMockFunction({
                name: "bigFunction",
                lineStart: 95,
                lineEnd: 105,
            })
            const ast = createMockAST([func])
            const storage = createMockStorage({ lines }, ast)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "big.ts", name: "bigFunction" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetFunctionResult
            expect(data.content).toContain(" 95│line 95")
            expect(data.content).toContain("100│line 100")
            expect(data.content).toContain("105│line 105")
        })

        it("should include callId in result", async () => {
            const lines = ["function test() {}"]
            const func = createMockFunction({ name: "test", lineStart: 1, lineEnd: 1 })
            const ast = createMockAST([func])
            const storage = createMockStorage({ lines }, ast)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "test.ts", name: "test" }, ctx)

            expect(result.callId).toMatch(/^get_function-\d+$/)
        })

        it("should handle function with no return type", async () => {
            const lines = ["function noReturn() {}"]
            const func = createMockFunction({
                name: "noReturn",
                lineStart: 1,
                lineEnd: 1,
                returnType: undefined,
            })
            const ast = createMockAST([func])
            const storage = createMockStorage({ lines }, ast)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "test.ts", name: "noReturn" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetFunctionResult
            expect(data.returnType).toBeUndefined()
        })

        it("should handle function with no params", async () => {
            const lines = ["function noParams() {}"]
            const func = createMockFunction({
                name: "noParams",
                lineStart: 1,
                lineEnd: 1,
                params: [],
            })
            const ast = createMockAST([func])
            const storage = createMockStorage({ lines }, ast)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "test.ts", name: "noParams" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetFunctionResult
            expect(data.params).toEqual([])
        })

        it("should handle error when reading lines fails", async () => {
            const ast = createMockAST([createMockFunction({ name: "test", lineStart: 1, lineEnd: 1 })])
            const storage: IStorage = {
                getFile: vi.fn().mockResolvedValue(null),
                getAST: vi.fn().mockResolvedValue(ast),
                setFile: vi.fn(),
                deleteFile: vi.fn(),
                getAllFiles: vi.fn(),
                setAST: vi.fn(),
                getSymbolIndex: vi.fn(),
                setSymbolIndex: vi.fn(),
                getDepsGraph: vi.fn(),
                setDepsGraph: vi.fn(),
            }
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "test.ts", name: "test" }, ctx)

            expect(result.success).toBe(false)
        })

        it("should handle undefined returnType", async () => {
            const lines = ["function implicitReturn() { return }"]
            const func = createMockFunction({
                name: "implicitReturn",
                lineStart: 1,
                lineEnd: 1,
                returnType: undefined,
                isAsync: false,
            })
            const ast = createMockAST([func])
            const storage = createMockStorage({ lines }, ast)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "test.ts", name: "implicitReturn" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetFunctionResult
            expect(data.returnType).toBeUndefined()
            expect(data.isAsync).toBe(false)
        })
    })
})
