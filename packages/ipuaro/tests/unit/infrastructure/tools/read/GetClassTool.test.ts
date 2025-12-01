import { describe, it, expect, vi, beforeEach } from "vitest"
import {
    GetClassTool,
    type GetClassResult,
} from "../../../../../src/infrastructure/tools/read/GetClassTool.js"
import type { ToolContext } from "../../../../../src/domain/services/ITool.js"
import type { IStorage } from "../../../../../src/domain/services/IStorage.js"
import type { FileAST, ClassInfo } from "../../../../../src/domain/value-objects/FileAST.js"

function createMockClass(overrides: Partial<ClassInfo> = {}): ClassInfo {
    return {
        name: "TestClass",
        lineStart: 1,
        lineEnd: 10,
        methods: [
            {
                name: "testMethod",
                lineStart: 3,
                lineEnd: 5,
                params: [],
                isAsync: false,
                visibility: "public",
                isStatic: false,
            },
        ],
        properties: [
            {
                name: "testProp",
                line: 2,
                visibility: "private",
                isStatic: false,
                isReadonly: false,
            },
        ],
        implements: [],
        isExported: true,
        isAbstract: false,
        ...overrides,
    }
}

function createMockAST(classes: ClassInfo[] = []): FileAST {
    return {
        imports: [],
        exports: [],
        functions: [],
        classes,
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

describe("GetClassTool", () => {
    let tool: GetClassTool

    beforeEach(() => {
        tool = new GetClassTool()
    })

    describe("metadata", () => {
        it("should have correct name", () => {
            expect(tool.name).toBe("get_class")
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
            expect(tool.validateParams({ path: "src/index.ts", name: "MyClass" })).toBeNull()
        })

        it("should return error for missing path", () => {
            expect(tool.validateParams({ name: "MyClass" })).toBe(
                "Parameter 'path' is required and must be a non-empty string",
            )
        })

        it("should return error for empty path", () => {
            expect(tool.validateParams({ path: "", name: "MyClass" })).toBe(
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
    })

    describe("execute", () => {
        it("should return class code with line numbers", async () => {
            const lines = [
                "export class TestClass {",
                "    private testProp: string",
                "    testMethod() {",
                "        return this.testProp",
                "    }",
                "}",
            ]
            const cls = createMockClass({
                name: "TestClass",
                lineStart: 1,
                lineEnd: 6,
            })
            const ast = createMockAST([cls])
            const storage = createMockStorage({ lines }, ast)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "test.ts", name: "TestClass" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetClassResult
            expect(data.path).toBe("test.ts")
            expect(data.name).toBe("TestClass")
            expect(data.startLine).toBe(1)
            expect(data.endLine).toBe(6)
            expect(data.content).toContain("1│export class TestClass {")
            expect(data.content).toContain("6│}")
        })

        it("should return class metadata", async () => {
            const lines = ["abstract class BaseService extends Service implements IService {", "}"]
            const cls = createMockClass({
                name: "BaseService",
                lineStart: 1,
                lineEnd: 2,
                isExported: false,
                isAbstract: true,
                extends: "Service",
                implements: ["IService"],
                methods: [
                    {
                        name: "init",
                        lineStart: 2,
                        lineEnd: 2,
                        params: [],
                        isAsync: true,
                        visibility: "public",
                        isStatic: false,
                    },
                    {
                        name: "destroy",
                        lineStart: 3,
                        lineEnd: 3,
                        params: [],
                        isAsync: false,
                        visibility: "protected",
                        isStatic: false,
                    },
                ],
                properties: [
                    {
                        name: "id",
                        line: 2,
                        visibility: "private",
                        isStatic: false,
                        isReadonly: true,
                    },
                ],
            })
            const ast = createMockAST([cls])
            const storage = createMockStorage({ lines }, ast)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "service.ts", name: "BaseService" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetClassResult
            expect(data.isExported).toBe(false)
            expect(data.isAbstract).toBe(true)
            expect(data.extends).toBe("Service")
            expect(data.implements).toEqual(["IService"])
            expect(data.methods).toEqual(["init", "destroy"])
            expect(data.properties).toEqual(["id"])
        })

        it("should return error when AST not found", async () => {
            const storage = createMockStorage({ lines: [] }, null)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "test.ts", name: "MyClass" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toContain('AST not found for "test.ts"')
        })

        it("should return error when class not found", async () => {
            const ast = createMockAST([
                createMockClass({ name: "ClassA" }),
                createMockClass({ name: "ClassB" }),
            ])
            const storage = createMockStorage({ lines: [] }, ast)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "test.ts", name: "NonExistent" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toContain('Class "NonExistent" not found')
            expect(result.error).toContain("Available: ClassA, ClassB")
        })

        it("should return error when no classes available", async () => {
            const ast = createMockAST([])
            const storage = createMockStorage({ lines: [] }, ast)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "test.ts", name: "MyClass" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toContain("Available: none")
        })

        it("should return error for path outside project root", async () => {
            const ctx = createMockContext()

            const result = await tool.execute({ path: "../outside/file.ts", name: "MyClass" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toBe("Path contains traversal patterns")
        })

        it("should handle class with no extends", async () => {
            const lines = ["class Simple {}"]
            const cls = createMockClass({
                name: "Simple",
                lineStart: 1,
                lineEnd: 1,
                extends: undefined,
            })
            const ast = createMockAST([cls])
            const storage = createMockStorage({ lines }, ast)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "test.ts", name: "Simple" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetClassResult
            expect(data.extends).toBeUndefined()
        })

        it("should handle class with empty implements", async () => {
            const lines = ["class NoInterfaces {}"]
            const cls = createMockClass({
                name: "NoInterfaces",
                lineStart: 1,
                lineEnd: 1,
                implements: [],
            })
            const ast = createMockAST([cls])
            const storage = createMockStorage({ lines }, ast)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "test.ts", name: "NoInterfaces" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetClassResult
            expect(data.implements).toEqual([])
        })

        it("should handle class with no methods or properties", async () => {
            const lines = ["class Empty {}"]
            const cls = createMockClass({
                name: "Empty",
                lineStart: 1,
                lineEnd: 1,
                methods: [],
                properties: [],
            })
            const ast = createMockAST([cls])
            const storage = createMockStorage({ lines }, ast)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "test.ts", name: "Empty" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetClassResult
            expect(data.methods).toEqual([])
            expect(data.properties).toEqual([])
        })

        it("should include callId in result", async () => {
            const lines = ["class Test {}"]
            const cls = createMockClass({ name: "Test", lineStart: 1, lineEnd: 1 })
            const ast = createMockAST([cls])
            const storage = createMockStorage({ lines }, ast)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "test.ts", name: "Test" }, ctx)

            expect(result.callId).toMatch(/^get_class-\d+$/)
        })

        it("should handle undefined extends in class", async () => {
            const lines = ["class StandaloneClass { method() {} }"]
            const cls = createMockClass({
                name: "StandaloneClass",
                lineStart: 1,
                lineEnd: 1,
                extends: undefined,
                methods: [{ name: "method", lineStart: 1, lineEnd: 1 }],
            })
            const ast = createMockAST([cls])
            const storage = createMockStorage({ lines }, ast)
            const ctx = createMockContext(storage)

            const result = await tool.execute({ path: "test.ts", name: "StandaloneClass" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetClassResult
            expect(data.extends).toBeUndefined()
            expect(data.methods.length).toBe(1)
        })

        it("should handle error when reading lines fails", async () => {
            const ast = createMockAST([createMockClass({ name: "Test", lineStart: 1, lineEnd: 1 })])
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

            const result = await tool.execute({ path: "test.ts", name: "Test" }, ctx)

            expect(result.success).toBe(false)
        })
    })
})
