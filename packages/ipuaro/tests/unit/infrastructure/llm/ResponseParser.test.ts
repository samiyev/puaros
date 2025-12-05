import { describe, it, expect } from "vitest"
import {
    parseToolCalls,
    formatToolCallsAsXml,
    extractThinking,
    hasToolCalls,
    validateToolCallParams,
} from "../../../../src/infrastructure/llm/ResponseParser.js"
import { createToolCall } from "../../../../src/domain/value-objects/ToolCall.js"

describe("ResponseParser", () => {
    describe("parseToolCalls", () => {
        it("should parse a single tool call", () => {
            const response = `<tool_call name="get_lines">
                <path>src/index.ts</path>
                <start>1</start>
                <end>10</end>
            </tool_call>`

            const result = parseToolCalls(response)

            expect(result.toolCalls).toHaveLength(1)
            expect(result.toolCalls[0].name).toBe("get_lines")
            expect(result.toolCalls[0].params).toEqual({
                path: "src/index.ts",
                start: 1,
                end: 10,
            })
            expect(result.hasParseErrors).toBe(false)
        })

        it("should parse multiple tool calls", () => {
            const response = `
                <tool_call name="get_lines">
                    <path>src/a.ts</path>
                </tool_call>
                <tool_call name="get_function">
                    <path>src/b.ts</path>
                    <name>myFunc</name>
                </tool_call>
            `

            const result = parseToolCalls(response)

            expect(result.toolCalls).toHaveLength(2)
            expect(result.toolCalls[0].name).toBe("get_lines")
            expect(result.toolCalls[1].name).toBe("get_function")
        })

        it("should extract text content without tool calls", () => {
            const response = `Let me check the file.
                <tool_call name="get_lines">
                    <path>src/index.ts</path>
                </tool_call>
                Here's what I found.`

            const result = parseToolCalls(response)

            expect(result.content).toContain("Let me check the file.")
            expect(result.content).toContain("Here's what I found.")
            expect(result.content).not.toContain("tool_call")
        })

        it("should parse boolean values", () => {
            const response = `<tool_call name="git_diff">
                <staged>true</staged>
            </tool_call>`

            const result = parseToolCalls(response)

            expect(result.toolCalls[0].params.staged).toBe(true)
        })

        it("should parse null values", () => {
            const response = `<tool_call name="get_lines">
                <value>null</value>
            </tool_call>`

            const result = parseToolCalls(response)

            expect(result.toolCalls[0].params.value).toBe(null)
        })

        it("should parse JSON arrays", () => {
            const response = `<tool_call name="git_commit">
                <files>["a.ts", "b.ts"]</files>
            </tool_call>`

            const result = parseToolCalls(response)

            expect(result.toolCalls[0].params.files).toEqual(["a.ts", "b.ts"])
        })

        it("should parse JSON objects", () => {
            const response = `<tool_call name="get_lines">
                <config>{"key": "value"}</config>
            </tool_call>`

            const result = parseToolCalls(response)

            expect(result.toolCalls[0].params.config).toEqual({ key: "value" })
        })

        it("should return empty array for response without tool calls", () => {
            const response = "This is just a regular response."

            const result = parseToolCalls(response)

            expect(result.toolCalls).toHaveLength(0)
            expect(result.content).toBe(response)
        })

        it("should handle named param syntax", () => {
            const response = `<tool_call name="get_lines">
                <param name="path">src/index.ts</param>
                <param name="start">5</param>
            </tool_call>`

            const result = parseToolCalls(response)

            expect(result.toolCalls[0].params).toEqual({
                path: "src/index.ts",
                start: 5,
            })
        })

        it("should reject unknown tool names", () => {
            const response = `<tool_call name="unknown_tool"><path>test.ts</path></tool_call>`

            const result = parseToolCalls(response)

            expect(result.toolCalls).toHaveLength(0)
            expect(result.hasParseErrors).toBe(true)
            expect(result.parseErrors[0]).toContain("Unknown tool")
            expect(result.parseErrors[0]).toContain("unknown_tool")
        })

        it("should normalize tool name aliases", () => {
            // get_functions -> get_lines (common LLM typo)
            const response1 = `<tool_call name="get_functions"><path>src/index.ts</path></tool_call>`
            const result1 = parseToolCalls(response1)
            expect(result1.toolCalls).toHaveLength(1)
            expect(result1.toolCalls[0].name).toBe("get_lines")
            expect(result1.hasParseErrors).toBe(false)

            // read_file -> get_lines
            const response2 = `<tool_call name="read_file"><path>test.ts</path></tool_call>`
            const result2 = parseToolCalls(response2)
            expect(result2.toolCalls).toHaveLength(1)
            expect(result2.toolCalls[0].name).toBe("get_lines")

            // find_todos -> get_todos
            const response3 = `<tool_call name="find_todos"></tool_call>`
            const result3 = parseToolCalls(response3)
            expect(result3.toolCalls).toHaveLength(1)
            expect(result3.toolCalls[0].name).toBe("get_todos")

            // list_files -> get_structure
            const response4 = `<tool_call name="list_files"><path>.</path></tool_call>`
            const result4 = parseToolCalls(response4)
            expect(result4.toolCalls).toHaveLength(1)
            expect(result4.toolCalls[0].name).toBe("get_structure")
        })

        // JSON format tests
        it("should parse JSON format tool calls as fallback", () => {
            const response = `{"name": "get_lines", "arguments": {"path": "src/index.ts"}}`
            const result = parseToolCalls(response)

            expect(result.toolCalls).toHaveLength(1)
            expect(result.toolCalls[0].name).toBe("get_lines")
            expect(result.toolCalls[0].params).toEqual({ path: "src/index.ts" })
            expect(result.hasParseErrors).toBe(false)
        })

        it("should parse JSON format with numeric arguments", () => {
            const response = `{"name": "get_lines", "arguments": {"path": "src/index.ts", "start": 1, "end": 50}}`
            const result = parseToolCalls(response)

            expect(result.toolCalls).toHaveLength(1)
            expect(result.toolCalls[0].params).toEqual({
                path: "src/index.ts",
                start: 1,
                end: 50,
            })
        })

        it("should parse JSON format with surrounding text", () => {
            const response = `I'll read the file for you:
{"name": "get_lines", "arguments": {"path": "src/index.ts"}}
Let me know if you need more.`

            const result = parseToolCalls(response)

            expect(result.toolCalls).toHaveLength(1)
            expect(result.toolCalls[0].name).toBe("get_lines")
            expect(result.content).toContain("I'll read the file for you:")
            expect(result.content).toContain("Let me know if you need more.")
        })

        it("should normalize tool name aliases in JSON format", () => {
            // read_file -> get_lines
            const response = `{"name": "read_file", "arguments": {"path": "test.ts"}}`
            const result = parseToolCalls(response)

            expect(result.toolCalls).toHaveLength(1)
            expect(result.toolCalls[0].name).toBe("get_lines")
        })

        it("should reject unknown tool names in JSON format", () => {
            const response = `{"name": "unknown_tool", "arguments": {"path": "test.ts"}}`
            const result = parseToolCalls(response)

            expect(result.toolCalls).toHaveLength(0)
            expect(result.hasParseErrors).toBe(true)
            expect(result.parseErrors[0]).toContain("unknown_tool")
        })

        it("should prefer XML over JSON when both present", () => {
            const response = `<tool_call name="get_lines"><path>xml.ts</path></tool_call>
{"name": "get_function", "arguments": {"path": "json.ts", "name": "foo"}}`

            const result = parseToolCalls(response)

            // Should only parse XML since it was found first
            expect(result.toolCalls).toHaveLength(1)
            expect(result.toolCalls[0].name).toBe("get_lines")
            expect(result.toolCalls[0].params.path).toBe("xml.ts")
        })

        it("should parse JSON with empty arguments", () => {
            const response = `{"name": "git_status", "arguments": {}}`
            const result = parseToolCalls(response)

            expect(result.toolCalls).toHaveLength(1)
            expect(result.toolCalls[0].name).toBe("git_status")
            expect(result.toolCalls[0].params).toEqual({})
        })

        it("should support CDATA for multiline content", () => {
            const response = `<tool_call name="edit_lines">
                <path>src/index.ts</path>
                <content><![CDATA[const x = 1;
const y = 2;]]></content>
            </tool_call>`

            const result = parseToolCalls(response)

            expect(result.toolCalls[0].params.content).toBe("const x = 1;\nconst y = 2;")
        })

        it("should handle multiple tool calls with mixed content", () => {
            const response = `Some text
<tool_call name="get_lines"><path>a.ts</path></tool_call>
More text
<tool_call name="get_function"><path>b.ts</path><name>foo</name></tool_call>`

            const result = parseToolCalls(response)

            expect(result.toolCalls).toHaveLength(2)
            expect(result.toolCalls[0].name).toBe("get_lines")
            expect(result.toolCalls[1].name).toBe("get_function")
            expect(result.content).toContain("Some text")
            expect(result.content).toContain("More text")
        })

        it("should handle parse errors gracefully and continue", () => {
            const response = `<tool_call name="unknown_tool1"><path>test.ts</path></tool_call>
<tool_call name="get_lines"><path>valid.ts</path></tool_call>
<tool_call name="unknown_tool2"><path>test2.ts</path></tool_call>`

            const result = parseToolCalls(response)

            expect(result.toolCalls).toHaveLength(1)
            expect(result.toolCalls[0].name).toBe("get_lines")
            expect(result.hasParseErrors).toBe(true)
            expect(result.parseErrors).toHaveLength(2)
            expect(result.parseErrors[0]).toContain("unknown_tool1")
            expect(result.parseErrors[1]).toContain("unknown_tool2")
        })
    })

    describe("formatToolCallsAsXml", () => {
        it("should format tool calls as XML", () => {
            const toolCalls = [createToolCall("1", "get_lines", { path: "src/index.ts", start: 1 })]

            const xml = formatToolCallsAsXml(toolCalls)

            expect(xml).toContain('<tool_call name="get_lines">')
            expect(xml).toContain("<path>src/index.ts</path>")
            expect(xml).toContain("<start>1</start>")
            expect(xml).toContain("</tool_call>")
        })

        it("should format multiple tool calls", () => {
            const toolCalls = [
                createToolCall("1", "get_lines", { path: "a.ts" }),
                createToolCall("2", "get_function", { path: "b.ts", name: "foo" }),
            ]

            const xml = formatToolCallsAsXml(toolCalls)

            expect(xml).toContain('<tool_call name="get_lines">')
            expect(xml).toContain('<tool_call name="get_function">')
        })

        it("should handle object values as JSON", () => {
            const toolCalls = [createToolCall("1", "test", { data: { key: "value" } })]

            const xml = formatToolCallsAsXml(toolCalls)

            expect(xml).toContain('{"key":"value"}')
        })
    })

    describe("extractThinking", () => {
        it("should extract thinking content", () => {
            const response = `<thinking>Let me analyze this.</thinking>
                Here is the answer.`

            const result = extractThinking(response)

            expect(result.thinking).toBe("Let me analyze this.")
            expect(result.content).toContain("Here is the answer.")
            expect(result.content).not.toContain("thinking")
        })

        it("should handle multiple thinking blocks", () => {
            const response = `<thinking>First thought.</thinking>
                Some content.
                <thinking>Second thought.</thinking>
                More content.`

            const result = extractThinking(response)

            expect(result.thinking).toContain("First thought.")
            expect(result.thinking).toContain("Second thought.")
        })

        it("should return original content if no thinking", () => {
            const response = "Just a regular response."

            const result = extractThinking(response)

            expect(result.thinking).toBe("")
            expect(result.content).toBe(response)
        })
    })

    describe("hasToolCalls", () => {
        it("should return true if response has tool calls", () => {
            const response = `<tool_call name="get_lines"><path>a.ts</path></tool_call>`

            expect(hasToolCalls(response)).toBe(true)
        })

        it("should return false if response has no tool calls", () => {
            const response = "Just text without tool calls."

            expect(hasToolCalls(response)).toBe(false)
        })
    })

    describe("validateToolCallParams", () => {
        it("should return valid for complete params", () => {
            const params = { path: "src/index.ts", start: 1, end: 10 }
            const required = ["path", "start", "end"]

            const result = validateToolCallParams("get_lines", params, required)

            expect(result.valid).toBe(true)
            expect(result.errors).toHaveLength(0)
        })

        it("should return errors for missing required params", () => {
            const params = { path: "src/index.ts" }
            const required = ["path", "start", "end"]

            const result = validateToolCallParams("get_lines", params, required)

            expect(result.valid).toBe(false)
            expect(result.errors).toHaveLength(2)
            expect(result.errors).toContain("Missing required parameter: start")
            expect(result.errors).toContain("Missing required parameter: end")
        })

        it("should treat null and undefined as missing", () => {
            const params = { path: null, start: undefined }
            const required = ["path", "start"]

            const result = validateToolCallParams("test", params, required)

            expect(result.valid).toBe(false)
            expect(result.errors).toHaveLength(2)
        })

        it("should accept empty required array", () => {
            const params = {}
            const required: string[] = []

            const result = validateToolCallParams("git_status", params, required)

            expect(result.valid).toBe(true)
        })
    })
})
