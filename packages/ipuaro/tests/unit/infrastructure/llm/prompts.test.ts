import { describe, it, expect } from "vitest"
import {
    SYSTEM_PROMPT,
    buildInitialContext,
    buildFileContext,
    truncateContext,
    formatDependencyGraph,
    formatCircularDeps,
    formatHighImpactFiles,
    type ProjectStructure,
} from "../../../../src/infrastructure/llm/prompts.js"
import type { FileAST } from "../../../../src/domain/value-objects/FileAST.js"
import type { FileMeta } from "../../../../src/domain/value-objects/FileMeta.js"

describe("prompts", () => {
    describe("SYSTEM_PROMPT", () => {
        it("should be a non-empty string", () => {
            expect(typeof SYSTEM_PROMPT).toBe("string")
            expect(SYSTEM_PROMPT.length).toBeGreaterThan(100)
        })

        it("should contain core principles", () => {
            expect(SYSTEM_PROMPT).toContain("Lazy Loading")
            expect(SYSTEM_PROMPT).toContain("Precision")
            expect(SYSTEM_PROMPT).toContain("Safety")
        })

        it("should list available tools", () => {
            expect(SYSTEM_PROMPT).toContain("get_lines")
            expect(SYSTEM_PROMPT).toContain("edit_lines")
            expect(SYSTEM_PROMPT).toContain("find_references")
            expect(SYSTEM_PROMPT).toContain("git_status")
            expect(SYSTEM_PROMPT).toContain("run_command")
        })

        it("should include safety rules", () => {
            expect(SYSTEM_PROMPT).toContain("Safety Rules")
            expect(SYSTEM_PROMPT).toContain("Never execute commands that could harm")
        })
    })

    describe("buildInitialContext", () => {
        const structure: ProjectStructure = {
            name: "my-project",
            rootPath: "/home/user/my-project",
            files: ["src/index.ts", "src/utils.ts", "package.json"],
            directories: ["src", "tests"],
        }

        const asts = new Map<string, FileAST>([
            [
                "src/index.ts",
                {
                    imports: [],
                    exports: [],
                    functions: [
                        {
                            name: "main",
                            lineStart: 1,
                            lineEnd: 10,
                            params: [],
                            isAsync: false,
                            isExported: true,
                        },
                    ],
                    classes: [],
                    interfaces: [],
                    typeAliases: [],
                    parseError: false,
                },
            ],
            [
                "src/utils.ts",
                {
                    imports: [],
                    exports: [],
                    functions: [],
                    classes: [
                        {
                            name: "Helper",
                            lineStart: 1,
                            lineEnd: 20,
                            methods: [],
                            properties: [],
                            implements: [],
                            isExported: true,
                            isAbstract: false,
                        },
                    ],
                    interfaces: [],
                    typeAliases: [],
                    parseError: false,
                },
            ],
        ])

        it("should include project header", () => {
            const context = buildInitialContext(structure, asts)

            expect(context).toContain("# Project: my-project")
            expect(context).toContain("Root: /home/user/my-project")
            expect(context).toContain("Files: 3")
            expect(context).toContain("Directories: 2")
        })

        it("should include directory structure", () => {
            const context = buildInitialContext(structure, asts)

            expect(context).toContain("## Structure")
            expect(context).toContain("src/")
            expect(context).toContain("tests/")
        })

        it("should include file overview with AST summaries (signatures format)", () => {
            const context = buildInitialContext(structure, asts)

            expect(context).toContain("## Files")
            expect(context).toContain("### src/index.ts")
            expect(context).toContain("- main()")
            expect(context).toContain("### src/utils.ts")
            expect(context).toContain("- class Helper")
        })

        it("should use compact format when includeSignatures is false", () => {
            const context = buildInitialContext(structure, asts, undefined, {
                includeSignatures: false,
            })

            expect(context).toContain("## Files")
            expect(context).toContain("fn: main")
            expect(context).toContain("class: Helper")
        })

        it("should include file flags from metadata", () => {
            const metas = new Map<string, FileMeta>([
                [
                    "src/index.ts",
                    {
                        complexity: { loc: 100, nesting: 3, cyclomaticComplexity: 10, score: 75 },
                        dependencies: [],
                        dependents: ["a.ts", "b.ts", "c.ts", "d.ts", "e.ts", "f.ts"],
                        isHub: true,
                        isEntryPoint: true,
                        fileType: "source",
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts, metas)

            expect(context).toContain("(hub, entry, complex)")
        })
    })

    describe("buildFileContext", () => {
        const ast: FileAST = {
            imports: [
                { name: "fs", from: "node:fs", line: 1, type: "builtin", isDefault: false },
                { name: "helper", from: "./helper", line: 2, type: "internal", isDefault: true },
            ],
            exports: [
                { name: "main", line: 10, isDefault: false, kind: "function" },
                { name: "Config", line: 20, isDefault: true, kind: "class" },
            ],
            functions: [
                {
                    name: "main",
                    lineStart: 10,
                    lineEnd: 30,
                    params: [
                        { name: "args", optional: false, hasDefault: false },
                        { name: "options", optional: true, hasDefault: false },
                    ],
                    isAsync: true,
                    isExported: true,
                },
            ],
            classes: [
                {
                    name: "Config",
                    lineStart: 40,
                    lineEnd: 80,
                    methods: [
                        {
                            name: "load",
                            lineStart: 50,
                            lineEnd: 60,
                            params: [],
                            isAsync: false,
                            visibility: "public",
                            isStatic: false,
                        },
                    ],
                    properties: [],
                    extends: "BaseConfig",
                    implements: ["IConfig"],
                    isExported: true,
                    isAbstract: false,
                },
            ],
            interfaces: [],
            typeAliases: [],
            parseError: false,
        }

        it("should include file path header", () => {
            const context = buildFileContext("src/index.ts", ast)

            expect(context).toContain("## src/index.ts")
        })

        it("should include imports section", () => {
            const context = buildFileContext("src/index.ts", ast)

            expect(context).toContain("### Imports")
            expect(context).toContain('fs from "node:fs" (builtin)')
            expect(context).toContain('helper from "./helper" (internal)')
        })

        it("should include exports section", () => {
            const context = buildFileContext("src/index.ts", ast)

            expect(context).toContain("### Exports")
            expect(context).toContain("function main")
            expect(context).toContain("class Config (default)")
        })

        it("should include functions section", () => {
            const context = buildFileContext("src/index.ts", ast)

            expect(context).toContain("### Functions")
            expect(context).toContain("async main(args, options)")
            expect(context).toContain("[10-30]")
        })

        it("should include classes section with methods", () => {
            const context = buildFileContext("src/index.ts", ast)

            expect(context).toContain("### Classes")
            expect(context).toContain("Config extends BaseConfig implements IConfig")
            expect(context).toContain("[40-80]")
            expect(context).toContain("load()")
        })

        it("should include metadata section when provided", () => {
            const meta: FileMeta = {
                complexity: { loc: 100, nesting: 3, cyclomaticComplexity: 10, score: 65 },
                dependencies: ["a.ts", "b.ts"],
                dependents: ["c.ts"],
                isHub: false,
                isEntryPoint: true,
                fileType: "source",
            }

            const context = buildFileContext("src/index.ts", ast, meta)

            expect(context).toContain("### Metadata")
            expect(context).toContain("LOC: 100")
            expect(context).toContain("Complexity: 65/100")
            expect(context).toContain("Dependencies: 2")
            expect(context).toContain("Dependents: 1")
        })
    })

    describe("buildFileContext - edge cases", () => {
        it("should handle empty imports", () => {
            const ast: FileAST = {
                imports: [],
                exports: [],
                functions: [],
                classes: [],
                interfaces: [],
                typeAliases: [],
                parseError: false,
            }

            const context = buildFileContext("empty.ts", ast)

            expect(context).toContain("## empty.ts")
            expect(context).not.toContain("### Imports")
        })

        it("should handle empty exports", () => {
            const ast: FileAST = {
                imports: [{ name: "x", from: "./x", line: 1, type: "internal", isDefault: false }],
                exports: [],
                functions: [],
                classes: [],
                interfaces: [],
                typeAliases: [],
                parseError: false,
            }

            const context = buildFileContext("no-exports.ts", ast)

            expect(context).toContain("### Imports")
            expect(context).not.toContain("### Exports")
        })

        it("should handle empty functions", () => {
            const ast: FileAST = {
                imports: [],
                exports: [],
                functions: [],
                classes: [
                    {
                        name: "MyClass",
                        lineStart: 1,
                        lineEnd: 10,
                        methods: [],
                        properties: [],
                        implements: [],
                        isExported: false,
                        isAbstract: false,
                    },
                ],
                interfaces: [],
                typeAliases: [],
                parseError: false,
            }

            const context = buildFileContext("no-functions.ts", ast)

            expect(context).not.toContain("### Functions")
            expect(context).toContain("### Classes")
        })

        it("should handle empty classes", () => {
            const ast: FileAST = {
                imports: [],
                exports: [],
                functions: [
                    {
                        name: "test",
                        lineStart: 1,
                        lineEnd: 5,
                        params: [],
                        isAsync: false,
                        isExported: false,
                    },
                ],
                classes: [],
                interfaces: [],
                typeAliases: [],
                parseError: false,
            }

            const context = buildFileContext("no-classes.ts", ast)

            expect(context).toContain("### Functions")
            expect(context).not.toContain("### Classes")
        })

        it("should handle class without extends", () => {
            const ast: FileAST = {
                imports: [],
                exports: [],
                functions: [],
                classes: [
                    {
                        name: "Standalone",
                        lineStart: 1,
                        lineEnd: 10,
                        methods: [],
                        properties: [],
                        implements: ["IFoo"],
                        isExported: false,
                        isAbstract: false,
                    },
                ],
                interfaces: [],
                typeAliases: [],
                parseError: false,
            }

            const context = buildFileContext("standalone.ts", ast)

            expect(context).toContain("Standalone implements IFoo")
            expect(context).not.toContain("extends")
        })

        it("should handle class without implements", () => {
            const ast: FileAST = {
                imports: [],
                exports: [],
                functions: [],
                classes: [
                    {
                        name: "Child",
                        lineStart: 1,
                        lineEnd: 10,
                        methods: [],
                        properties: [],
                        extends: "Parent",
                        implements: [],
                        isExported: false,
                        isAbstract: false,
                    },
                ],
                interfaces: [],
                typeAliases: [],
                parseError: false,
            }

            const context = buildFileContext("child.ts", ast)

            expect(context).toContain("Child extends Parent")
            expect(context).not.toContain("implements")
        })

        it("should handle method with private visibility", () => {
            const ast: FileAST = {
                imports: [],
                exports: [],
                functions: [],
                classes: [
                    {
                        name: "WithPrivate",
                        lineStart: 1,
                        lineEnd: 20,
                        methods: [
                            {
                                name: "secretMethod",
                                lineStart: 5,
                                lineEnd: 10,
                                params: [],
                                isAsync: false,
                                visibility: "private",
                                isStatic: false,
                            },
                        ],
                        properties: [],
                        implements: [],
                        isExported: false,
                        isAbstract: false,
                    },
                ],
                interfaces: [],
                typeAliases: [],
                parseError: false,
            }

            const context = buildFileContext("private.ts", ast)

            expect(context).toContain("private secretMethod()")
        })

        it("should handle non-async function", () => {
            const ast: FileAST = {
                imports: [],
                exports: [],
                functions: [
                    {
                        name: "syncFn",
                        lineStart: 1,
                        lineEnd: 5,
                        params: [{ name: "x", optional: false, hasDefault: false }],
                        isAsync: false,
                        isExported: false,
                    },
                ],
                classes: [],
                interfaces: [],
                typeAliases: [],
                parseError: false,
            }

            const context = buildFileContext("sync.ts", ast)

            expect(context).toContain("syncFn(x)")
            expect(context).not.toContain("async syncFn")
        })

        it("should handle export without default", () => {
            const ast: FileAST = {
                imports: [],
                exports: [{ name: "foo", line: 1, isDefault: false, kind: "variable" }],
                functions: [],
                classes: [],
                interfaces: [],
                typeAliases: [],
                parseError: false,
            }

            const context = buildFileContext("named-export.ts", ast)

            expect(context).toContain("variable foo")
            expect(context).not.toContain("(default)")
        })
    })

    describe("buildInitialContext - edge cases", () => {
        it("should handle nested directory names", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: [],
                directories: ["src/components/ui"],
            }
            const asts = new Map<string, FileAST>()

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("ui/")
        })

        it("should handle file with only interfaces", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["types.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "types.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [],
                        interfaces: [
                            {
                                name: "IFoo",
                                lineStart: 1,
                                lineEnd: 5,
                                properties: [],
                                extends: [],
                                isExported: true,
                            },
                        ],
                        typeAliases: [],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("- interface IFoo")
        })

        it("should handle file with only interfaces (compact format)", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["types.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "types.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [],
                        interfaces: [
                            {
                                name: "IFoo",
                                lineStart: 1,
                                lineEnd: 5,
                                properties: [],
                                extends: [],
                                isExported: true,
                            },
                        ],
                        typeAliases: [],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts, undefined, {
                includeSignatures: false,
            })

            expect(context).toContain("interface: IFoo")
        })

        it("should handle file with only type aliases", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["types.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "types.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [],
                        interfaces: [],
                        typeAliases: [{ name: "MyType", line: 1, isExported: true }],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("- type MyType")
        })

        it("should handle file with only type aliases (compact format)", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["types.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "types.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [],
                        interfaces: [],
                        typeAliases: [{ name: "MyType", line: 1, isExported: true }],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts, undefined, {
                includeSignatures: false,
            })

            expect(context).toContain("type: MyType")
        })

        it("should handle file with no AST content", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["empty.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "empty.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [],
                        interfaces: [],
                        typeAliases: [],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("- empty.ts")
        })

        it("should handle meta with only hub flag", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["hub.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "hub.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [],
                        interfaces: [],
                        typeAliases: [],
                        parseError: false,
                    },
                ],
            ])
            const metas = new Map<string, FileMeta>([
                [
                    "hub.ts",
                    {
                        complexity: { loc: 10, nesting: 1, cyclomaticComplexity: 1, score: 10 },
                        dependencies: [],
                        dependents: [],
                        isHub: true,
                        isEntryPoint: false,
                        fileType: "source",
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts, metas)

            expect(context).toContain("(hub)")
            expect(context).not.toContain("entry")
            expect(context).not.toContain("complex")
        })

        it("should handle meta with no flags", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["normal.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "normal.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [],
                        interfaces: [],
                        typeAliases: [],
                        parseError: false,
                    },
                ],
            ])
            const metas = new Map<string, FileMeta>([
                [
                    "normal.ts",
                    {
                        complexity: { loc: 10, nesting: 1, cyclomaticComplexity: 1, score: 10 },
                        dependencies: [],
                        dependents: [],
                        isHub: false,
                        isEntryPoint: false,
                        fileType: "source",
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts, metas)

            expect(context).toContain("- normal.ts")
            expect(context).not.toContain("(hub")
            expect(context).not.toContain("entry")
            expect(context).not.toContain("complex")
        })

        it("should skip files not in AST map", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["exists.ts", "missing.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "exists.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [],
                        interfaces: [],
                        typeAliases: [],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("exists.ts")
            expect(context).not.toContain("missing.ts")
        })

        it("should skip undefined AST entries", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["file.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>()
            asts.set("file.ts", undefined as unknown as FileAST)

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("## Files")
            expect(context).not.toContain("file.ts")
        })
    })

    describe("truncateContext", () => {
        it("should return original context if within limit", () => {
            const context = "Short context"

            const result = truncateContext(context, 1000)

            expect(result).toBe(context)
        })

        it("should truncate long context", () => {
            const context = "a".repeat(1000)

            const result = truncateContext(context, 100)

            expect(result.length).toBeLessThan(500)
            expect(result).toContain("truncated")
        })

        it("should break at newline boundary", () => {
            const context = "Line 1\nLine 2\nLine 3\n" + "a".repeat(1000)

            const result = truncateContext(context, 50)

            expect(result).toContain("truncated")
        })
    })

    describe("function signatures with types", () => {
        it("should format function with typed parameters", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["user.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "user.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [
                            {
                                name: "getUser",
                                lineStart: 1,
                                lineEnd: 5,
                                params: [
                                    {
                                        name: "id",
                                        type: "string",
                                        optional: false,
                                        hasDefault: false,
                                    },
                                ],
                                isAsync: false,
                                isExported: true,
                            },
                        ],
                        classes: [],
                        interfaces: [],
                        typeAliases: [],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("- getUser(id: string)")
        })

        it("should format async function with return type", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["user.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "user.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [
                            {
                                name: "getUser",
                                lineStart: 1,
                                lineEnd: 5,
                                params: [
                                    {
                                        name: "id",
                                        type: "string",
                                        optional: false,
                                        hasDefault: false,
                                    },
                                ],
                                isAsync: true,
                                isExported: true,
                                returnType: "Promise<User>",
                            },
                        ],
                        classes: [],
                        interfaces: [],
                        typeAliases: [],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("- async getUser(id: string): Promise<User>")
        })

        it("should format function with optional parameters", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["utils.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "utils.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [
                            {
                                name: "format",
                                lineStart: 1,
                                lineEnd: 5,
                                params: [
                                    {
                                        name: "value",
                                        type: "string",
                                        optional: false,
                                        hasDefault: false,
                                    },
                                    {
                                        name: "options",
                                        type: "FormatOptions",
                                        optional: true,
                                        hasDefault: false,
                                    },
                                ],
                                isAsync: false,
                                isExported: true,
                                returnType: "string",
                            },
                        ],
                        classes: [],
                        interfaces: [],
                        typeAliases: [],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("- format(value: string, options?: FormatOptions): string")
        })

        it("should format function with multiple typed parameters", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["api.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "api.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [
                            {
                                name: "createUser",
                                lineStart: 1,
                                lineEnd: 10,
                                params: [
                                    {
                                        name: "name",
                                        type: "string",
                                        optional: false,
                                        hasDefault: false,
                                    },
                                    {
                                        name: "email",
                                        type: "string",
                                        optional: false,
                                        hasDefault: false,
                                    },
                                    {
                                        name: "age",
                                        type: "number",
                                        optional: true,
                                        hasDefault: false,
                                    },
                                ],
                                isAsync: true,
                                isExported: true,
                                returnType: "Promise<User>",
                            },
                        ],
                        classes: [],
                        interfaces: [],
                        typeAliases: [],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain(
                "- async createUser(name: string, email: string, age?: number): Promise<User>",
            )
        })

        it("should format function without types (JavaScript style)", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["legacy.js"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "legacy.js",
                    {
                        imports: [],
                        exports: [],
                        functions: [
                            {
                                name: "doSomething",
                                lineStart: 1,
                                lineEnd: 5,
                                params: [
                                    { name: "x", optional: false, hasDefault: false },
                                    { name: "y", optional: false, hasDefault: false },
                                ],
                                isAsync: false,
                                isExported: true,
                            },
                        ],
                        classes: [],
                        interfaces: [],
                        typeAliases: [],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("- doSomething(x, y)")
        })

        it("should format interface with extends", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["types.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "types.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [],
                        interfaces: [
                            {
                                name: "AdminUser",
                                lineStart: 1,
                                lineEnd: 5,
                                properties: [],
                                extends: ["User", "Admin"],
                                isExported: true,
                            },
                        ],
                        typeAliases: [],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("- interface AdminUser extends User, Admin")
        })
    })

    describe("interface fields (0.24.2)", () => {
        it("should format interface with fields", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["user.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "user.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [],
                        interfaces: [
                            {
                                name: "User",
                                lineStart: 1,
                                lineEnd: 5,
                                properties: [
                                    {
                                        name: "id",
                                        line: 2,
                                        type: "string",
                                        visibility: "public",
                                        isStatic: false,
                                        isReadonly: false,
                                    },
                                    {
                                        name: "name",
                                        line: 3,
                                        type: "string",
                                        visibility: "public",
                                        isStatic: false,
                                        isReadonly: false,
                                    },
                                    {
                                        name: "email",
                                        line: 4,
                                        type: "string",
                                        visibility: "public",
                                        isStatic: false,
                                        isReadonly: false,
                                    },
                                ],
                                extends: [],
                                isExported: true,
                            },
                        ],
                        typeAliases: [],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("interface User { id: string, name: string, email: string }")
        })

        it("should format interface with extends and fields", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["types.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "types.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [],
                        interfaces: [
                            {
                                name: "AdminUser",
                                lineStart: 1,
                                lineEnd: 5,
                                properties: [
                                    {
                                        name: "role",
                                        line: 2,
                                        type: "string",
                                        visibility: "public",
                                        isStatic: false,
                                        isReadonly: false,
                                    },
                                ],
                                extends: ["User"],
                                isExported: true,
                            },
                        ],
                        typeAliases: [],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("interface AdminUser extends User { role: string }")
        })

        it("should format interface with readonly fields", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["types.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "types.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [],
                        interfaces: [
                            {
                                name: "Config",
                                lineStart: 1,
                                lineEnd: 3,
                                properties: [
                                    {
                                        name: "version",
                                        line: 2,
                                        type: "string",
                                        visibility: "public",
                                        isStatic: false,
                                        isReadonly: true,
                                    },
                                ],
                                extends: [],
                                isExported: true,
                            },
                        ],
                        typeAliases: [],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("interface Config { readonly version: string }")
        })

        it("should format interface with no type annotation", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["types.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "types.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [],
                        interfaces: [
                            {
                                name: "Loose",
                                lineStart: 1,
                                lineEnd: 3,
                                properties: [
                                    {
                                        name: "data",
                                        line: 2,
                                        visibility: "public",
                                        isStatic: false,
                                        isReadonly: false,
                                    },
                                ],
                                extends: [],
                                isExported: true,
                            },
                        ],
                        typeAliases: [],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("interface Loose { data }")
        })
    })

    describe("type alias definitions (0.24.2)", () => {
        it("should format type alias with definition", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["types.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "types.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [],
                        interfaces: [],
                        typeAliases: [
                            {
                                name: "UserId",
                                line: 1,
                                isExported: true,
                                definition: "string",
                            },
                        ],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("- type UserId = string")
        })

        it("should format union type alias", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["types.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "types.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [],
                        interfaces: [],
                        typeAliases: [
                            {
                                name: "Status",
                                line: 1,
                                isExported: true,
                                definition: '"pending" | "active" | "done"',
                            },
                        ],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain('- type Status = "pending" | "active" | "done"')
        })

        it("should format intersection type alias", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["types.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "types.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [],
                        interfaces: [],
                        typeAliases: [
                            {
                                name: "AdminUser",
                                line: 1,
                                isExported: true,
                                definition: "User & Admin",
                            },
                        ],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("- type AdminUser = User & Admin")
        })

        it("should truncate long type definitions", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["types.ts"],
                directories: [],
            }
            const longDefinition =
                "{ id: string, name: string, email: string, phone: string, address: string, city: string, country: string, zip: string }"
            const asts = new Map<string, FileAST>([
                [
                    "types.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [],
                        interfaces: [],
                        typeAliases: [
                            {
                                name: "BigType",
                                line: 1,
                                isExported: true,
                                definition: longDefinition,
                            },
                        ],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("- type BigType = { id: string")
            expect(context).toContain("...")
        })

        it("should format type alias without definition (fallback)", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["types.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "types.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [],
                        interfaces: [],
                        typeAliases: [
                            {
                                name: "Unknown",
                                line: 1,
                                isExported: true,
                            },
                        ],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("- type Unknown")
            expect(context).not.toContain("- type Unknown =")
        })

        it("should format function type alias", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["types.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "types.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [],
                        interfaces: [],
                        typeAliases: [
                            {
                                name: "Handler",
                                line: 1,
                                isExported: true,
                                definition: "(event: Event) => void",
                            },
                        ],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("- type Handler = (event: Event) => void")
        })
    })

    describe("enum definitions (0.24.3)", () => {
        it("should format enum with numeric values", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["enums.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "enums.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [],
                        interfaces: [],
                        typeAliases: [],
                        enums: [
                            {
                                name: "Status",
                                lineStart: 1,
                                lineEnd: 5,
                                members: [
                                    { name: "Active", value: 1 },
                                    { name: "Inactive", value: 0 },
                                    { name: "Pending", value: 2 },
                                ],
                                isExported: true,
                                isConst: false,
                            },
                        ],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("- enum Status { Active=1, Inactive=0, Pending=2 }")
        })

        it("should format enum with string values", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["enums.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "enums.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [],
                        interfaces: [],
                        typeAliases: [],
                        enums: [
                            {
                                name: "Role",
                                lineStart: 1,
                                lineEnd: 5,
                                members: [
                                    { name: "Admin", value: "admin" },
                                    { name: "User", value: "user" },
                                ],
                                isExported: true,
                                isConst: false,
                            },
                        ],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain('- enum Role { Admin="admin", User="user" }')
        })

        it("should format const enum", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["enums.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "enums.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [],
                        interfaces: [],
                        typeAliases: [],
                        enums: [
                            {
                                name: "HttpStatus",
                                lineStart: 1,
                                lineEnd: 5,
                                members: [
                                    { name: "OK", value: 200 },
                                    { name: "NotFound", value: 404 },
                                ],
                                isExported: true,
                                isConst: true,
                            },
                        ],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("- const enum HttpStatus { OK=200, NotFound=404 }")
        })

        it("should format enum without explicit values", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["enums.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "enums.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [],
                        interfaces: [],
                        typeAliases: [],
                        enums: [
                            {
                                name: "Direction",
                                lineStart: 1,
                                lineEnd: 5,
                                members: [
                                    { name: "Up", value: undefined },
                                    { name: "Down", value: undefined },
                                ],
                                isExported: true,
                                isConst: false,
                            },
                        ],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("- enum Direction { Up, Down }")
        })

        it("should format empty enum", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["enums.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "enums.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [],
                        interfaces: [],
                        typeAliases: [],
                        enums: [
                            {
                                name: "Empty",
                                lineStart: 1,
                                lineEnd: 1,
                                members: [],
                                isExported: true,
                                isConst: false,
                            },
                        ],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("- enum Empty")
        })

        it("should include enum in compact format", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["enums.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "enums.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [],
                        interfaces: [],
                        typeAliases: [],
                        enums: [
                            {
                                name: "Status",
                                lineStart: 1,
                                lineEnd: 5,
                                members: [{ name: "Active", value: 1 }],
                                isExported: true,
                                isConst: false,
                            },
                        ],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts, undefined, {
                includeSignatures: false,
            })

            expect(context).toContain("enum: Status")
        })

        it("should truncate long enum definitions", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["enums.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "enums.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [],
                        interfaces: [],
                        typeAliases: [],
                        enums: [
                            {
                                name: "VeryLongEnumName",
                                lineStart: 1,
                                lineEnd: 20,
                                members: [
                                    { name: "FirstVeryLongMemberName", value: "first_value" },
                                    { name: "SecondVeryLongMemberName", value: "second_value" },
                                    { name: "ThirdVeryLongMemberName", value: "third_value" },
                                ],
                                isExported: true,
                                isConst: false,
                            },
                        ],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("...")
            expect(context).toContain("- enum VeryLongEnumName")
        })
    })

    describe("decorators (0.24.4)", () => {
        it("should format function with decorators", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["controller.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "controller.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [
                            {
                                name: "getUser",
                                lineStart: 1,
                                lineEnd: 5,
                                params: [
                                    {
                                        name: "id",
                                        type: "string",
                                        optional: false,
                                        hasDefault: false,
                                    },
                                ],
                                isAsync: true,
                                isExported: true,
                                returnType: "Promise<User>",
                                decorators: ["@Get(':id')"],
                            },
                        ],
                        classes: [],
                        interfaces: [],
                        typeAliases: [],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("- @Get(':id') async getUser(id: string): Promise<User>")
        })

        it("should format class with decorators", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["controller.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "controller.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [
                            {
                                name: "UserController",
                                lineStart: 1,
                                lineEnd: 20,
                                methods: [],
                                properties: [],
                                implements: [],
                                isExported: true,
                                isAbstract: false,
                                decorators: ["@Controller('users')"],
                            },
                        ],
                        interfaces: [],
                        typeAliases: [],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("- @Controller('users') class UserController")
        })

        it("should format class with multiple decorators", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["service.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "service.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [
                            {
                                name: "UserService",
                                lineStart: 1,
                                lineEnd: 30,
                                methods: [],
                                properties: [],
                                implements: ["IUserService"],
                                isExported: true,
                                isAbstract: false,
                                decorators: ["@Injectable()", "@Singleton()"],
                            },
                        ],
                        interfaces: [],
                        typeAliases: [],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain(
                "- @Injectable() @Singleton() class UserService implements IUserService",
            )
        })

        it("should format function with multiple decorators", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["controller.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "controller.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [
                            {
                                name: "createUser",
                                lineStart: 1,
                                lineEnd: 10,
                                params: [],
                                isAsync: true,
                                isExported: true,
                                decorators: ["@Post()", "@Auth()", "@ValidateBody()"],
                            },
                        ],
                        classes: [],
                        interfaces: [],
                        typeAliases: [],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("- @Post() @Auth() @ValidateBody() async createUser()")
        })

        it("should handle function without decorators", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["utils.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "utils.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [
                            {
                                name: "helper",
                                lineStart: 1,
                                lineEnd: 5,
                                params: [],
                                isAsync: false,
                                isExported: true,
                            },
                        ],
                        classes: [],
                        interfaces: [],
                        typeAliases: [],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("- helper()")
            expect(context).not.toContain("@")
        })

        it("should handle class without decorators", () => {
            const structure: ProjectStructure = {
                name: "test",
                rootPath: "/test",
                files: ["simple.ts"],
                directories: [],
            }
            const asts = new Map<string, FileAST>([
                [
                    "simple.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [
                            {
                                name: "SimpleClass",
                                lineStart: 1,
                                lineEnd: 10,
                                methods: [],
                                properties: [],
                                implements: [],
                                isExported: true,
                                isAbstract: false,
                            },
                        ],
                        interfaces: [],
                        typeAliases: [],
                        parseError: false,
                    },
                ],
            ])

            const context = buildInitialContext(structure, asts)

            expect(context).toContain("- class SimpleClass")
            expect(context).not.toContain("@")
        })
    })

    describe("dependency graph (0.27.0)", () => {
        describe("formatDependencyGraph", () => {
            it("should return null for empty metas", () => {
                const metas = new Map<string, FileMeta>()

                const result = formatDependencyGraph(metas)

                expect(result).toBeNull()
            })

            it("should return null when no files have dependencies or dependents", () => {
                const metas = new Map<string, FileMeta>([
                    [
                        "src/isolated.ts",
                        {
                            complexity: { loc: 10, nesting: 1, cyclomaticComplexity: 1, score: 10 },
                            dependencies: [],
                            dependents: [],
                            isHub: false,
                            isEntryPoint: true,
                            fileType: "source",
                        },
                    ],
                ])

                const result = formatDependencyGraph(metas)

                expect(result).toBeNull()
            })

            it("should format file with only dependencies", () => {
                const metas = new Map<string, FileMeta>([
                    [
                        "src/services/user.ts",
                        {
                            complexity: { loc: 50, nesting: 2, cyclomaticComplexity: 5, score: 30 },
                            dependencies: ["src/types/user.ts", "src/utils/validation.ts"],
                            dependents: [],
                            isHub: false,
                            isEntryPoint: false,
                            fileType: "source",
                        },
                    ],
                ])

                const result = formatDependencyGraph(metas)

                expect(result).toContain("## Dependency Graph")
                expect(result).toContain("services/user: → types/user, utils/validation")
            })

            it("should format file with only dependents", () => {
                const metas = new Map<string, FileMeta>([
                    [
                        "src/types/user.ts",
                        {
                            complexity: { loc: 20, nesting: 1, cyclomaticComplexity: 1, score: 10 },
                            dependencies: [],
                            dependents: ["src/services/user.ts", "src/controllers/user.ts"],
                            isHub: false,
                            isEntryPoint: false,
                            fileType: "types",
                        },
                    ],
                ])

                const result = formatDependencyGraph(metas)

                expect(result).toContain("## Dependency Graph")
                expect(result).toContain("types/user: ← services/user, controllers/user")
            })

            it("should format file with both dependencies and dependents", () => {
                const metas = new Map<string, FileMeta>([
                    [
                        "src/services/user.ts",
                        {
                            complexity: {
                                loc: 80,
                                nesting: 3,
                                cyclomaticComplexity: 10,
                                score: 50,
                            },
                            dependencies: ["src/types/user.ts", "src/utils/validation.ts"],
                            dependents: ["src/controllers/user.ts", "src/api/routes.ts"],
                            isHub: false,
                            isEntryPoint: false,
                            fileType: "source",
                        },
                    ],
                ])

                const result = formatDependencyGraph(metas)

                expect(result).toContain("## Dependency Graph")
                expect(result).toContain(
                    "services/user: → types/user, utils/validation ← controllers/user, api/routes",
                )
            })

            it("should sort hub files first", () => {
                const metas = new Map<string, FileMeta>([
                    [
                        "src/utils/helpers.ts",
                        {
                            complexity: { loc: 30, nesting: 1, cyclomaticComplexity: 3, score: 20 },
                            dependencies: [],
                            dependents: ["a.ts", "b.ts", "c.ts", "d.ts", "e.ts", "f.ts", "g.ts"],
                            isHub: true,
                            isEntryPoint: false,
                            fileType: "source",
                        },
                    ],
                    [
                        "src/services/user.ts",
                        {
                            complexity: { loc: 50, nesting: 2, cyclomaticComplexity: 5, score: 30 },
                            dependencies: ["src/types/user.ts"],
                            dependents: ["src/controllers/user.ts"],
                            isHub: false,
                            isEntryPoint: false,
                            fileType: "source",
                        },
                    ],
                ])

                const result = formatDependencyGraph(metas)

                expect(result).not.toBeNull()
                const lines = result!.split("\n")
                const hubIndex = lines.findIndex((l) => l.includes("utils/helpers"))
                const serviceIndex = lines.findIndex((l) => l.includes("services/user"))
                expect(hubIndex).toBeLessThan(serviceIndex)
            })

            it("should sort by total connections (descending) for non-hubs", () => {
                const metas = new Map<string, FileMeta>([
                    [
                        "src/a.ts",
                        {
                            complexity: { loc: 10, nesting: 1, cyclomaticComplexity: 1, score: 10 },
                            dependencies: ["x.ts"],
                            dependents: [],
                            isHub: false,
                            isEntryPoint: false,
                            fileType: "source",
                        },
                    ],
                    [
                        "src/b.ts",
                        {
                            complexity: { loc: 10, nesting: 1, cyclomaticComplexity: 1, score: 10 },
                            dependencies: ["x.ts", "y.ts"],
                            dependents: ["z.ts"],
                            isHub: false,
                            isEntryPoint: false,
                            fileType: "source",
                        },
                    ],
                ])

                const result = formatDependencyGraph(metas)

                expect(result).not.toBeNull()
                const lines = result!.split("\n")
                const aIndex = lines.findIndex((l) => l.startsWith("a:"))
                const bIndex = lines.findIndex((l) => l.startsWith("b:"))
                expect(bIndex).toBeLessThan(aIndex)
            })

            it("should shorten src/ prefix", () => {
                const metas = new Map<string, FileMeta>([
                    [
                        "src/index.ts",
                        {
                            complexity: { loc: 10, nesting: 1, cyclomaticComplexity: 1, score: 10 },
                            dependencies: ["src/utils/helpers.ts"],
                            dependents: [],
                            isHub: false,
                            isEntryPoint: true,
                            fileType: "source",
                        },
                    ],
                ])

                const result = formatDependencyGraph(metas)

                expect(result).toContain("index: → utils/helpers")
                expect(result).not.toContain("src/")
            })

            it("should remove file extensions", () => {
                const metas = new Map<string, FileMeta>([
                    [
                        "lib/utils.ts",
                        {
                            complexity: { loc: 10, nesting: 1, cyclomaticComplexity: 1, score: 10 },
                            dependencies: ["lib/helpers.tsx", "lib/types.js"],
                            dependents: [],
                            isHub: false,
                            isEntryPoint: false,
                            fileType: "source",
                        },
                    ],
                ])

                const result = formatDependencyGraph(metas)

                expect(result).toContain("lib/utils: → lib/helpers, lib/types")
                expect(result).not.toContain(".ts")
                expect(result).not.toContain(".tsx")
                expect(result).not.toContain(".js")
            })

            it("should remove /index suffix", () => {
                const metas = new Map<string, FileMeta>([
                    [
                        "src/components/index.ts",
                        {
                            complexity: { loc: 10, nesting: 1, cyclomaticComplexity: 1, score: 10 },
                            dependencies: ["src/utils/index.ts"],
                            dependents: [],
                            isHub: false,
                            isEntryPoint: true,
                            fileType: "source",
                        },
                    ],
                ])

                const result = formatDependencyGraph(metas)

                expect(result).toContain("components: → utils")
                expect(result).not.toContain("/index")
            })

            it("should handle multiple files in graph", () => {
                const metas = new Map<string, FileMeta>([
                    [
                        "src/services/user.ts",
                        {
                            complexity: { loc: 50, nesting: 2, cyclomaticComplexity: 5, score: 30 },
                            dependencies: ["src/types/user.ts"],
                            dependents: ["src/controllers/user.ts"],
                            isHub: false,
                            isEntryPoint: false,
                            fileType: "source",
                        },
                    ],
                    [
                        "src/services/auth.ts",
                        {
                            complexity: { loc: 40, nesting: 2, cyclomaticComplexity: 4, score: 25 },
                            dependencies: ["src/services/user.ts", "src/utils/jwt.ts"],
                            dependents: ["src/controllers/auth.ts"],
                            isHub: false,
                            isEntryPoint: false,
                            fileType: "source",
                        },
                    ],
                ])

                const result = formatDependencyGraph(metas)

                expect(result).toContain("## Dependency Graph")
                expect(result).toContain("services/user: → types/user ← controllers/user")
                expect(result).toContain(
                    "services/auth: → services/user, utils/jwt ← controllers/auth",
                )
            })
        })

        describe("buildInitialContext with includeDepsGraph", () => {
            const structure: ProjectStructure = {
                name: "test-project",
                rootPath: "/test",
                files: ["src/index.ts"],
                directories: ["src"],
            }

            const asts = new Map<string, FileAST>([
                [
                    "src/index.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [],
                        interfaces: [],
                        typeAliases: [],
                        parseError: false,
                    },
                ],
            ])

            it("should include dependency graph by default", () => {
                const metas = new Map<string, FileMeta>([
                    [
                        "src/index.ts",
                        {
                            complexity: { loc: 10, nesting: 1, cyclomaticComplexity: 1, score: 10 },
                            dependencies: ["src/utils.ts"],
                            dependents: [],
                            isHub: false,
                            isEntryPoint: true,
                            fileType: "source",
                        },
                    ],
                ])

                const context = buildInitialContext(structure, asts, metas)

                expect(context).toContain("## Dependency Graph")
                expect(context).toContain("index: → utils")
            })

            it("should exclude dependency graph when includeDepsGraph is false", () => {
                const metas = new Map<string, FileMeta>([
                    [
                        "src/index.ts",
                        {
                            complexity: { loc: 10, nesting: 1, cyclomaticComplexity: 1, score: 10 },
                            dependencies: ["src/utils.ts"],
                            dependents: [],
                            isHub: false,
                            isEntryPoint: true,
                            fileType: "source",
                        },
                    ],
                ])

                const context = buildInitialContext(structure, asts, metas, {
                    includeDepsGraph: false,
                })

                expect(context).not.toContain("## Dependency Graph")
            })

            it("should not include dependency graph when metas is undefined", () => {
                const context = buildInitialContext(structure, asts, undefined, {
                    includeDepsGraph: true,
                })

                expect(context).not.toContain("## Dependency Graph")
            })

            it("should not include dependency graph when metas is empty", () => {
                const emptyMetas = new Map<string, FileMeta>()

                const context = buildInitialContext(structure, asts, emptyMetas, {
                    includeDepsGraph: true,
                })

                expect(context).not.toContain("## Dependency Graph")
            })

            it("should not include dependency graph when no files have connections", () => {
                const metas = new Map<string, FileMeta>([
                    [
                        "src/index.ts",
                        {
                            complexity: { loc: 10, nesting: 1, cyclomaticComplexity: 1, score: 10 },
                            dependencies: [],
                            dependents: [],
                            isHub: false,
                            isEntryPoint: true,
                            fileType: "source",
                        },
                    ],
                ])

                const context = buildInitialContext(structure, asts, metas, {
                    includeDepsGraph: true,
                })

                expect(context).not.toContain("## Dependency Graph")
            })
        })
    })

    describe("high impact files (0.29.0)", () => {
        describe("formatHighImpactFiles", () => {
            it("should return null for empty metas", () => {
                const metas = new Map<string, FileMeta>()

                const result = formatHighImpactFiles(metas)

                expect(result).toBeNull()
            })

            it("should return null when no files have impact score >= minImpact", () => {
                const metas = new Map<string, FileMeta>([
                    [
                        "src/low.ts",
                        {
                            complexity: { loc: 10, nesting: 1, cyclomaticComplexity: 1, score: 10 },
                            dependencies: [],
                            dependents: [],
                            isHub: false,
                            isEntryPoint: false,
                            fileType: "source",
                            impactScore: 2,
                        },
                    ],
                ])

                const result = formatHighImpactFiles(metas)

                expect(result).toBeNull()
            })

            it("should format file with high impact score", () => {
                const metas = new Map<string, FileMeta>([
                    [
                        "src/utils/validation.ts",
                        {
                            complexity: { loc: 50, nesting: 2, cyclomaticComplexity: 5, score: 30 },
                            dependencies: [],
                            dependents: [
                                "a.ts",
                                "b.ts",
                                "c.ts",
                                "d.ts",
                                "e.ts",
                                "f.ts",
                                "g.ts",
                                "h.ts",
                                "i.ts",
                                "j.ts",
                                "k.ts",
                                "l.ts",
                            ],
                            isHub: true,
                            isEntryPoint: false,
                            fileType: "source",
                            impactScore: 67,
                        },
                    ],
                ])

                const result = formatHighImpactFiles(metas)

                expect(result).toContain("## High Impact Files")
                expect(result).toContain("| File | Impact | Dependents |")
                expect(result).toContain("| utils/validation | 67% | 12 files |")
            })

            it("should sort by impact score descending", () => {
                const metas = new Map<string, FileMeta>([
                    [
                        "src/low.ts",
                        {
                            complexity: { loc: 10, nesting: 1, cyclomaticComplexity: 1, score: 10 },
                            dependencies: [],
                            dependents: ["a.ts"],
                            isHub: false,
                            isEntryPoint: false,
                            fileType: "source",
                            impactScore: 10,
                        },
                    ],
                    [
                        "src/high.ts",
                        {
                            complexity: { loc: 20, nesting: 1, cyclomaticComplexity: 1, score: 10 },
                            dependencies: [],
                            dependents: ["a.ts", "b.ts", "c.ts", "d.ts", "e.ts"],
                            isHub: false,
                            isEntryPoint: false,
                            fileType: "source",
                            impactScore: 50,
                        },
                    ],
                ])

                const result = formatHighImpactFiles(metas)

                expect(result).not.toBeNull()
                const lines = result!.split("\n")
                const highIndex = lines.findIndex((l) => l.includes("high"))
                const lowIndex = lines.findIndex((l) => l.includes("low"))
                expect(highIndex).toBeLessThan(lowIndex)
            })

            it("should limit to top N files", () => {
                const metas = new Map<string, FileMeta>()
                for (let i = 0; i < 20; i++) {
                    metas.set(`src/file${String(i)}.ts`, {
                        complexity: { loc: 10, nesting: 1, cyclomaticComplexity: 1, score: 10 },
                        dependencies: [],
                        dependents: ["a.ts"],
                        isHub: false,
                        isEntryPoint: false,
                        fileType: "source",
                        impactScore: 10 + i,
                    })
                }

                const result = formatHighImpactFiles(metas, 5)

                expect(result).not.toBeNull()
                const dataLines = result!
                    .split("\n")
                    .filter((l) => l.startsWith("| ") && l.includes("%"))
                expect(dataLines).toHaveLength(5)
            })

            it("should filter by minImpact", () => {
                const metas = new Map<string, FileMeta>([
                    [
                        "src/high.ts",
                        {
                            complexity: { loc: 10, nesting: 1, cyclomaticComplexity: 1, score: 10 },
                            dependencies: [],
                            dependents: ["a.ts", "b.ts", "c.ts"],
                            isHub: false,
                            isEntryPoint: false,
                            fileType: "source",
                            impactScore: 30,
                        },
                    ],
                    [
                        "src/low.ts",
                        {
                            complexity: { loc: 10, nesting: 1, cyclomaticComplexity: 1, score: 10 },
                            dependencies: [],
                            dependents: ["a.ts"],
                            isHub: false,
                            isEntryPoint: false,
                            fileType: "source",
                            impactScore: 5,
                        },
                    ],
                ])

                const result = formatHighImpactFiles(metas, 10, 20)

                expect(result).not.toBeNull()
                expect(result).toContain("high")
                expect(result).not.toContain("low")
            })

            it("should show singular 'file' for 1 dependent", () => {
                const metas = new Map<string, FileMeta>([
                    [
                        "src/single.ts",
                        {
                            complexity: { loc: 10, nesting: 1, cyclomaticComplexity: 1, score: 10 },
                            dependencies: [],
                            dependents: ["a.ts"],
                            isHub: false,
                            isEntryPoint: false,
                            fileType: "source",
                            impactScore: 10,
                        },
                    ],
                ])

                const result = formatHighImpactFiles(metas)

                expect(result).toContain("1 file")
                expect(result).not.toContain("1 files")
            })

            it("should shorten src/ prefix", () => {
                const metas = new Map<string, FileMeta>([
                    [
                        "src/services/user.ts",
                        {
                            complexity: { loc: 10, nesting: 1, cyclomaticComplexity: 1, score: 10 },
                            dependencies: [],
                            dependents: ["a.ts", "b.ts"],
                            isHub: false,
                            isEntryPoint: false,
                            fileType: "source",
                            impactScore: 20,
                        },
                    ],
                ])

                const result = formatHighImpactFiles(metas)

                expect(result).toContain("services/user")
                expect(result).not.toContain("src/")
            })

            it("should remove file extensions", () => {
                const metas = new Map<string, FileMeta>([
                    [
                        "lib/utils.ts",
                        {
                            complexity: { loc: 10, nesting: 1, cyclomaticComplexity: 1, score: 10 },
                            dependencies: [],
                            dependents: ["a.ts", "b.ts"],
                            isHub: false,
                            isEntryPoint: false,
                            fileType: "source",
                            impactScore: 20,
                        },
                    ],
                ])

                const result = formatHighImpactFiles(metas)

                expect(result).toContain("lib/utils")
                expect(result).not.toContain(".ts")
            })
        })

        describe("buildInitialContext with includeHighImpactFiles", () => {
            const structure: ProjectStructure = {
                name: "test-project",
                rootPath: "/test",
                files: ["src/index.ts"],
                directories: ["src"],
            }

            const asts = new Map<string, FileAST>([
                [
                    "src/index.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [],
                        interfaces: [],
                        typeAliases: [],
                        parseError: false,
                    },
                ],
            ])

            it("should include high impact files by default", () => {
                const metas = new Map<string, FileMeta>([
                    [
                        "src/index.ts",
                        {
                            complexity: { loc: 10, nesting: 1, cyclomaticComplexity: 1, score: 10 },
                            dependencies: [],
                            dependents: ["a.ts", "b.ts"],
                            isHub: false,
                            isEntryPoint: true,
                            fileType: "source",
                            impactScore: 20,
                        },
                    ],
                ])

                const context = buildInitialContext(structure, asts, metas)

                expect(context).toContain("## High Impact Files")
            })

            it("should exclude high impact files when includeHighImpactFiles is false", () => {
                const metas = new Map<string, FileMeta>([
                    [
                        "src/index.ts",
                        {
                            complexity: { loc: 10, nesting: 1, cyclomaticComplexity: 1, score: 10 },
                            dependencies: [],
                            dependents: ["a.ts", "b.ts"],
                            isHub: false,
                            isEntryPoint: true,
                            fileType: "source",
                            impactScore: 20,
                        },
                    ],
                ])

                const context = buildInitialContext(structure, asts, metas, {
                    includeHighImpactFiles: false,
                })

                expect(context).not.toContain("## High Impact Files")
            })

            it("should not include high impact files when metas is undefined", () => {
                const context = buildInitialContext(structure, asts, undefined, {
                    includeHighImpactFiles: true,
                })

                expect(context).not.toContain("## High Impact Files")
            })

            it("should not include high impact files when metas is empty", () => {
                const emptyMetas = new Map<string, FileMeta>()

                const context = buildInitialContext(structure, asts, emptyMetas, {
                    includeHighImpactFiles: true,
                })

                expect(context).not.toContain("## High Impact Files")
            })

            it("should not include high impact files when no files have high impact", () => {
                const metas = new Map<string, FileMeta>([
                    [
                        "src/index.ts",
                        {
                            complexity: { loc: 10, nesting: 1, cyclomaticComplexity: 1, score: 10 },
                            dependencies: [],
                            dependents: [],
                            isHub: false,
                            isEntryPoint: true,
                            fileType: "source",
                            impactScore: 0,
                        },
                    ],
                ])

                const context = buildInitialContext(structure, asts, metas, {
                    includeHighImpactFiles: true,
                })

                expect(context).not.toContain("## High Impact Files")
            })
        })
    })

    describe("circular dependencies (0.28.0)", () => {
        describe("formatCircularDeps", () => {
            it("should return null for empty array", () => {
                const result = formatCircularDeps([])

                expect(result).toBeNull()
            })

            it("should return null for undefined", () => {
                const result = formatCircularDeps(undefined as unknown as string[][])

                expect(result).toBeNull()
            })

            it("should format a simple two-node cycle", () => {
                const cycles = [["src/a.ts", "src/b.ts", "src/a.ts"]]

                const result = formatCircularDeps(cycles)

                expect(result).toContain("## ⚠️ Circular Dependencies")
                expect(result).toContain("- a → b → a")
            })

            it("should format a three-node cycle", () => {
                const cycles = [
                    ["src/services/user.ts", "src/services/auth.ts", "src/services/user.ts"],
                ]

                const result = formatCircularDeps(cycles)

                expect(result).toContain("## ⚠️ Circular Dependencies")
                expect(result).toContain("- services/user → services/auth → services/user")
            })

            it("should format multiple cycles", () => {
                const cycles = [
                    ["src/a.ts", "src/b.ts", "src/a.ts"],
                    ["src/utils/x.ts", "src/utils/y.ts", "src/utils/z.ts", "src/utils/x.ts"],
                ]

                const result = formatCircularDeps(cycles)

                expect(result).toContain("## ⚠️ Circular Dependencies")
                expect(result).toContain("- a → b → a")
                expect(result).toContain("- utils/x → utils/y → utils/z → utils/x")
            })

            it("should shorten paths (remove src/ prefix)", () => {
                const cycles = [
                    ["src/services/user.ts", "src/types/user.ts", "src/services/user.ts"],
                ]

                const result = formatCircularDeps(cycles)

                expect(result).not.toContain("src/")
                expect(result).toContain("services/user → types/user → services/user")
            })

            it("should remove file extensions", () => {
                const cycles = [["lib/a.ts", "lib/b.tsx", "lib/c.js", "lib/a.ts"]]

                const result = formatCircularDeps(cycles)

                expect(result).not.toContain(".ts")
                expect(result).not.toContain(".tsx")
                expect(result).not.toContain(".js")
                expect(result).toContain("lib/a → lib/b → lib/c → lib/a")
            })

            it("should remove /index suffix", () => {
                const cycles = [
                    ["src/components/index.ts", "src/utils/index.ts", "src/components/index.ts"],
                ]

                const result = formatCircularDeps(cycles)

                expect(result).not.toContain("/index")
                expect(result).toContain("components → utils → components")
            })

            it("should skip empty cycles", () => {
                const cycles = [[], ["src/a.ts", "src/b.ts", "src/a.ts"], []]

                const result = formatCircularDeps(cycles)

                expect(result).toContain("- a → b → a")
                const lines = result!.split("\n").filter((l) => l.startsWith("- "))
                expect(lines).toHaveLength(1)
            })

            it("should return null if all cycles are empty", () => {
                const cycles = [[], [], []]

                const result = formatCircularDeps(cycles)

                expect(result).toBeNull()
            })

            it("should format self-referencing cycle", () => {
                const cycles = [["src/self.ts", "src/self.ts"]]

                const result = formatCircularDeps(cycles)

                expect(result).toContain("- self → self")
            })

            it("should handle long cycles", () => {
                const cycles = [
                    [
                        "src/a.ts",
                        "src/b.ts",
                        "src/c.ts",
                        "src/d.ts",
                        "src/e.ts",
                        "src/f.ts",
                        "src/a.ts",
                    ],
                ]

                const result = formatCircularDeps(cycles)

                expect(result).toContain("- a → b → c → d → e → f → a")
            })
        })

        describe("buildInitialContext with includeCircularDeps", () => {
            const structure: ProjectStructure = {
                name: "test-project",
                rootPath: "/test",
                files: ["src/index.ts"],
                directories: ["src"],
            }

            const asts = new Map<string, FileAST>([
                [
                    "src/index.ts",
                    {
                        imports: [],
                        exports: [],
                        functions: [],
                        classes: [],
                        interfaces: [],
                        typeAliases: [],
                        parseError: false,
                    },
                ],
            ])

            it("should include circular deps when circularDeps provided", () => {
                const circularDeps = [["src/a.ts", "src/b.ts", "src/a.ts"]]

                const context = buildInitialContext(structure, asts, undefined, {
                    circularDeps,
                })

                expect(context).toContain("## ⚠️ Circular Dependencies")
                expect(context).toContain("- a → b → a")
            })

            it("should not include circular deps when includeCircularDeps is false", () => {
                const circularDeps = [["src/a.ts", "src/b.ts", "src/a.ts"]]

                const context = buildInitialContext(structure, asts, undefined, {
                    circularDeps,
                    includeCircularDeps: false,
                })

                expect(context).not.toContain("## ⚠️ Circular Dependencies")
            })

            it("should not include circular deps when circularDeps is empty", () => {
                const context = buildInitialContext(structure, asts, undefined, {
                    circularDeps: [],
                    includeCircularDeps: true,
                })

                expect(context).not.toContain("## ⚠️ Circular Dependencies")
            })

            it("should not include circular deps when circularDeps is undefined", () => {
                const context = buildInitialContext(structure, asts, undefined, {
                    includeCircularDeps: true,
                })

                expect(context).not.toContain("## ⚠️ Circular Dependencies")
            })

            it("should include circular deps by default when circularDeps provided", () => {
                const circularDeps = [["src/x.ts", "src/y.ts", "src/x.ts"]]

                const context = buildInitialContext(structure, asts, undefined, {
                    circularDeps,
                })

                expect(context).toContain("## ⚠️ Circular Dependencies")
                expect(context).toContain("- x → y → x")
            })

            it("should include both dependency graph and circular deps", () => {
                const metas = new Map<string, FileMeta>([
                    [
                        "src/index.ts",
                        {
                            complexity: { loc: 10, nesting: 1, cyclomaticComplexity: 1, score: 10 },
                            dependencies: ["src/utils.ts"],
                            dependents: [],
                            isHub: false,
                            isEntryPoint: true,
                            fileType: "source",
                        },
                    ],
                ])
                const circularDeps = [["src/a.ts", "src/b.ts", "src/a.ts"]]

                const context = buildInitialContext(structure, asts, metas, {
                    circularDeps,
                    includeDepsGraph: true,
                    includeCircularDeps: true,
                })

                expect(context).toContain("## Dependency Graph")
                expect(context).toContain("## ⚠️ Circular Dependencies")
            })
        })
    })
})
