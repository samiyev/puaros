import { describe, it, expect } from "vitest"
import {
    SYSTEM_PROMPT,
    buildInitialContext,
    createProjectStructure,
    type ProjectStructure,
} from "../../../../src/infrastructure/llm/prompts.js"
import type { FileAST } from "../../../../src/domain/value-objects/FileAST.js"
import type { FileMeta } from "../../../../src/domain/value-objects/FileMeta.js"

describe("prompts", () => {
    describe("SYSTEM_PROMPT", () => {
        it("should define the AI assistant role", () => {
            expect(SYSTEM_PROMPT).toContain("expert AI coding assistant")
        })

        it("should list available tools", () => {
            expect(SYSTEM_PROMPT).toContain("get_lines")
            expect(SYSTEM_PROMPT).toContain("get_function")
            expect(SYSTEM_PROMPT).toContain("get_class")
            expect(SYSTEM_PROMPT).toContain("edit_lines")
            expect(SYSTEM_PROMPT).toContain("find_references")
        })

        it("should include usage rules", () => {
            expect(SYSTEM_PROMPT).toContain("Rules")
            expect(SYSTEM_PROMPT).toContain("Always use tools to read code")
        })

        it("should include tool call format", () => {
            expect(SYSTEM_PROMPT).toContain("tool_call")
            expect(SYSTEM_PROMPT).toContain("XML format")
        })
    })

    describe("createProjectStructure", () => {
        it("should create structure from file paths", () => {
            const structure = createProjectStructure("/project", "my-project", [
                "/project/src/index.ts",
                "/project/src/utils.ts",
                "/project/tests/index.test.ts",
            ])

            expect(structure.rootPath).toBe("/project")
            expect(structure.name).toBe("my-project")
            expect(structure.fileCount).toBe(3)
            expect(structure.filesByDirectory.size).toBe(2)
        })

        it("should group files by directory", () => {
            const structure = createProjectStructure("/project", "test", [
                "/project/src/a.ts",
                "/project/src/b.ts",
                "/project/lib/c.ts",
            ])

            expect(structure.filesByDirectory.get("/project/src")).toEqual(["a.ts", "b.ts"])
            expect(structure.filesByDirectory.get("/project/lib")).toEqual(["c.ts"])
        })

        it("should handle empty file list", () => {
            const structure = createProjectStructure("/project", "empty", [])

            expect(structure.fileCount).toBe(0)
            expect(structure.filesByDirectory.size).toBe(0)
        })

        it("should handle files in root directory", () => {
            const structure = createProjectStructure("/project", "root-files", [
                "/project/package.json",
                "/project/tsconfig.json",
            ])

            expect(structure.filesByDirectory.get("/project")).toEqual([
                "package.json",
                "tsconfig.json",
            ])
        })

        it("should handle file without directory separator", () => {
            const structure = createProjectStructure("/project", "test", ["standalone.ts"])

            expect(structure.filesByDirectory.get("/project")).toEqual(["standalone.ts"])
        })
    })

    describe("buildInitialContext", () => {
        const createMockAST = (overrides: Partial<FileAST> = {}): FileAST => ({
            imports: [],
            exports: [],
            functions: [],
            classes: [],
            interfaces: [],
            typeAliases: [],
            enums: [],
            variables: [],
            parseError: false,
            ...overrides,
        })

        const createMockStructure = (): ProjectStructure => ({
            rootPath: "/project",
            name: "test-project",
            fileCount: 2,
            filesByDirectory: new Map([["/project/src", ["index.ts", "utils.ts"]]]),
        })

        it("should include project overview", () => {
            const structure = createMockStructure()
            const asts = new Map<string, FileAST>()

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("## Project Overview")
            expect(context).toContain("**Name:** test-project")
            expect(context).toContain("**Root:** /project")
            expect(context).toContain("**Files:** 2")
        })

        it("should include directory structure", () => {
            const structure = createMockStructure()
            const asts = new Map<string, FileAST>()

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("## Directory Structure")
            expect(context).toContain("src/")
            expect(context).toContain("- index.ts")
            expect(context).toContain("- utils.ts")
        })

        it("should include file summary with function counts", () => {
            const structure = createMockStructure()
            const asts = new Map<string, FileAST>([
                [
                    "/project/src/index.ts",
                    createMockAST({
                        functions: [
                            {
                                name: "main",
                                lineStart: 1,
                                lineEnd: 10,
                                isAsync: false,
                                isExported: true,
                                params: [],
                            },
                            {
                                name: "helper",
                                lineStart: 12,
                                lineEnd: 20,
                                isAsync: false,
                                isExported: false,
                                params: [],
                            },
                        ],
                    }),
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("## File Summary")
            expect(context).toContain("**index.ts**: 2 functions")
        })

        it("should include class counts", () => {
            const structure = createMockStructure()
            const asts = new Map<string, FileAST>([
                [
                    "/project/src/service.ts",
                    createMockAST({
                        classes: [
                            {
                                name: "Service",
                                lineStart: 1,
                                lineEnd: 50,
                                isExported: true,
                                isAbstract: false,
                                methods: [],
                                properties: [],
                                implements: [],
                            },
                        ],
                    }),
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("**service.ts**: 1 classes")
        })

        it("should include interface counts", () => {
            const structure = createMockStructure()
            const asts = new Map<string, FileAST>([
                [
                    "/project/src/types.ts",
                    createMockAST({
                        interfaces: [
                            {
                                name: "Config",
                                lineStart: 1,
                                lineEnd: 10,
                                isExported: true,
                                properties: [],
                                extends: [],
                            },
                            {
                                name: "Options",
                                lineStart: 12,
                                lineEnd: 20,
                                isExported: true,
                                properties: [],
                                extends: [],
                            },
                        ],
                    }),
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("**types.ts**: 2 interfaces")
        })

        it("should include type alias counts", () => {
            const structure = createMockStructure()
            const asts = new Map<string, FileAST>([
                [
                    "/project/src/types.ts",
                    createMockAST({
                        typeAliases: [
                            { name: "ID", lineStart: 1, lineEnd: 1, isExported: true },
                        ],
                    }),
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("1 types")
        })

        it("should mark hub files", () => {
            const structure = createMockStructure()
            const asts = new Map<string, FileAST>([
                ["/project/src/index.ts", createMockAST({ functions: [] })],
            ])
            const metas = new Map<string, FileMeta>([
                [
                    "/project/src/index.ts",
                    {
                        path: "/project/src/index.ts",
                        size: 100,
                        lastModified: Date.now(),
                        isHub: true,
                        isEntryPoint: false,
                        dependencyCount: 10,
                        dependentCount: 0,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts, metas)

            expect(context).toContain("hub")
        })

        it("should mark entry point files", () => {
            const structure = createMockStructure()
            const asts = new Map<string, FileAST>([
                ["/project/src/main.ts", createMockAST({ functions: [] })],
            ])
            const metas = new Map<string, FileMeta>([
                [
                    "/project/src/main.ts",
                    {
                        path: "/project/src/main.ts",
                        size: 50,
                        lastModified: Date.now(),
                        isHub: false,
                        isEntryPoint: true,
                        dependencyCount: 5,
                        dependentCount: 0,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts, metas)

            expect(context).toContain("entry")
        })

        it("should handle empty AST map", () => {
            const structure = createMockStructure()
            const asts = new Map<string, FileAST>()

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("## Project Overview")
            expect(context).toContain("## Directory Structure")
            expect(context).toContain("## File Summary")
        })

        it("should skip files without AST info in summary", () => {
            const structure: ProjectStructure = {
                rootPath: "/project",
                name: "test",
                fileCount: 1,
                filesByDirectory: new Map([["/project/src", ["missing.ts"]]]),
            }
            const asts = new Map<string, FileAST>()

            const context = buildInitialContext(structure, asts)

            expect(context).not.toContain("**missing.ts**")
        })

        it("should skip files with no notable content", () => {
            const structure = createMockStructure()
            const asts = new Map<string, FileAST>([
                ["/project/src/empty.ts", createMockAST()],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).not.toContain("**empty.ts**")
        })

        it("should combine multiple attributes", () => {
            const structure = createMockStructure()
            const asts = new Map<string, FileAST>([
                [
                    "/project/src/full.ts",
                    createMockAST({
                        functions: [
                            {
                                name: "fn",
                                lineStart: 1,
                                lineEnd: 5,
                                isAsync: false,
                                isExported: true,
                                params: [],
                            },
                        ],
                        classes: [
                            {
                                name: "Cls",
                                lineStart: 10,
                                lineEnd: 20,
                                isExported: true,
                                isAbstract: false,
                                methods: [],
                                properties: [],
                                implements: [],
                            },
                        ],
                        interfaces: [
                            {
                                name: "IFace",
                                lineStart: 25,
                                lineEnd: 30,
                                isExported: true,
                                properties: [],
                                extends: [],
                            },
                        ],
                    }),
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("1 functions")
            expect(context).toContain("1 classes")
            expect(context).toContain("1 interfaces")
        })

        it("should sort directories alphabetically", () => {
            const structure: ProjectStructure = {
                rootPath: "/project",
                name: "test",
                fileCount: 3,
                filesByDirectory: new Map([
                    ["/project/z", ["z.ts"]],
                    ["/project/a", ["a.ts"]],
                    ["/project/m", ["m.ts"]],
                ]),
            }
            const asts = new Map<string, FileAST>()

            const context = buildInitialContext(structure, asts)

            const aIndex = context.indexOf("a/")
            const mIndex = context.indexOf("m/")
            const zIndex = context.indexOf("z/")

            expect(aIndex).toBeLessThan(mIndex)
            expect(mIndex).toBeLessThan(zIndex)
        })

        it("should sort files within directory", () => {
            const structure: ProjectStructure = {
                rootPath: "/project",
                name: "test",
                fileCount: 3,
                filesByDirectory: new Map([["/project/src", ["z.ts", "a.ts", "m.ts"]]]),
            }
            const asts = new Map<string, FileAST>()

            const context = buildInitialContext(structure, asts)

            const aIndex = context.indexOf("- a.ts")
            const mIndex = context.indexOf("- m.ts")
            const zIndex = context.indexOf("- z.ts")

            expect(aIndex).toBeLessThan(mIndex)
            expect(mIndex).toBeLessThan(zIndex)
        })

        it("should handle root directory display", () => {
            const structure: ProjectStructure = {
                rootPath: "/project",
                name: "test",
                fileCount: 1,
                filesByDirectory: new Map([["/project", ["root.ts"]]]),
            }
            const asts = new Map<string, FileAST>()

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("### ./")
        })
    })
})
