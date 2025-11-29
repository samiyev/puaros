import { describe, it, expect } from "vitest"
import { createEmptyFileAST } from "../../../../src/domain/value-objects/FileAST.js"

describe("FileAST", () => {
    describe("createEmptyFileAST", () => {
        it("should create empty AST with all arrays empty", () => {
            const ast = createEmptyFileAST()

            expect(ast.imports).toEqual([])
            expect(ast.exports).toEqual([])
            expect(ast.functions).toEqual([])
            expect(ast.classes).toEqual([])
            expect(ast.interfaces).toEqual([])
            expect(ast.typeAliases).toEqual([])
            expect(ast.parseError).toBe(false)
            expect(ast.parseErrorMessage).toBeUndefined()
        })
    })
})
