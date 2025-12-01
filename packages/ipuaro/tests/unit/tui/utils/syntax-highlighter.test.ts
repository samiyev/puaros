/**
 * Tests for syntax-highlighter utility.
 */

import { describe, expect, it } from "vitest"
import { detectLanguage, highlightLine } from "../../../../src/tui/utils/syntax-highlighter.js"

describe("syntax-highlighter", () => {
    describe("detectLanguage", () => {
        it("should detect typescript from .ts extension", () => {
            expect(detectLanguage("src/index.ts")).toBe("typescript")
        })

        it("should detect tsx from .tsx extension", () => {
            expect(detectLanguage("src/Component.tsx")).toBe("tsx")
        })

        it("should detect javascript from .js extension", () => {
            expect(detectLanguage("dist/bundle.js")).toBe("javascript")
        })

        it("should detect jsx from .jsx extension", () => {
            expect(detectLanguage("src/App.jsx")).toBe("jsx")
        })

        it("should detect json from .json extension", () => {
            expect(detectLanguage("package.json")).toBe("json")
        })

        it("should detect yaml from .yaml extension", () => {
            expect(detectLanguage("config.yaml")).toBe("yaml")
        })

        it("should detect yaml from .yml extension", () => {
            expect(detectLanguage("config.yml")).toBe("yaml")
        })

        it("should return unknown for unsupported extensions", () => {
            expect(detectLanguage("image.png")).toBe("unknown")
            expect(detectLanguage("file")).toBe("unknown")
        })

        it("should handle case insensitive extensions", () => {
            expect(detectLanguage("FILE.TS")).toBe("typescript")
            expect(detectLanguage("FILE.JSX")).toBe("jsx")
        })
    })

    describe("highlightLine", () => {
        describe("unknown language", () => {
            it("should return plain text for unknown language", () => {
                const tokens = highlightLine("hello world", "unknown")
                expect(tokens).toEqual([{ text: "hello world", color: "white" }])
            })
        })

        describe("json language", () => {
            it("should return plain text for json", () => {
                const tokens = highlightLine('{"key": "value"}', "json")
                expect(tokens).toEqual([{ text: '{"key": "value"}', color: "white" }])
            })
        })

        describe("yaml language", () => {
            it("should return plain text for yaml", () => {
                const tokens = highlightLine("key: value", "yaml")
                expect(tokens).toEqual([{ text: "key: value", color: "white" }])
            })
        })

        describe("typescript/javascript highlighting", () => {
            it("should highlight keywords", () => {
                const tokens = highlightLine("const x = 10", "typescript")
                expect(tokens[0]).toEqual({ text: "const", color: "magenta" })
                expect(tokens.find((t) => t.text === "x")).toEqual({ text: "x", color: "white" })
            })

            it("should highlight strings with double quotes", () => {
                const tokens = highlightLine('const s = "hello"', "typescript")
                expect(tokens.find((t) => t.text === '"hello"')).toEqual({
                    text: '"hello"',
                    color: "green",
                })
            })

            it("should highlight strings with single quotes", () => {
                const tokens = highlightLine("const s = 'hello'", "typescript")
                expect(tokens.find((t) => t.text === "'hello'")).toEqual({
                    text: "'hello'",
                    color: "green",
                })
            })

            it("should highlight template literals", () => {
                const tokens = highlightLine("const s = `hello`", "typescript")
                expect(tokens.find((t) => t.text === "`hello`")).toEqual({
                    text: "`hello`",
                    color: "green",
                })
            })

            it("should highlight numbers", () => {
                const tokens = highlightLine("const n = 42", "typescript")
                expect(tokens.find((t) => t.text === "42")).toEqual({ text: "42", color: "cyan" })
            })

            it("should highlight single-line comments", () => {
                const tokens = highlightLine("// this is a comment", "typescript")
                expect(tokens[0]).toEqual({ text: "// this is a comment", color: "gray" })
            })

            it("should highlight multi-line comments", () => {
                const tokens = highlightLine("/* comment */", "typescript")
                expect(tokens[0]).toEqual({ text: "/* comment */", color: "gray" })
            })

            it("should highlight operators", () => {
                const tokens = highlightLine("x + y = z", "typescript")
                expect(tokens.find((t) => t.text === "+")).toEqual({ text: "+", color: "yellow" })
                expect(tokens.find((t) => t.text === "=")).toEqual({ text: "=", color: "yellow" })
            })

            it("should highlight parentheses and brackets", () => {
                const tokens = highlightLine("foo(bar[0])", "typescript")
                expect(tokens.find((t) => t.text === "(")).toEqual({ text: "(", color: "yellow" })
                expect(tokens.find((t) => t.text === "[")).toEqual({ text: "[", color: "yellow" })
                expect(tokens.find((t) => t.text === "]")).toEqual({ text: "]", color: "yellow" })
                expect(tokens.find((t) => t.text === ")")).toEqual({ text: ")", color: "yellow" })
            })

            it("should handle mixed content", () => {
                const tokens = highlightLine('const x = "test" + 42', "typescript")
                expect(tokens.find((t) => t.text === "const")).toEqual({
                    text: "const",
                    color: "magenta",
                })
                expect(tokens.find((t) => t.text === '"test"')).toEqual({
                    text: '"test"',
                    color: "green",
                })
                expect(tokens.find((t) => t.text === "42")).toEqual({ text: "42", color: "cyan" })
            })

            it("should preserve whitespace", () => {
                const tokens = highlightLine("  const  x  =  10  ", "typescript")
                expect(tokens[0]).toEqual({ text: "  ", color: "white" })
            })

            it("should handle empty lines", () => {
                const tokens = highlightLine("", "typescript")
                expect(tokens).toEqual([])
            })
        })
    })
})
