import { describe, it, expect, beforeAll } from "vitest"
import { MetaAnalyzer } from "../../../../src/infrastructure/indexer/MetaAnalyzer.js"
import { ASTParser } from "../../../../src/infrastructure/indexer/ASTParser.js"
import type { FileAST } from "../../../../src/domain/value-objects/FileAST.js"
import { createEmptyFileAST } from "../../../../src/domain/value-objects/FileAST.js"
import { createFileMeta, type FileMeta } from "../../../../src/domain/value-objects/FileMeta.js"

describe("MetaAnalyzer", () => {
    let analyzer: MetaAnalyzer
    let parser: ASTParser
    const projectRoot = "/project"

    beforeAll(() => {
        analyzer = new MetaAnalyzer(projectRoot)
        parser = new ASTParser()
    })

    describe("countLinesOfCode", () => {
        it("should count non-empty lines", () => {
            const content = `const a = 1
const b = 2
const c = 3`
            const loc = analyzer.countLinesOfCode(content)
            expect(loc).toBe(3)
        })

        it("should exclude empty lines", () => {
            const content = `const a = 1

const b = 2

const c = 3`
            const loc = analyzer.countLinesOfCode(content)
            expect(loc).toBe(3)
        })

        it("should exclude single-line comments", () => {
            const content = `// This is a comment
const a = 1
// Another comment
const b = 2`
            const loc = analyzer.countLinesOfCode(content)
            expect(loc).toBe(2)
        })

        it("should exclude block comments", () => {
            const content = `/*
 * Multi-line comment
 */
const a = 1
/* inline block */ const b = 2`
            const loc = analyzer.countLinesOfCode(content)
            expect(loc).toBe(2)
        })

        it("should handle multi-line block comments", () => {
            const content = `const a = 1
/*
comment line 1
comment line 2
*/
const b = 2`
            const loc = analyzer.countLinesOfCode(content)
            expect(loc).toBe(2)
        })

        it("should return 0 for empty content", () => {
            const loc = analyzer.countLinesOfCode("")
            expect(loc).toBe(0)
        })

        it("should return 0 for only comments", () => {
            const content = `// comment 1
// comment 2
/* block comment */`
            const loc = analyzer.countLinesOfCode(content)
            expect(loc).toBe(0)
        })
    })

    describe("calculateMaxNesting", () => {
        it("should return 0 for empty AST", () => {
            const ast = createEmptyFileAST()
            const nesting = analyzer.calculateMaxNesting(ast)
            expect(nesting).toBe(0)
        })

        it("should estimate nesting for short functions", () => {
            const ast = createEmptyFileAST()
            ast.functions.push({
                name: "test",
                lineStart: 1,
                lineEnd: 3,
                params: [],
                isAsync: false,
                isExported: false,
            })
            const nesting = analyzer.calculateMaxNesting(ast)
            expect(nesting).toBe(1)
        })

        it("should estimate higher nesting for longer functions", () => {
            const ast = createEmptyFileAST()
            ast.functions.push({
                name: "test",
                lineStart: 1,
                lineEnd: 40,
                params: [],
                isAsync: false,
                isExported: false,
            })
            const nesting = analyzer.calculateMaxNesting(ast)
            expect(nesting).toBe(4)
        })

        it("should return max nesting across multiple functions", () => {
            const ast = createEmptyFileAST()
            ast.functions.push(
                {
                    name: "short",
                    lineStart: 1,
                    lineEnd: 3,
                    params: [],
                    isAsync: false,
                    isExported: false,
                },
                {
                    name: "long",
                    lineStart: 5,
                    lineEnd: 60,
                    params: [],
                    isAsync: false,
                    isExported: false,
                },
            )
            const nesting = analyzer.calculateMaxNesting(ast)
            expect(nesting).toBe(5)
        })

        it("should account for class methods", () => {
            const ast = createEmptyFileAST()
            ast.classes.push({
                name: "MyClass",
                lineStart: 1,
                lineEnd: 50,
                methods: [
                    {
                        name: "method1",
                        lineStart: 2,
                        lineEnd: 25,
                        params: [],
                        isAsync: false,
                        visibility: "public",
                        isStatic: false,
                    },
                ],
                properties: [],
                implements: [],
                isExported: false,
                isAbstract: false,
            })
            const nesting = analyzer.calculateMaxNesting(ast)
            expect(nesting).toBeGreaterThan(1)
        })
    })

    describe("calculateCyclomaticComplexity", () => {
        it("should return 1 for empty AST", () => {
            const ast = createEmptyFileAST()
            const complexity = analyzer.calculateCyclomaticComplexity(ast)
            expect(complexity).toBe(1)
        })

        it("should increase complexity for functions", () => {
            const ast = createEmptyFileAST()
            ast.functions.push({
                name: "test",
                lineStart: 1,
                lineEnd: 20,
                params: [],
                isAsync: false,
                isExported: false,
            })
            const complexity = analyzer.calculateCyclomaticComplexity(ast)
            expect(complexity).toBeGreaterThan(1)
        })

        it("should increase complexity for class methods", () => {
            const ast = createEmptyFileAST()
            ast.classes.push({
                name: "MyClass",
                lineStart: 1,
                lineEnd: 50,
                methods: [
                    {
                        name: "method1",
                        lineStart: 2,
                        lineEnd: 20,
                        params: [],
                        isAsync: false,
                        visibility: "public",
                        isStatic: false,
                    },
                    {
                        name: "method2",
                        lineStart: 22,
                        lineEnd: 45,
                        params: [],
                        isAsync: false,
                        visibility: "public",
                        isStatic: false,
                    },
                ],
                properties: [],
                implements: [],
                isExported: false,
                isAbstract: false,
            })
            const complexity = analyzer.calculateCyclomaticComplexity(ast)
            expect(complexity).toBeGreaterThan(2)
        })
    })

    describe("calculateComplexityScore", () => {
        it("should return 0 for minimal values", () => {
            const score = analyzer.calculateComplexityScore(0, 0, 0)
            expect(score).toBe(0)
        })

        it("should return 100 for maximum values", () => {
            const score = analyzer.calculateComplexityScore(1000, 10, 50)
            expect(score).toBe(100)
        })

        it("should return intermediate values", () => {
            const score = analyzer.calculateComplexityScore(100, 3, 10)
            expect(score).toBeGreaterThan(0)
            expect(score).toBeLessThan(100)
        })
    })

    describe("resolveDependencies", () => {
        it("should resolve relative imports", () => {
            const ast = createEmptyFileAST()
            ast.imports.push({
                name: "foo",
                from: "./utils",
                line: 1,
                type: "internal",
                isDefault: false,
            })
            const deps = analyzer.resolveDependencies("/project/src/index.ts", ast)
            expect(deps).toHaveLength(1)
            expect(deps[0]).toBe("/project/src/utils.ts")
        })

        it("should resolve parent directory imports", () => {
            const ast = createEmptyFileAST()
            ast.imports.push({
                name: "config",
                from: "../config",
                line: 1,
                type: "internal",
                isDefault: false,
            })
            const deps = analyzer.resolveDependencies("/project/src/utils/helper.ts", ast)
            expect(deps).toHaveLength(1)
            expect(deps[0]).toBe("/project/src/config.ts")
        })

        it("should ignore external imports", () => {
            const ast = createEmptyFileAST()
            ast.imports.push({
                name: "React",
                from: "react",
                line: 1,
                type: "external",
                isDefault: true,
            })
            const deps = analyzer.resolveDependencies("/project/src/index.ts", ast)
            expect(deps).toHaveLength(0)
        })

        it("should ignore builtin imports", () => {
            const ast = createEmptyFileAST()
            ast.imports.push({
                name: "fs",
                from: "node:fs",
                line: 1,
                type: "builtin",
                isDefault: false,
            })
            const deps = analyzer.resolveDependencies("/project/src/index.ts", ast)
            expect(deps).toHaveLength(0)
        })

        it("should handle .js extension to .ts conversion", () => {
            const ast = createEmptyFileAST()
            ast.imports.push({
                name: "util",
                from: "./util.js",
                line: 1,
                type: "internal",
                isDefault: false,
            })
            const deps = analyzer.resolveDependencies("/project/src/index.ts", ast)
            expect(deps).toHaveLength(1)
            expect(deps[0]).toBe("/project/src/util.ts")
        })

        it("should deduplicate dependencies", () => {
            const ast = createEmptyFileAST()
            ast.imports.push(
                {
                    name: "foo",
                    from: "./utils",
                    line: 1,
                    type: "internal",
                    isDefault: false,
                },
                {
                    name: "bar",
                    from: "./utils",
                    line: 2,
                    type: "internal",
                    isDefault: false,
                },
            )
            const deps = analyzer.resolveDependencies("/project/src/index.ts", ast)
            expect(deps).toHaveLength(1)
        })

        it("should sort dependencies", () => {
            const ast = createEmptyFileAST()
            ast.imports.push(
                {
                    name: "c",
                    from: "./c",
                    line: 1,
                    type: "internal",
                    isDefault: false,
                },
                {
                    name: "a",
                    from: "./a",
                    line: 2,
                    type: "internal",
                    isDefault: false,
                },
                {
                    name: "b",
                    from: "./b",
                    line: 3,
                    type: "internal",
                    isDefault: false,
                },
            )
            const deps = analyzer.resolveDependencies("/project/src/index.ts", ast)
            expect(deps).toEqual(["/project/src/a.ts", "/project/src/b.ts", "/project/src/c.ts"])
        })
    })

    describe("findDependents", () => {
        it("should find files that import the given file", () => {
            const allASTs = new Map<string, FileAST>()

            const indexAST = createEmptyFileAST()
            allASTs.set("/project/src/index.ts", indexAST)

            const utilsAST = createEmptyFileAST()
            utilsAST.imports.push({
                name: "helper",
                from: "./helper",
                line: 1,
                type: "internal",
                isDefault: false,
            })
            allASTs.set("/project/src/utils.ts", utilsAST)

            const dependents = analyzer.findDependents("/project/src/helper.ts", allASTs)
            expect(dependents).toHaveLength(1)
            expect(dependents[0]).toBe("/project/src/utils.ts")
        })

        it("should return empty array when no dependents", () => {
            const allASTs = new Map<string, FileAST>()
            allASTs.set("/project/src/index.ts", createEmptyFileAST())
            allASTs.set("/project/src/utils.ts", createEmptyFileAST())

            const dependents = analyzer.findDependents("/project/src/helper.ts", allASTs)
            expect(dependents).toHaveLength(0)
        })

        it("should not include self as dependent", () => {
            const allASTs = new Map<string, FileAST>()
            const selfAST = createEmptyFileAST()
            selfAST.imports.push({
                name: "foo",
                from: "./helper",
                line: 1,
                type: "internal",
                isDefault: false,
            })
            allASTs.set("/project/src/helper.ts", selfAST)

            const dependents = analyzer.findDependents("/project/src/helper.ts", allASTs)
            expect(dependents).toHaveLength(0)
        })

        it("should handle index.ts imports", () => {
            const allASTs = new Map<string, FileAST>()

            const consumerAST = createEmptyFileAST()
            consumerAST.imports.push({
                name: "util",
                from: "./utils",
                line: 1,
                type: "internal",
                isDefault: false,
            })
            allASTs.set("/project/src/consumer.ts", consumerAST)

            const dependents = analyzer.findDependents("/project/src/utils/index.ts", allASTs)
            expect(dependents).toHaveLength(1)
        })

        it("should sort dependents", () => {
            const allASTs = new Map<string, FileAST>()

            const fileC = createEmptyFileAST()
            fileC.imports.push({
                name: "x",
                from: "./target",
                line: 1,
                type: "internal",
                isDefault: false,
            })
            allASTs.set("/project/src/c.ts", fileC)

            const fileA = createEmptyFileAST()
            fileA.imports.push({
                name: "x",
                from: "./target",
                line: 1,
                type: "internal",
                isDefault: false,
            })
            allASTs.set("/project/src/a.ts", fileA)

            const fileB = createEmptyFileAST()
            fileB.imports.push({
                name: "x",
                from: "./target",
                line: 1,
                type: "internal",
                isDefault: false,
            })
            allASTs.set("/project/src/b.ts", fileB)

            const dependents = analyzer.findDependents("/project/src/target.ts", allASTs)
            expect(dependents).toEqual([
                "/project/src/a.ts",
                "/project/src/b.ts",
                "/project/src/c.ts",
            ])
        })
    })

    describe("classifyFileType", () => {
        it("should classify test files by .test. pattern", () => {
            expect(analyzer.classifyFileType("/project/src/utils.test.ts")).toBe("test")
        })

        it("should classify test files by .spec. pattern", () => {
            expect(analyzer.classifyFileType("/project/src/utils.spec.ts")).toBe("test")
        })

        it("should classify test files by /tests/ directory", () => {
            expect(analyzer.classifyFileType("/project/tests/utils.ts")).toBe("test")
        })

        it("should classify test files by /__tests__/ directory", () => {
            expect(analyzer.classifyFileType("/project/src/__tests__/utils.ts")).toBe("test")
        })

        it("should classify .d.ts as types", () => {
            expect(analyzer.classifyFileType("/project/src/types.d.ts")).toBe("types")
        })

        it("should classify /types/ directory as types", () => {
            expect(analyzer.classifyFileType("/project/src/types/index.ts")).toBe("types")
        })

        it("should classify types.ts as types", () => {
            expect(analyzer.classifyFileType("/project/src/types.ts")).toBe("types")
        })

        it("should classify config files", () => {
            expect(analyzer.classifyFileType("/project/tsconfig.json")).toBe("config")
            expect(analyzer.classifyFileType("/project/eslint.config.js")).toBe("config")
            expect(analyzer.classifyFileType("/project/vitest.config.ts")).toBe("config")
            expect(analyzer.classifyFileType("/project/jest.config.js")).toBe("config")
        })

        it("should classify regular source files", () => {
            expect(analyzer.classifyFileType("/project/src/index.ts")).toBe("source")
            expect(analyzer.classifyFileType("/project/src/utils.tsx")).toBe("source")
            expect(analyzer.classifyFileType("/project/src/helper.js")).toBe("source")
        })

        it("should classify unknown file types", () => {
            expect(analyzer.classifyFileType("/project/README.md")).toBe("unknown")
            expect(analyzer.classifyFileType("/project/data.json")).toBe("unknown")
        })
    })

    describe("isEntryPointFile", () => {
        it("should identify index files as entry points", () => {
            expect(analyzer.isEntryPointFile("/project/src/index.ts", 5)).toBe(true)
            expect(analyzer.isEntryPointFile("/project/src/index.js", 5)).toBe(true)
        })

        it("should identify files with no dependents as entry points", () => {
            expect(analyzer.isEntryPointFile("/project/src/utils.ts", 0)).toBe(true)
        })

        it("should identify main.ts as entry point", () => {
            expect(analyzer.isEntryPointFile("/project/src/main.ts", 5)).toBe(true)
        })

        it("should identify app.ts as entry point", () => {
            expect(analyzer.isEntryPointFile("/project/src/app.tsx", 5)).toBe(true)
        })

        it("should identify cli.ts as entry point", () => {
            expect(analyzer.isEntryPointFile("/project/src/cli.ts", 5)).toBe(true)
        })

        it("should identify server.ts as entry point", () => {
            expect(analyzer.isEntryPointFile("/project/src/server.ts", 5)).toBe(true)
        })

        it("should not identify regular files with dependents as entry points", () => {
            expect(analyzer.isEntryPointFile("/project/src/utils.ts", 3)).toBe(false)
        })
    })

    describe("dependency resolution with different extensions", () => {
        it("should resolve imports from index files", () => {
            const content = `import { utils } from "./utils/index"`
            const ast = parser.parse(content, "ts")
            const allASTs = new Map<string, FileAST>()
            allASTs.set("/project/src/main.ts", ast)
            allASTs.set("/project/src/utils/index.ts", createEmptyFileAST())

            const meta = analyzer.analyze("/project/src/main.ts", ast, content, allASTs)

            expect(meta.dependencies).toContain("/project/src/utils/index.ts")
        })

        it("should convert .js extension to .ts when resolving", () => {
            const content = `import { helper } from "./helper.js"`
            const ast = parser.parse(content, "ts")
            const allASTs = new Map<string, FileAST>()
            allASTs.set("/project/src/main.ts", ast)
            allASTs.set("/project/src/helper.ts", createEmptyFileAST())

            const meta = analyzer.analyze("/project/src/main.ts", ast, content, allASTs)

            expect(meta.dependencies).toContain("/project/src/helper.ts")
        })

        it("should convert .jsx extension to .tsx when resolving", () => {
            const content = `import { Button } from "./Button.jsx"`
            const ast = parser.parse(content, "ts")
            const allASTs = new Map<string, FileAST>()
            allASTs.set("/project/src/App.tsx", ast)
            allASTs.set("/project/src/Button.tsx", createEmptyFileAST())

            const meta = analyzer.analyze("/project/src/App.tsx", ast, content, allASTs)

            expect(meta.dependencies).toContain("/project/src/Button.tsx")
        })
    })

    describe("analyze", () => {
        it("should produce complete FileMeta", () => {
            const content = `import { helper } from "./helper"

export function main() {
    return helper()
}
`
            const ast = parser.parse(content, "ts")
            const allASTs = new Map<string, FileAST>()
            allASTs.set("/project/src/index.ts", ast)

            const meta = analyzer.analyze("/project/src/index.ts", ast, content, allASTs)

            expect(meta.complexity).toBeDefined()
            expect(meta.complexity.loc).toBeGreaterThan(0)
            expect(meta.dependencies).toHaveLength(1)
            expect(meta.fileType).toBe("source")
            expect(meta.isEntryPoint).toBe(true)
        })

        it("should identify hub files", () => {
            const content = `export const util = () => {}`
            const ast = parser.parse(content, "ts")
            const allASTs = new Map<string, FileAST>()

            for (let i = 0; i < 6; i++) {
                const consumerAST = createEmptyFileAST()
                consumerAST.imports.push({
                    name: "util",
                    from: "./shared",
                    line: 1,
                    type: "internal",
                    isDefault: false,
                })
                allASTs.set(`/project/src/consumer${i}.ts`, consumerAST)
            }

            const meta = analyzer.analyze("/project/src/shared.ts", ast, content, allASTs)
            expect(meta.isHub).toBe(true)
            expect(meta.dependents).toHaveLength(6)
        })

        it("should not identify as hub with few dependents", () => {
            const content = `export const util = () => {}`
            const ast = parser.parse(content, "ts")
            const allASTs = new Map<string, FileAST>()

            for (let i = 0; i < 3; i++) {
                const consumerAST = createEmptyFileAST()
                consumerAST.imports.push({
                    name: "util",
                    from: "./shared",
                    line: 1,
                    type: "internal",
                    isDefault: false,
                })
                allASTs.set(`/project/src/consumer${i}.ts`, consumerAST)
            }

            const meta = analyzer.analyze("/project/src/shared.ts", ast, content, allASTs)
            expect(meta.isHub).toBe(false)
        })
    })

    describe("analyzeAll", () => {
        it("should analyze multiple files", () => {
            const files = new Map<string, { ast: FileAST; content: string }>()

            const indexContent = `import { util } from "./util"
export function main() { return util() }`
            const indexAST = parser.parse(indexContent, "ts")
            files.set("/project/src/index.ts", { ast: indexAST, content: indexContent })

            const utilContent = `export function util() { return 42 }`
            const utilAST = parser.parse(utilContent, "ts")
            files.set("/project/src/util.ts", { ast: utilAST, content: utilContent })

            const results = analyzer.analyzeAll(files)

            expect(results.size).toBe(2)
            expect(results.get("/project/src/index.ts")).toBeDefined()
            expect(results.get("/project/src/util.ts")).toBeDefined()

            const indexMeta = results.get("/project/src/index.ts")!
            expect(indexMeta.dependencies).toContain("/project/src/util.ts")

            const utilMeta = results.get("/project/src/util.ts")!
            expect(utilMeta.dependents).toContain("/project/src/index.ts")
        })

        it("should handle empty files map", () => {
            const files = new Map<string, { ast: FileAST; content: string }>()
            const results = analyzer.analyzeAll(files)
            expect(results.size).toBe(0)
        })
    })

    describe("calculateComplexity", () => {
        it("should return complete complexity metrics", () => {
            const content = `function complex() {
    if (true) {
        for (let i = 0; i < 10; i++) {
            if (i % 2 === 0) {
                console.log(i)
            }
        }
    }
    return 42
}`
            const ast = parser.parse(content, "ts")
            const metrics = analyzer.calculateComplexity(ast, content)

            expect(metrics.loc).toBeGreaterThan(0)
            expect(metrics.nesting).toBeGreaterThan(0)
            expect(metrics.cyclomaticComplexity).toBeGreaterThan(0)
            expect(metrics.score).toBeGreaterThanOrEqual(0)
            expect(metrics.score).toBeLessThanOrEqual(100)
        })
    })

    describe("integration with ASTParser", () => {
        it("should work with real parsed AST", () => {
            const content = `import { readFile } from "node:fs"
import { helper } from "./helper"
import React from "react"

export class MyComponent {
    private data: string[] = []

    async loadData(): Promise<void> {
        const content = await readFile("file.txt", "utf-8")
        this.data = content.split("\\n")
    }

    render() {
        return this.data.map(line => <div>{line}</div>)
    }
}

export function createComponent(): MyComponent {
    return new MyComponent()
}
`
            const ast = parser.parse(content, "tsx")
            const allASTs = new Map<string, FileAST>()
            allASTs.set("/project/src/Component.tsx", ast)

            const meta = analyzer.analyze("/project/src/Component.tsx", ast, content, allASTs)

            expect(meta.complexity.loc).toBeGreaterThan(10)
            expect(meta.dependencies).toContain("/project/src/helper.ts")
            expect(meta.fileType).toBe("source")
        })
    })

    describe("computeTransitiveCounts", () => {
        it("should compute transitive dependents for a simple chain", () => {
            // A -> B -> C (A depends on B, B depends on C)
            // So C has transitive dependents: B, A
            const metas = new Map<string, FileMeta>()
            metas.set(
                "/project/a.ts",
                createFileMeta({
                    dependencies: ["/project/b.ts"],
                    dependents: [],
                }),
            )
            metas.set(
                "/project/b.ts",
                createFileMeta({
                    dependencies: ["/project/c.ts"],
                    dependents: ["/project/a.ts"],
                }),
            )
            metas.set(
                "/project/c.ts",
                createFileMeta({
                    dependencies: [],
                    dependents: ["/project/b.ts"],
                }),
            )

            analyzer.computeTransitiveCounts(metas)

            expect(metas.get("/project/c.ts")!.transitiveDepCount).toBe(2) // B and A
            expect(metas.get("/project/b.ts")!.transitiveDepCount).toBe(1) // A
            expect(metas.get("/project/a.ts")!.transitiveDepCount).toBe(0) // none
        })

        it("should compute transitive dependencies for a simple chain", () => {
            // A -> B -> C (A depends on B, B depends on C)
            // So A has transitive dependencies: B, C
            const metas = new Map<string, FileMeta>()
            metas.set(
                "/project/a.ts",
                createFileMeta({
                    dependencies: ["/project/b.ts"],
                    dependents: [],
                }),
            )
            metas.set(
                "/project/b.ts",
                createFileMeta({
                    dependencies: ["/project/c.ts"],
                    dependents: ["/project/a.ts"],
                }),
            )
            metas.set(
                "/project/c.ts",
                createFileMeta({
                    dependencies: [],
                    dependents: ["/project/b.ts"],
                }),
            )

            analyzer.computeTransitiveCounts(metas)

            expect(metas.get("/project/a.ts")!.transitiveDepByCount).toBe(2) // B and C
            expect(metas.get("/project/b.ts")!.transitiveDepByCount).toBe(1) // C
            expect(metas.get("/project/c.ts")!.transitiveDepByCount).toBe(0) // none
        })

        it("should handle diamond dependency pattern", () => {
            //     A
            //    / \
            //   B   C
            //    \ /
            //     D
            // A depends on B and C, both depend on D
            const metas = new Map<string, FileMeta>()
            metas.set(
                "/project/a.ts",
                createFileMeta({
                    dependencies: ["/project/b.ts", "/project/c.ts"],
                    dependents: [],
                }),
            )
            metas.set(
                "/project/b.ts",
                createFileMeta({
                    dependencies: ["/project/d.ts"],
                    dependents: ["/project/a.ts"],
                }),
            )
            metas.set(
                "/project/c.ts",
                createFileMeta({
                    dependencies: ["/project/d.ts"],
                    dependents: ["/project/a.ts"],
                }),
            )
            metas.set(
                "/project/d.ts",
                createFileMeta({
                    dependencies: [],
                    dependents: ["/project/b.ts", "/project/c.ts"],
                }),
            )

            analyzer.computeTransitiveCounts(metas)

            // D is depended on by B, C, and transitively by A
            expect(metas.get("/project/d.ts")!.transitiveDepCount).toBe(3)
            // A depends on B, C, and transitively on D
            expect(metas.get("/project/a.ts")!.transitiveDepByCount).toBe(3)
        })

        it("should handle circular dependencies gracefully", () => {
            // A -> B -> C -> A (circular)
            const metas = new Map<string, FileMeta>()
            metas.set(
                "/project/a.ts",
                createFileMeta({
                    dependencies: ["/project/b.ts"],
                    dependents: ["/project/c.ts"],
                }),
            )
            metas.set(
                "/project/b.ts",
                createFileMeta({
                    dependencies: ["/project/c.ts"],
                    dependents: ["/project/a.ts"],
                }),
            )
            metas.set(
                "/project/c.ts",
                createFileMeta({
                    dependencies: ["/project/a.ts"],
                    dependents: ["/project/b.ts"],
                }),
            )

            // Should not throw, should handle cycles
            analyzer.computeTransitiveCounts(metas)

            // Each file has the other 2 as transitive dependents
            expect(metas.get("/project/a.ts")!.transitiveDepCount).toBe(2)
            expect(metas.get("/project/b.ts")!.transitiveDepCount).toBe(2)
            expect(metas.get("/project/c.ts")!.transitiveDepCount).toBe(2)
        })

        it("should return 0 for files with no dependencies", () => {
            const metas = new Map<string, FileMeta>()
            metas.set(
                "/project/a.ts",
                createFileMeta({
                    dependencies: [],
                    dependents: [],
                }),
            )

            analyzer.computeTransitiveCounts(metas)

            expect(metas.get("/project/a.ts")!.transitiveDepCount).toBe(0)
            expect(metas.get("/project/a.ts")!.transitiveDepByCount).toBe(0)
        })

        it("should handle empty metas map", () => {
            const metas = new Map<string, FileMeta>()
            // Should not throw
            expect(() => analyzer.computeTransitiveCounts(metas)).not.toThrow()
        })

        it("should handle single file", () => {
            const metas = new Map<string, FileMeta>()
            metas.set(
                "/project/a.ts",
                createFileMeta({
                    dependencies: [],
                    dependents: [],
                }),
            )

            analyzer.computeTransitiveCounts(metas)

            expect(metas.get("/project/a.ts")!.transitiveDepCount).toBe(0)
            expect(metas.get("/project/a.ts")!.transitiveDepByCount).toBe(0)
        })

        it("should handle multiple roots depending on same leaf", () => {
            // A -> C, B -> C
            const metas = new Map<string, FileMeta>()
            metas.set(
                "/project/a.ts",
                createFileMeta({
                    dependencies: ["/project/c.ts"],
                    dependents: [],
                }),
            )
            metas.set(
                "/project/b.ts",
                createFileMeta({
                    dependencies: ["/project/c.ts"],
                    dependents: [],
                }),
            )
            metas.set(
                "/project/c.ts",
                createFileMeta({
                    dependencies: [],
                    dependents: ["/project/a.ts", "/project/b.ts"],
                }),
            )

            analyzer.computeTransitiveCounts(metas)

            expect(metas.get("/project/c.ts")!.transitiveDepCount).toBe(2) // A and B
            expect(metas.get("/project/a.ts")!.transitiveDepByCount).toBe(1) // C
            expect(metas.get("/project/b.ts")!.transitiveDepByCount).toBe(1) // C
        })

        it("should handle deep dependency chains", () => {
            // A -> B -> C -> D -> E
            const metas = new Map<string, FileMeta>()
            metas.set(
                "/project/a.ts",
                createFileMeta({
                    dependencies: ["/project/b.ts"],
                    dependents: [],
                }),
            )
            metas.set(
                "/project/b.ts",
                createFileMeta({
                    dependencies: ["/project/c.ts"],
                    dependents: ["/project/a.ts"],
                }),
            )
            metas.set(
                "/project/c.ts",
                createFileMeta({
                    dependencies: ["/project/d.ts"],
                    dependents: ["/project/b.ts"],
                }),
            )
            metas.set(
                "/project/d.ts",
                createFileMeta({
                    dependencies: ["/project/e.ts"],
                    dependents: ["/project/c.ts"],
                }),
            )
            metas.set(
                "/project/e.ts",
                createFileMeta({
                    dependencies: [],
                    dependents: ["/project/d.ts"],
                }),
            )

            analyzer.computeTransitiveCounts(metas)

            // E has transitive dependents: D, C, B, A
            expect(metas.get("/project/e.ts")!.transitiveDepCount).toBe(4)
            // A has transitive dependencies: B, C, D, E
            expect(metas.get("/project/a.ts")!.transitiveDepByCount).toBe(4)
        })
    })

    describe("getTransitiveDependents", () => {
        it("should return empty set for file not in metas", () => {
            const metas = new Map<string, FileMeta>()
            const cache = new Map<string, Set<string>>()

            const result = analyzer.getTransitiveDependents("/project/unknown.ts", metas, cache)

            expect(result.size).toBe(0)
        })

        it("should use cache for repeated calls", () => {
            const metas = new Map<string, FileMeta>()
            metas.set(
                "/project/a.ts",
                createFileMeta({
                    dependencies: [],
                    dependents: ["/project/b.ts"],
                }),
            )
            metas.set(
                "/project/b.ts",
                createFileMeta({
                    dependencies: ["/project/a.ts"],
                    dependents: [],
                }),
            )

            const cache = new Map<string, Set<string>>()
            const result1 = analyzer.getTransitiveDependents("/project/a.ts", metas, cache)
            const result2 = analyzer.getTransitiveDependents("/project/a.ts", metas, cache)

            // Should return same instance from cache
            expect(result1).toBe(result2)
            expect(result1.size).toBe(1)
        })
    })

    describe("getTransitiveDependencies", () => {
        it("should return empty set for file not in metas", () => {
            const metas = new Map<string, FileMeta>()
            const cache = new Map<string, Set<string>>()

            const result = analyzer.getTransitiveDependencies("/project/unknown.ts", metas, cache)

            expect(result.size).toBe(0)
        })

        it("should use cache for repeated calls", () => {
            const metas = new Map<string, FileMeta>()
            metas.set(
                "/project/a.ts",
                createFileMeta({
                    dependencies: ["/project/b.ts"],
                    dependents: [],
                }),
            )
            metas.set(
                "/project/b.ts",
                createFileMeta({
                    dependencies: [],
                    dependents: ["/project/a.ts"],
                }),
            )

            const cache = new Map<string, Set<string>>()
            const result1 = analyzer.getTransitiveDependencies("/project/a.ts", metas, cache)
            const result2 = analyzer.getTransitiveDependencies("/project/a.ts", metas, cache)

            // Should return same instance from cache
            expect(result1).toBe(result2)
            expect(result1.size).toBe(1)
        })
    })

    describe("analyzeAll with transitive counts", () => {
        it("should compute transitive counts in analyzeAll", () => {
            const files = new Map<string, { ast: FileAST; content: string }>()

            // A imports B, B imports C
            const aContent = `import { b } from "./b"`
            const aAST = parser.parse(aContent, "ts")
            files.set("/project/src/a.ts", { ast: aAST, content: aContent })

            const bContent = `import { c } from "./c"\nexport const b = () => c()`
            const bAST = parser.parse(bContent, "ts")
            files.set("/project/src/b.ts", { ast: bAST, content: bContent })

            const cContent = `export const c = () => 42`
            const cAST = parser.parse(cContent, "ts")
            files.set("/project/src/c.ts", { ast: cAST, content: cContent })

            const results = analyzer.analyzeAll(files)

            // C has transitive dependents: B and A
            expect(results.get("/project/src/c.ts")!.transitiveDepCount).toBe(2)
            // A has transitive dependencies: B and C
            expect(results.get("/project/src/a.ts")!.transitiveDepByCount).toBe(2)
        })
    })
})
