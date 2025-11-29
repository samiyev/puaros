import { describe, it, expect, beforeEach } from "vitest"
import {
    ResponseParser,
    parseResponse,
    parseToolCalls,
    defaultParser,
} from "../../../../src/infrastructure/llm/ResponseParser.js"

describe("ResponseParser", () => {
    let parser: ResponseParser

    beforeEach(() => {
        parser = new ResponseParser()
    })

    describe("parse", () => {
        it("should parse plain text without tool calls", () => {
            const result = parser.parse("Hello, this is a response.")

            expect(result.text).toBe("Hello, this is a response.")
            expect(result.toolCalls).toHaveLength(0)
            expect(result.hasIncompleteToolCall).toBe(false)
        })

        it("should parse single tool call", () => {
            const response = `I'll read the file.
<tool_call name="get_lines">
<param name="path">src/index.ts</param>
</tool_call>`

            const result = parser.parse(response)

            expect(result.toolCalls).toHaveLength(1)
            expect(result.toolCalls[0].name).toBe("get_lines")
            expect(result.toolCalls[0].params).toEqual({ path: "src/index.ts" })
            expect(result.text).toBe("I'll read the file.")
        })

        it("should parse multiple tool calls", () => {
            const response = `Let me check both files.
<tool_call name="get_lines">
<param name="path">a.ts</param>
</tool_call>
And also:
<tool_call name="get_lines">
<param name="path">b.ts</param>
</tool_call>`

            const result = parser.parse(response)

            expect(result.toolCalls).toHaveLength(2)
            expect(result.toolCalls[0].params.path).toBe("a.ts")
            expect(result.toolCalls[1].params.path).toBe("b.ts")
        })

        it("should parse tool call with multiple params", () => {
            const response = `<tool_call name="get_lines">
<param name="path">file.ts</param>
<param name="start">10</param>
<param name="end">20</param>
</tool_call>`

            const result = parser.parse(response)

            expect(result.toolCalls[0].params).toEqual({
                path: "file.ts",
                start: 10,
                end: 20,
            })
        })

        it("should detect incomplete tool call", () => {
            const response = `Starting to call:
<tool_call name="get_lines">
<param name="path">file.ts</param>`

            const result = parser.parse(response)

            expect(result.hasIncompleteToolCall).toBe(true)
            expect(result.toolCalls).toHaveLength(0)
        })

        it("should handle mixed complete and incomplete", () => {
            const response = `<tool_call name="get_lines">
<param name="path">a.ts</param>
</tool_call>
Now another:
<tool_call name="get_class">
<param name="path">b.ts</param>`

            const result = parser.parse(response)

            expect(result.hasIncompleteToolCall).toBe(true)
            expect(result.toolCalls).toHaveLength(1)
        })

        it("should handle single quotes in tool call", () => {
            const response = `<tool_call name='get_lines'>
<param name='path'>file.ts</param>
</tool_call>`

            const result = parser.parse(response)

            expect(result.toolCalls).toHaveLength(1)
            expect(result.toolCalls[0].name).toBe("get_lines")
        })

        it("should preserve text between tool calls", () => {
            const response = `First:
<tool_call name="get_lines">
<param name="path">a.ts</param>
</tool_call>
Middle text here.
<tool_call name="get_lines">
<param name="path">b.ts</param>
</tool_call>
End text.`

            const result = parser.parse(response)

            expect(result.text).toContain("First:")
            expect(result.text).toContain("Middle text here.")
            expect(result.text).toContain("End text.")
        })

        it("should clean up excessive newlines", () => {
            const response = `Start



End`

            const result = parser.parse(response)

            expect(result.text).toBe("Start\n\nEnd")
        })

        it("should generate unique IDs for each call", () => {
            const response = `<tool_call name="a"><param name="x">1</param></tool_call>
<tool_call name="b"><param name="x">2</param></tool_call>`

            const result = parser.parse(response)

            expect(result.toolCalls[0].id).not.toBe(result.toolCalls[1].id)
            expect(result.toolCalls[0].id).toMatch(/^call_\d+_\d+$/)
        })
    })

    describe("parseValue", () => {
        it("should parse boolean true", () => {
            const response = `<tool_call name="test">
<param name="flag">true</param>
</tool_call>`

            const result = parser.parse(response)
            expect(result.toolCalls[0].params.flag).toBe(true)
        })

        it("should parse boolean false", () => {
            const response = `<tool_call name="test">
<param name="flag">false</param>
</tool_call>`

            const result = parser.parse(response)
            expect(result.toolCalls[0].params.flag).toBe(false)
        })

        it("should parse null", () => {
            const response = `<tool_call name="test">
<param name="value">null</param>
</tool_call>`

            const result = parser.parse(response)
            expect(result.toolCalls[0].params.value).toBeNull()
        })

        it("should parse undefined", () => {
            const response = `<tool_call name="test">
<param name="value">undefined</param>
</tool_call>`

            const result = parser.parse(response)
            expect(result.toolCalls[0].params.value).toBeUndefined()
        })

        it("should parse integer", () => {
            const response = `<tool_call name="test">
<param name="count">42</param>
</tool_call>`

            const result = parser.parse(response)
            expect(result.toolCalls[0].params.count).toBe(42)
        })

        it("should parse negative integer", () => {
            const response = `<tool_call name="test">
<param name="offset">-5</param>
</tool_call>`

            const result = parser.parse(response)
            expect(result.toolCalls[0].params.offset).toBe(-5)
        })

        it("should parse float", () => {
            const response = `<tool_call name="test">
<param name="ratio">3.14</param>
</tool_call>`

            const result = parser.parse(response)
            expect(result.toolCalls[0].params.ratio).toBe(3.14)
        })

        it("should parse negative float", () => {
            const response = `<tool_call name="test">
<param name="temp">-2.5</param>
</tool_call>`

            const result = parser.parse(response)
            expect(result.toolCalls[0].params.temp).toBe(-2.5)
        })

        it("should parse JSON array", () => {
            const response = `<tool_call name="test">
<param name="items">["a", "b", "c"]</param>
</tool_call>`

            const result = parser.parse(response)
            expect(result.toolCalls[0].params.items).toEqual(["a", "b", "c"])
        })

        it("should parse JSON object", () => {
            const response = `<tool_call name="test">
<param name="config">{"key": "value"}</param>
</tool_call>`

            const result = parser.parse(response)
            expect(result.toolCalls[0].params.config).toEqual({ key: "value" })
        })

        it("should keep invalid JSON as string", () => {
            const response = `<tool_call name="test">
<param name="text">[not valid json</param>
</tool_call>`

            const result = parser.parse(response)
            expect(result.toolCalls[0].params.text).toBe("[not valid json")
        })

        it("should keep regular string as string", () => {
            const response = `<tool_call name="test">
<param name="message">Hello World</param>
</tool_call>`

            const result = parser.parse(response)
            expect(result.toolCalls[0].params.message).toBe("Hello World")
        })
    })

    describe("resetCounter", () => {
        it("should reset call counter", () => {
            parser.parse(`<tool_call name="a"><param name="x">1</param></tool_call>`)
            parser.resetCounter()
            const result = parser.parse(`<tool_call name="b"><param name="x">2</param></tool_call>`)

            expect(result.toolCalls[0].id).toMatch(/_1$/)
        })
    })

    describe("hasToolCalls", () => {
        it("should return true when tool calls exist", () => {
            const response = `<tool_call name="test"><param name="x">1</param></tool_call>`
            expect(parser.hasToolCalls(response)).toBe(true)
        })

        it("should return false when no tool calls", () => {
            expect(parser.hasToolCalls("Just plain text")).toBe(false)
        })

        it("should return false for incomplete tool call", () => {
            const response = `<tool_call name="test"><param name="x">1</param>`
            expect(parser.hasToolCalls(response)).toBe(false)
        })
    })

    describe("countToolCalls", () => {
        it("should count zero tool calls", () => {
            expect(parser.countToolCalls("No tools here")).toBe(0)
        })

        it("should count single tool call", () => {
            const response = `<tool_call name="a"><param name="x">1</param></tool_call>`
            expect(parser.countToolCalls(response)).toBe(1)
        })

        it("should count multiple tool calls", () => {
            const response = `<tool_call name="a"><param name="x">1</param></tool_call>
<tool_call name="b"><param name="y">2</param></tool_call>
<tool_call name="c"><param name="z">3</param></tool_call>`
            expect(parser.countToolCalls(response)).toBe(3)
        })
    })

    describe("extractToolNames", () => {
        it("should return empty array for no tools", () => {
            expect(parser.extractToolNames("No tools")).toEqual([])
        })

        it("should extract single tool name", () => {
            const response = `<tool_call name="get_lines"><param name="x">1</param></tool_call>`
            expect(parser.extractToolNames(response)).toEqual(["get_lines"])
        })

        it("should extract multiple tool names", () => {
            const response = `<tool_call name="get_lines"><param name="x">1</param></tool_call>
<tool_call name="edit_lines"><param name="y">2</param></tool_call>`
            expect(parser.extractToolNames(response)).toEqual(["get_lines", "edit_lines"])
        })

        it("should extract names from incomplete calls", () => {
            const response = `<tool_call name="get_function"><param name="x">`
            expect(parser.extractToolNames(response)).toEqual(["get_function"])
        })
    })

    describe("defaultParser", () => {
        it("should be an instance of ResponseParser", () => {
            expect(defaultParser).toBeInstanceOf(ResponseParser)
        })
    })

    describe("parseResponse", () => {
        it("should use default parser", () => {
            const result = parseResponse("Hello <tool_call name=\"test\"><param name=\"x\">1</param></tool_call>")

            expect(result.toolCalls).toHaveLength(1)
            expect(result.text).toBe("Hello")
        })
    })

    describe("parseToolCalls", () => {
        it("should return only tool calls", () => {
            const response = `Text <tool_call name="a"><param name="x">1</param></tool_call>`
            const calls = parseToolCalls(response)

            expect(calls).toHaveLength(1)
            expect(calls[0].name).toBe("a")
        })
    })

    describe("edge cases", () => {
        it("should handle empty response", () => {
            const result = parser.parse("")

            expect(result.text).toBe("")
            expect(result.toolCalls).toHaveLength(0)
        })

        it("should handle multiline param values", () => {
            const response = `<tool_call name="create_file">
<param name="path">file.ts</param>
<param name="content">line 1
line 2
line 3</param>
</tool_call>`

            const result = parser.parse(response)

            expect(result.toolCalls[0].params.content).toBe("line 1\nline 2\nline 3")
        })

        it("should handle nested XML-like content in params", () => {
            const response = `<tool_call name="create_file">
<param name="content"><div>HTML content</div></param>
</tool_call>`

            const result = parser.parse(response)

            expect(result.toolCalls[0].params.content).toBe("<div>HTML content</div>")
        })

        it("should handle whitespace around param values", () => {
            const response = `<tool_call name="test">
<param name="value">  spaced  </param>
</tool_call>`

            const result = parser.parse(response)

            expect(result.toolCalls[0].params.value).toBe("spaced")
        })
    })
})
