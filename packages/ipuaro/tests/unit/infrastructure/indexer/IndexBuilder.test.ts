import { describe, it, expect, beforeAll } from "vitest"
import { IndexBuilder } from "../../../../src/infrastructure/indexer/IndexBuilder.js"
import { ASTParser } from "../../../../src/infrastructure/indexer/ASTParser.js"
import type { FileAST } from "../../../../src/domain/value-objects/FileAST.js"
import { createEmptyFileAST } from "../../../../src/domain/value-objects/FileAST.js"

describe("IndexBuilder", () => {
    let builder: IndexBuilder
    let parser: ASTParser
    const projectRoot = "/project"

    beforeAll(() => {
        builder = new IndexBuilder(projectRoot)
        parser = new ASTParser()
    })

    describe("buildSymbolIndex", () => {
        it("should index function declarations", () => {
            const code = `
export function greet(name: string): string {
    return \`Hello, \${name}!\`
}

function privateHelper(): void {}
`
            const ast = parser.parse(code, "ts")
            const asts = new Map<string, FileAST>([["/project/src/utils.ts", ast]])

            const index = builder.buildSymbolIndex(asts)

            expect(index.has("greet")).toBe(true)
            expect(index.has("privateHelper")).toBe(true)
            expect(index.get("greet")).toEqual([
                { path: "/project/src/utils.ts", line: 2, type: "function" },
            ])
        })

        it("should index class declarations and methods", () => {
            const code = `
export class UserService {
    async findById(id: string): Promise<User> {
        return this.db.find(id)
    }

    private validate(data: unknown): void {}
}
`
            const ast = parser.parse(code, "ts")
            const asts = new Map<string, FileAST>([["/project/src/UserService.ts", ast]])

            const index = builder.buildSymbolIndex(asts)

            expect(index.has("UserService")).toBe(true)
            expect(index.get("UserService")).toEqual([
                { path: "/project/src/UserService.ts", line: 2, type: "class" },
            ])

            expect(index.has("UserService.findById")).toBe(true)
            expect(index.has("UserService.validate")).toBe(true)
        })

        it("should index interface declarations", () => {
            const code = `
export interface User {
    id: string
    name: string
}

interface InternalConfig {
    debug: boolean
}
`
            const ast = parser.parse(code, "ts")
            const asts = new Map<string, FileAST>([["/project/src/types.ts", ast]])

            const index = builder.buildSymbolIndex(asts)

            expect(index.has("User")).toBe(true)
            expect(index.has("InternalConfig")).toBe(true)
            expect(index.get("User")).toEqual([
                { path: "/project/src/types.ts", line: 2, type: "interface" },
            ])
        })

        it("should index type alias declarations", () => {
            const code = `
export type UserId = string
type Handler = (event: Event) => void
`
            const ast = parser.parse(code, "ts")
            const asts = new Map<string, FileAST>([["/project/src/types.ts", ast]])

            const index = builder.buildSymbolIndex(asts)

            expect(index.has("UserId")).toBe(true)
            expect(index.has("Handler")).toBe(true)
            expect(index.get("UserId")).toEqual([
                { path: "/project/src/types.ts", line: 2, type: "type" },
            ])
        })

        it("should index exported variables", () => {
            const code = `
export const API_URL = "https://api.example.com"
export const DEFAULT_TIMEOUT = 5000
`
            const ast = parser.parse(code, "ts")
            const asts = new Map<string, FileAST>([["/project/src/config.ts", ast]])

            const index = builder.buildSymbolIndex(asts)

            expect(index.has("API_URL")).toBe(true)
            expect(index.has("DEFAULT_TIMEOUT")).toBe(true)
        })

        it("should handle multiple files", () => {
            const userCode = `export class User { name: string }`
            const orderCode = `export class Order { id: string }`

            const asts = new Map<string, FileAST>([
                ["/project/src/User.ts", parser.parse(userCode, "ts")],
                ["/project/src/Order.ts", parser.parse(orderCode, "ts")],
            ])

            const index = builder.buildSymbolIndex(asts)

            expect(index.has("User")).toBe(true)
            expect(index.has("Order")).toBe(true)
            expect(index.get("User")?.[0].path).toBe("/project/src/User.ts")
            expect(index.get("Order")?.[0].path).toBe("/project/src/Order.ts")
        })

        it("should handle duplicate symbol names across files", () => {
            const file1 = `export function helper(): void {}`
            const file2 = `export function helper(): void {}`

            const asts = new Map<string, FileAST>([
                ["/project/src/a/utils.ts", parser.parse(file1, "ts")],
                ["/project/src/b/utils.ts", parser.parse(file2, "ts")],
            ])

            const index = builder.buildSymbolIndex(asts)

            expect(index.has("helper")).toBe(true)
            expect(index.get("helper")).toHaveLength(2)
        })

        it("should return empty index for empty ASTs", () => {
            const asts = new Map<string, FileAST>()
            const index = builder.buildSymbolIndex(asts)
            expect(index.size).toBe(0)
        })

        it("should not index empty names", () => {
            const ast = createEmptyFileAST()
            ast.functions.push({
                name: "",
                lineStart: 1,
                lineEnd: 3,
                params: [],
                isAsync: false,
                isExported: false,
            })
            const asts = new Map<string, FileAST>([["/project/src/test.ts", ast]])

            const index = builder.buildSymbolIndex(asts)
            expect(index.has("")).toBe(false)
        })
    })

    describe("buildDepsGraph", () => {
        it("should build import relationships", () => {
            const indexCode = `
import { helper } from "./utils"
export function main() { return helper() }
`
            const utilsCode = `export function helper() { return 42 }`

            const asts = new Map<string, FileAST>([
                ["/project/src/index.ts", parser.parse(indexCode, "ts")],
                ["/project/src/utils.ts", parser.parse(utilsCode, "ts")],
            ])

            const graph = builder.buildDepsGraph(asts)

            expect(graph.imports.get("/project/src/index.ts")).toContain("/project/src/utils.ts")
            expect(graph.imports.get("/project/src/utils.ts")).toEqual([])
        })

        it("should build reverse import relationships", () => {
            const indexCode = `import { helper } from "./utils"`
            const utilsCode = `export function helper() {}`

            const asts = new Map<string, FileAST>([
                ["/project/src/index.ts", parser.parse(indexCode, "ts")],
                ["/project/src/utils.ts", parser.parse(utilsCode, "ts")],
            ])

            const graph = builder.buildDepsGraph(asts)

            expect(graph.importedBy.get("/project/src/utils.ts")).toContain("/project/src/index.ts")
            expect(graph.importedBy.get("/project/src/index.ts")).toEqual([])
        })

        it("should handle multiple imports from same file", () => {
            const code = `
import { a } from "./utils"
import { b } from "./utils"
`
            const utilsCode = `export const a = 1; export const b = 2;`

            const asts = new Map<string, FileAST>([
                ["/project/src/index.ts", parser.parse(code, "ts")],
                ["/project/src/utils.ts", parser.parse(utilsCode, "ts")],
            ])

            const graph = builder.buildDepsGraph(asts)

            const imports = graph.imports.get("/project/src/index.ts") ?? []
            expect(imports.filter((i) => i === "/project/src/utils.ts")).toHaveLength(1)
        })

        it("should ignore external imports", () => {
            const code = `
import React from "react"
import { helper } from "./utils"
`
            const utilsCode = `export function helper() {}`

            const asts = new Map<string, FileAST>([
                ["/project/src/index.ts", parser.parse(code, "ts")],
                ["/project/src/utils.ts", parser.parse(utilsCode, "ts")],
            ])

            const graph = builder.buildDepsGraph(asts)

            const imports = graph.imports.get("/project/src/index.ts") ?? []
            expect(imports).not.toContain("react")
            expect(imports).toContain("/project/src/utils.ts")
        })

        it("should ignore builtin imports", () => {
            const code = `
import * as fs from "node:fs"
import { helper } from "./utils"
`
            const utilsCode = `export function helper() {}`

            const asts = new Map<string, FileAST>([
                ["/project/src/index.ts", parser.parse(code, "ts")],
                ["/project/src/utils.ts", parser.parse(utilsCode, "ts")],
            ])

            const graph = builder.buildDepsGraph(asts)

            const imports = graph.imports.get("/project/src/index.ts") ?? []
            expect(imports).not.toContain("node:fs")
        })

        it("should handle index.ts imports", () => {
            const code = `import { util } from "./utils"`
            const indexCode = `export function util() {}`

            const asts = new Map<string, FileAST>([
                ["/project/src/main.ts", parser.parse(code, "ts")],
                ["/project/src/utils/index.ts", parser.parse(indexCode, "ts")],
            ])

            const graph = builder.buildDepsGraph(asts)

            expect(graph.imports.get("/project/src/main.ts")).toContain(
                "/project/src/utils/index.ts",
            )
        })

        it("should handle .js extension imports", () => {
            const code = `import { helper } from "./utils.js"`
            const utilsCode = `export function helper() {}`

            const asts = new Map<string, FileAST>([
                ["/project/src/index.ts", parser.parse(code, "ts")],
                ["/project/src/utils.ts", parser.parse(utilsCode, "ts")],
            ])

            const graph = builder.buildDepsGraph(asts)

            expect(graph.imports.get("/project/src/index.ts")).toContain("/project/src/utils.ts")
        })

        it("should sort dependencies", () => {
            const code = `
import { c } from "./c"
import { a } from "./a"
import { b } from "./b"
`
            const asts = new Map<string, FileAST>([
                ["/project/src/index.ts", parser.parse(code, "ts")],
                ["/project/src/a.ts", parser.parse("export const a = 1", "ts")],
                ["/project/src/b.ts", parser.parse("export const b = 2", "ts")],
                ["/project/src/c.ts", parser.parse("export const c = 3", "ts")],
            ])

            const graph = builder.buildDepsGraph(asts)

            expect(graph.imports.get("/project/src/index.ts")).toEqual([
                "/project/src/a.ts",
                "/project/src/b.ts",
                "/project/src/c.ts",
            ])
        })

        it("should return empty graph for empty ASTs", () => {
            const asts = new Map<string, FileAST>()
            const graph = builder.buildDepsGraph(asts)
            expect(graph.imports.size).toBe(0)
            expect(graph.importedBy.size).toBe(0)
        })
    })

    describe("findSymbol", () => {
        it("should find existing symbol", () => {
            const code = `export function greet(): void {}`
            const asts = new Map<string, FileAST>([
                ["/project/src/utils.ts", parser.parse(code, "ts")],
            ])
            const index = builder.buildSymbolIndex(asts)

            const locations = builder.findSymbol(index, "greet")
            expect(locations).toHaveLength(1)
            expect(locations[0].path).toBe("/project/src/utils.ts")
        })

        it("should return empty array for non-existent symbol", () => {
            const asts = new Map<string, FileAST>()
            const index = builder.buildSymbolIndex(asts)

            const locations = builder.findSymbol(index, "nonexistent")
            expect(locations).toEqual([])
        })
    })

    describe("searchSymbols", () => {
        it("should find symbols matching pattern", () => {
            const code = `
export function getUserById(): void {}
export function getUserByEmail(): void {}
export function createOrder(): void {}
`
            const asts = new Map<string, FileAST>([
                ["/project/src/api.ts", parser.parse(code, "ts")],
            ])
            const index = builder.buildSymbolIndex(asts)

            const results = builder.searchSymbols(index, "getUser")
            expect(results.size).toBe(2)
            expect(results.has("getUserById")).toBe(true)
            expect(results.has("getUserByEmail")).toBe(true)
        })

        it("should be case insensitive", () => {
            const code = `export function MyFunction(): void {}`
            const asts = new Map<string, FileAST>([
                ["/project/src/test.ts", parser.parse(code, "ts")],
            ])
            const index = builder.buildSymbolIndex(asts)

            const results = builder.searchSymbols(index, "myfunction")
            expect(results.has("MyFunction")).toBe(true)
        })

        it("should return empty map for no matches", () => {
            const code = `export function test(): void {}`
            const asts = new Map<string, FileAST>([
                ["/project/src/test.ts", parser.parse(code, "ts")],
            ])
            const index = builder.buildSymbolIndex(asts)

            const results = builder.searchSymbols(index, "xyz123")
            expect(results.size).toBe(0)
        })
    })

    describe("getDependencies", () => {
        it("should return file dependencies", () => {
            const indexCode = `import { a } from "./a"`
            const aCode = `export const a = 1`

            const asts = new Map<string, FileAST>([
                ["/project/src/index.ts", parser.parse(indexCode, "ts")],
                ["/project/src/a.ts", parser.parse(aCode, "ts")],
            ])
            const graph = builder.buildDepsGraph(asts)

            const deps = builder.getDependencies(graph, "/project/src/index.ts")
            expect(deps).toContain("/project/src/a.ts")
        })

        it("should return empty array for file not in graph", () => {
            const asts = new Map<string, FileAST>()
            const graph = builder.buildDepsGraph(asts)

            const deps = builder.getDependencies(graph, "/nonexistent.ts")
            expect(deps).toEqual([])
        })
    })

    describe("getDependents", () => {
        it("should return file dependents", () => {
            const indexCode = `import { a } from "./a"`
            const aCode = `export const a = 1`

            const asts = new Map<string, FileAST>([
                ["/project/src/index.ts", parser.parse(indexCode, "ts")],
                ["/project/src/a.ts", parser.parse(aCode, "ts")],
            ])
            const graph = builder.buildDepsGraph(asts)

            const dependents = builder.getDependents(graph, "/project/src/a.ts")
            expect(dependents).toContain("/project/src/index.ts")
        })

        it("should return empty array for file not in graph", () => {
            const asts = new Map<string, FileAST>()
            const graph = builder.buildDepsGraph(asts)

            const dependents = builder.getDependents(graph, "/nonexistent.ts")
            expect(dependents).toEqual([])
        })
    })

    describe("findCircularDependencies", () => {
        it("should detect simple circular dependency", () => {
            const aCode = `import { b } from "./b"; export const a = 1;`
            const bCode = `import { a } from "./a"; export const b = 2;`

            const asts = new Map<string, FileAST>([
                ["/project/src/a.ts", parser.parse(aCode, "ts")],
                ["/project/src/b.ts", parser.parse(bCode, "ts")],
            ])
            const graph = builder.buildDepsGraph(asts)

            const cycles = builder.findCircularDependencies(graph)
            expect(cycles.length).toBe(1)
            expect(cycles[0]).toContain("/project/src/a.ts")
            expect(cycles[0]).toContain("/project/src/b.ts")
        })

        it("should detect three-way circular dependency", () => {
            const aCode = `import { b } from "./b"; export const a = 1;`
            const bCode = `import { c } from "./c"; export const b = 2;`
            const cCode = `import { a } from "./a"; export const c = 3;`

            const asts = new Map<string, FileAST>([
                ["/project/src/a.ts", parser.parse(aCode, "ts")],
                ["/project/src/b.ts", parser.parse(bCode, "ts")],
                ["/project/src/c.ts", parser.parse(cCode, "ts")],
            ])
            const graph = builder.buildDepsGraph(asts)

            const cycles = builder.findCircularDependencies(graph)
            expect(cycles.length).toBe(1)
            expect(cycles[0]).toHaveLength(4)
        })

        it("should return empty array when no cycles", () => {
            const aCode = `export const a = 1`
            const bCode = `import { a } from "./a"; export const b = a + 1;`
            const cCode = `import { b } from "./b"; export const c = b + 1;`

            const asts = new Map<string, FileAST>([
                ["/project/src/a.ts", parser.parse(aCode, "ts")],
                ["/project/src/b.ts", parser.parse(bCode, "ts")],
                ["/project/src/c.ts", parser.parse(cCode, "ts")],
            ])
            const graph = builder.buildDepsGraph(asts)

            const cycles = builder.findCircularDependencies(graph)
            expect(cycles).toEqual([])
        })

        it("should handle self-reference", () => {
            const aCode = `import { helper } from "./a"; export const a = 1; export function helper() {}`

            const asts = new Map<string, FileAST>([
                ["/project/src/a.ts", parser.parse(aCode, "ts")],
            ])
            const graph = builder.buildDepsGraph(asts)

            const cycles = builder.findCircularDependencies(graph)
            expect(cycles.length).toBe(1)
        })
    })

    describe("getStats", () => {
        it("should return comprehensive statistics", () => {
            const code1 = `
export function func1(): void {}
export class Class1 {}
export interface Interface1 {}
export type Type1 = string
export const VAR1 = 1
`
            const code2 = `
import { func1 } from "./file1"
export function func2(): void {}
`
            const asts = new Map<string, FileAST>([
                ["/project/src/file1.ts", parser.parse(code1, "ts")],
                ["/project/src/file2.ts", parser.parse(code2, "ts")],
            ])

            const symbolIndex = builder.buildSymbolIndex(asts)
            const depsGraph = builder.buildDepsGraph(asts)
            const stats = builder.getStats(symbolIndex, depsGraph)

            expect(stats.totalSymbols).toBeGreaterThan(0)
            expect(stats.symbolsByType.function).toBeGreaterThan(0)
            expect(stats.symbolsByType.class).toBe(1)
            expect(stats.symbolsByType.interface).toBe(1)
            expect(stats.symbolsByType.type).toBe(1)
            expect(stats.totalFiles).toBe(2)
            expect(stats.totalDependencies).toBe(1)
        })

        it("should identify hubs", () => {
            const hubCode = `export const shared = 1`
            const consumerCodes = Array.from({ length: 6 }, () => `import { shared } from "./hub"`)

            const asts = new Map<string, FileAST>([
                ["/project/src/hub.ts", parser.parse(hubCode, "ts")],
            ])
            consumerCodes.forEach((code, i) => {
                asts.set(`/project/src/consumer${i}.ts`, parser.parse(code, "ts"))
            })

            const symbolIndex = builder.buildSymbolIndex(asts)
            const depsGraph = builder.buildDepsGraph(asts)
            const stats = builder.getStats(symbolIndex, depsGraph)

            expect(stats.hubs).toContain("/project/src/hub.ts")
        })

        it("should identify orphans", () => {
            const orphanCode = `const internal = 1`

            const asts = new Map<string, FileAST>([
                ["/project/src/orphan.ts", parser.parse(orphanCode, "ts")],
            ])

            const symbolIndex = builder.buildSymbolIndex(asts)
            const depsGraph = builder.buildDepsGraph(asts)
            const stats = builder.getStats(symbolIndex, depsGraph)

            expect(stats.orphans).toContain("/project/src/orphan.ts")
        })
    })

    describe("integration with ASTParser", () => {
        it("should work with complex TypeScript code", () => {
            const code = `
import { BaseService } from "./base"
import type { User, UserDTO } from "./types"

export class UserService extends BaseService {
    private readonly cache = new Map<string, User>()

    async findById(id: string): Promise<User | null> {
        if (this.cache.has(id)) {
            return this.cache.get(id)!
        }
        return this.repository.find(id)
    }

    toDTO(user: User): UserDTO {
        return { id: user.id, name: user.name }
    }
}

export type ServiceResult<T> = { success: true; data: T } | { success: false; error: string }
`
            const baseCode = `export class BaseService { protected repository: any }`
            const typesCode = `export interface User { id: string; name: string }; export interface UserDTO { id: string; name: string }`

            const asts = new Map<string, FileAST>([
                ["/project/src/UserService.ts", parser.parse(code, "ts")],
                ["/project/src/base.ts", parser.parse(baseCode, "ts")],
                ["/project/src/types.ts", parser.parse(typesCode, "ts")],
            ])

            const symbolIndex = builder.buildSymbolIndex(asts)
            const depsGraph = builder.buildDepsGraph(asts)

            expect(symbolIndex.has("UserService")).toBe(true)
            expect(symbolIndex.has("UserService.findById")).toBe(true)
            expect(symbolIndex.has("UserService.toDTO")).toBe(true)
            expect(symbolIndex.has("ServiceResult")).toBe(true)
            expect(symbolIndex.has("BaseService")).toBe(true)
            expect(symbolIndex.has("User")).toBe(true)

            expect(depsGraph.imports.get("/project/src/UserService.ts")).toContain(
                "/project/src/base.ts",
            )
            expect(depsGraph.imports.get("/project/src/UserService.ts")).toContain(
                "/project/src/types.ts",
            )
        })
    })
})
