import { describe, it, expect, beforeAll } from "vitest"
import { ASTParser } from "../../../../src/infrastructure/indexer/ASTParser.js"

describe("ASTParser", () => {
    let parser: ASTParser

    beforeAll(() => {
        parser = new ASTParser()
    })

    describe("parse", () => {
        it("should parse empty file", () => {
            const ast = parser.parse("", "ts")
            expect(ast.parseError).toBe(false)
            expect(ast.imports).toHaveLength(0)
            expect(ast.exports).toHaveLength(0)
            expect(ast.functions).toHaveLength(0)
            expect(ast.classes).toHaveLength(0)
        })

        it("should handle syntax errors gracefully", () => {
            const code = "export function {{{ invalid"
            const ast = parser.parse(code, "ts")
            expect(ast.parseError).toBe(true)
            expect(ast.parseErrorMessage).toBeDefined()
        })

        it("should return error for unsupported language", () => {
            const ast = parser.parse("const x = 1", "py" as never)
            expect(ast.parseError).toBe(true)
            expect(ast.parseErrorMessage).toContain("Unsupported language")
        })
    })

    describe("imports", () => {
        it("should extract default import", () => {
            const code = `import React from "react"`
            const ast = parser.parse(code, "ts")
            expect(ast.imports).toHaveLength(1)
            expect(ast.imports[0]).toMatchObject({
                name: "React",
                from: "react",
                isDefault: true,
                type: "external",
            })
        })

        it("should extract named imports", () => {
            const code = `import { useState, useEffect } from "react"`
            const ast = parser.parse(code, "ts")
            expect(ast.imports).toHaveLength(2)
            expect(ast.imports[0].name).toBe("useState")
            expect(ast.imports[1].name).toBe("useEffect")
            expect(ast.imports[0].isDefault).toBe(false)
        })

        it("should extract namespace import", () => {
            const code = `import * as path from "path"`
            const ast = parser.parse(code, "ts")
            expect(ast.imports).toHaveLength(1)
            expect(ast.imports[0].name).toBe("path")
            expect(ast.imports[0].isDefault).toBe(false)
        })

        it("should classify internal imports", () => {
            const code = `import { foo } from "./utils"`
            const ast = parser.parse(code, "ts")
            expect(ast.imports[0].type).toBe("internal")
        })

        it("should classify builtin imports", () => {
            const code = `import * as fs from "node:fs"`
            const ast = parser.parse(code, "ts")
            expect(ast.imports[0].type).toBe("builtin")
        })

        it("should classify external imports", () => {
            const code = `import lodash from "lodash"`
            const ast = parser.parse(code, "ts")
            expect(ast.imports[0].type).toBe("external")
        })
    })

    describe("functions", () => {
        it("should extract function declaration", () => {
            const code = `function add(a: number, b: number): number {
                return a + b
            }`
            const ast = parser.parse(code, "ts")
            expect(ast.functions).toHaveLength(1)
            expect(ast.functions[0]).toMatchObject({
                name: "add",
                isAsync: false,
                isExported: false,
            })
            expect(ast.functions[0].lineStart).toBe(1)
            expect(ast.functions[0].lineEnd).toBe(3)
        })

        it("should extract async function", () => {
            const code = `async function fetchData() { return null }`
            const ast = parser.parse(code, "ts")
            expect(ast.functions[0].isAsync).toBe(true)
        })

        it("should extract exported function", () => {
            const code = `export function main() {}`
            const ast = parser.parse(code, "ts")
            expect(ast.functions[0].isExported).toBe(true)
            expect(ast.exports).toHaveLength(1)
            expect(ast.exports[0].kind).toBe("function")
        })

        it("should extract arrow function", () => {
            const code = `const add = (a: number, b: number) => a + b`
            const ast = parser.parse(code, "ts")
            expect(ast.functions).toHaveLength(1)
            expect(ast.functions[0].name).toBe("add")
        })

        it("should extract function parameters", () => {
            const code = `function test(a: string, b?: number, c = 10) {}`
            const ast = parser.parse(code, "ts")
            expect(ast.functions[0].params).toHaveLength(3)
            expect(ast.functions[0].params[0]).toMatchObject({
                name: "a",
                optional: false,
            })
            expect(ast.functions[0].params[1]).toMatchObject({
                name: "b",
                optional: true,
            })
        })
    })

    describe("classes", () => {
        it("should extract class declaration", () => {
            const code = `class MyClass {
                value: number

                constructor() {}

                getValue() {
                    return this.value
                }
            }`
            const ast = parser.parse(code, "ts")
            expect(ast.classes).toHaveLength(1)
            expect(ast.classes[0]).toMatchObject({
                name: "MyClass",
                isExported: false,
                isAbstract: false,
            })
        })

        it("should extract exported class", () => {
            const code = `export class Service {}`
            const ast = parser.parse(code, "ts")
            expect(ast.classes[0].isExported).toBe(true)
            expect(ast.exports).toHaveLength(1)
            expect(ast.exports[0].kind).toBe("class")
        })

        it("should extract class methods", () => {
            const code = `class Service {
                async fetch() {}
                private process() {}
                static create() {}
            }`
            const ast = parser.parse(code, "ts")
            expect(ast.classes[0].methods.length).toBeGreaterThanOrEqual(1)
        })

        it("should extract class extends", () => {
            const code = `class Child extends Parent {}`
            const ast = parser.parse(code, "ts")
            expect(ast.classes[0].extends).toBe("Parent")
        })
    })

    describe("interfaces", () => {
        it("should extract interface declaration", () => {
            const code = `interface User {
                name: string
                age: number
            }`
            const ast = parser.parse(code, "ts")
            expect(ast.interfaces).toHaveLength(1)
            expect(ast.interfaces[0]).toMatchObject({
                name: "User",
                isExported: false,
            })
        })

        it("should extract exported interface", () => {
            const code = `export interface Config {}`
            const ast = parser.parse(code, "ts")
            expect(ast.interfaces[0].isExported).toBe(true)
        })

        it("should extract interface properties", () => {
            const code = `interface Props {
                value: string
                onChange: (v: string) => void
            }`
            const ast = parser.parse(code, "ts")
            expect(ast.interfaces[0].properties.length).toBeGreaterThanOrEqual(1)
        })
    })

    describe("type aliases", () => {
        it("should extract type alias", () => {
            const code = `type ID = string | number`
            const ast = parser.parse(code, "ts")
            expect(ast.typeAliases).toHaveLength(1)
            expect(ast.typeAliases[0]).toMatchObject({
                name: "ID",
                isExported: false,
            })
        })

        it("should extract exported type alias", () => {
            const code = `export type Status = "pending" | "done"`
            const ast = parser.parse(code, "ts")
            expect(ast.typeAliases[0].isExported).toBe(true)
        })
    })

    describe("exports", () => {
        it("should extract named exports", () => {
            const code = `
                const foo = 1
                const bar = 2
                export { foo, bar }
            `
            const ast = parser.parse(code, "ts")
            expect(ast.exports).toHaveLength(2)
        })

        it("should extract export default", () => {
            const code = `export default function main() {}`
            const ast = parser.parse(code, "ts")
            expect(ast.exports.some((e) => e.isDefault)).toBe(true)
        })

        it("should extract exported const", () => {
            const code = `export const VERSION = "1.0.0"`
            const ast = parser.parse(code, "ts")
            expect(ast.exports).toHaveLength(1)
            expect(ast.exports[0].kind).toBe("variable")
        })
    })

    describe("JavaScript support", () => {
        it("should parse JavaScript file", () => {
            const code = `
                import React from "react"

                function Component() {
                    return null
                }

                export default Component
            `
            const ast = parser.parse(code, "js")
            expect(ast.parseError).toBe(false)
            expect(ast.imports).toHaveLength(1)
            expect(ast.functions).toHaveLength(1)
        })

        it("should parse JSX file", () => {
            const code = `
                import React from "react"

                function App() {
                    return <div>Hello</div>
                }
            `
            const ast = parser.parse(code, "jsx")
            expect(ast.parseError).toBe(false)
        })
    })

    describe("TSX support", () => {
        it("should parse TSX file", () => {
            const code = `
                import React from "react"

                interface Props {
                    name: string
                }

                export function Greeting({ name }: Props) {
                    return <h1>Hello, {name}!</h1>
                }
            `
            const ast = parser.parse(code, "tsx")
            expect(ast.parseError).toBe(false)
            expect(ast.interfaces).toHaveLength(1)
            expect(ast.functions).toHaveLength(1)
        })
    })

    describe("complex file", () => {
        it("should parse complex TypeScript file", () => {
            const code = `
                import * as fs from "node:fs"
                import { join } from "node:path"
                import type { Config } from "./types"

                export interface Options {
                    root: string
                    verbose?: boolean
                }

                export type Result = { success: boolean }

                export class Scanner {
                    private options: Options

                    constructor(options: Options) {
                        this.options = options
                    }

                    async scan(): Promise<string[]> {
                        return []
                    }
                }

                export function createScanner(options: Options): Scanner {
                    return new Scanner(options)
                }

                export const VERSION = "1.0.0"
            `
            const ast = parser.parse(code, "ts")

            expect(ast.parseError).toBe(false)
            expect(ast.imports.length).toBeGreaterThanOrEqual(2)
            expect(ast.interfaces).toHaveLength(1)
            expect(ast.typeAliases).toHaveLength(1)
            expect(ast.classes).toHaveLength(1)
            expect(ast.functions.length).toBeGreaterThanOrEqual(1)
            expect(ast.exports.length).toBeGreaterThanOrEqual(4)
        })
    })
})
