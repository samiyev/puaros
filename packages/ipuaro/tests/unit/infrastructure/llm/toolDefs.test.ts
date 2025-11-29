import { describe, it, expect } from "vitest"
import {
    TOOL_DEFINITIONS,
    getToolDef,
    getToolsByCategory,
    getToolNames,
    buildToolXmlSchema,
    buildAllToolsXmlSchema,
    type ToolDef,
} from "../../../../src/infrastructure/llm/toolDefs.js"

describe("toolDefs", () => {
    describe("TOOL_DEFINITIONS", () => {
        it("should have exactly 18 tools", () => {
            expect(TOOL_DEFINITIONS).toHaveLength(18)
        })

        it("should have unique tool names", () => {
            const names = TOOL_DEFINITIONS.map((t) => t.name)
            const uniqueNames = new Set(names)
            expect(uniqueNames.size).toBe(names.length)
        })

        it("should have all required fields for each tool", () => {
            for (const tool of TOOL_DEFINITIONS) {
                expect(tool.name).toBeDefined()
                expect(tool.description).toBeDefined()
                expect(tool.category).toBeDefined()
                expect(typeof tool.requiresConfirmation).toBe("boolean")
                expect(tool.parameters).toBeDefined()
                expect(tool.parameters.type).toBe("object")
                expect(tool.parameters.properties).toBeDefined()
                expect(Array.isArray(tool.parameters.required)).toBe(true)
            }
        })

        describe("read tools", () => {
            const readTools = ["get_lines", "get_function", "get_class", "get_structure"]

            it.each(readTools)("%s should be defined", (name) => {
                const tool = getToolDef(name)
                expect(tool).toBeDefined()
                expect(tool?.category).toBe("read")
                expect(tool?.requiresConfirmation).toBe(false)
            })

            it("get_lines should have optional start/end params", () => {
                const tool = getToolDef("get_lines")
                expect(tool?.parameters.required).toContain("path")
                expect(tool?.parameters.required).not.toContain("start")
                expect(tool?.parameters.required).not.toContain("end")
            })

            it("get_function should require path and name", () => {
                const tool = getToolDef("get_function")
                expect(tool?.parameters.required).toContain("path")
                expect(tool?.parameters.required).toContain("name")
            })
        })

        describe("search tools", () => {
            const searchTools = ["find_references", "find_definition"]

            it.each(searchTools)("%s should be defined", (name) => {
                const tool = getToolDef(name)
                expect(tool).toBeDefined()
                expect(tool?.category).toBe("search")
                expect(tool?.requiresConfirmation).toBe(false)
            })

            it("find_references should require symbol", () => {
                const tool = getToolDef("find_references")
                expect(tool?.parameters.required).toContain("symbol")
            })
        })

        describe("analysis tools", () => {
            const analysisTools = [
                "get_dependencies",
                "get_dependents",
                "get_complexity",
                "get_todos",
            ]

            it.each(analysisTools)("%s should be defined", (name) => {
                const tool = getToolDef(name)
                expect(tool).toBeDefined()
                expect(tool?.category).toBe("analysis")
                expect(tool?.requiresConfirmation).toBe(false)
            })

            it("get_todos should have optional parameters", () => {
                const tool = getToolDef("get_todos")
                expect(tool?.parameters.required).toEqual([])
            })

            it("get_todos should accept array of types", () => {
                const tool = getToolDef("get_todos")
                expect(tool?.parameters.properties.types.type).toBe("array")
            })
        })

        describe("edit tools", () => {
            const editTools = ["edit_lines", "create_file", "delete_file"]

            it.each(editTools)("%s should require confirmation", (name) => {
                const tool = getToolDef(name)
                expect(tool).toBeDefined()
                expect(tool?.category).toBe("edit")
                expect(tool?.requiresConfirmation).toBe(true)
            })

            it("edit_lines should require all params", () => {
                const tool = getToolDef("edit_lines")
                expect(tool?.parameters.required).toContain("path")
                expect(tool?.parameters.required).toContain("start")
                expect(tool?.parameters.required).toContain("end")
                expect(tool?.parameters.required).toContain("content")
            })
        })

        describe("git tools", () => {
            it("git_status should not require params", () => {
                const tool = getToolDef("git_status")
                expect(tool).toBeDefined()
                expect(tool?.category).toBe("git")
                expect(tool?.parameters.required).toEqual([])
            })

            it("git_diff should have optional params", () => {
                const tool = getToolDef("git_diff")
                expect(tool?.parameters.required).toEqual([])
                expect(tool?.parameters.properties.staged.type).toBe("boolean")
            })

            it("git_commit should require message and confirmation", () => {
                const tool = getToolDef("git_commit")
                expect(tool?.parameters.required).toContain("message")
                expect(tool?.requiresConfirmation).toBe(true)
            })
        })

        describe("run tools", () => {
            it("run_command should require confirmation", () => {
                const tool = getToolDef("run_command")
                expect(tool).toBeDefined()
                expect(tool?.category).toBe("run")
                expect(tool?.requiresConfirmation).toBe(true)
            })

            it("run_tests should not require confirmation", () => {
                const tool = getToolDef("run_tests")
                expect(tool?.requiresConfirmation).toBe(false)
            })

            it("run_command should have timeout param", () => {
                const tool = getToolDef("run_command")
                expect(tool?.parameters.properties.timeout.type).toBe("number")
            })
        })
    })

    describe("getToolDef", () => {
        it("should return tool by name", () => {
            const tool = getToolDef("get_lines")
            expect(tool).toBeDefined()
            expect(tool?.name).toBe("get_lines")
        })

        it("should return undefined for unknown tool", () => {
            const tool = getToolDef("unknown_tool")
            expect(tool).toBeUndefined()
        })
    })

    describe("getToolsByCategory", () => {
        it("should return read tools", () => {
            const tools = getToolsByCategory("read")
            expect(tools.length).toBe(4)
            expect(tools.every((t) => t.category === "read")).toBe(true)
        })

        it("should return edit tools", () => {
            const tools = getToolsByCategory("edit")
            expect(tools.length).toBe(3)
            expect(tools.every((t) => t.category === "edit")).toBe(true)
        })

        it("should return search tools", () => {
            const tools = getToolsByCategory("search")
            expect(tools.length).toBe(2)
        })

        it("should return analysis tools", () => {
            const tools = getToolsByCategory("analysis")
            expect(tools.length).toBe(4)
        })

        it("should return git tools", () => {
            const tools = getToolsByCategory("git")
            expect(tools.length).toBe(3)
        })

        it("should return run tools", () => {
            const tools = getToolsByCategory("run")
            expect(tools.length).toBe(2)
        })
    })

    describe("getToolNames", () => {
        it("should return all tool names", () => {
            const names = getToolNames()
            expect(names).toHaveLength(18)
            expect(names).toContain("get_lines")
            expect(names).toContain("edit_lines")
            expect(names).toContain("run_tests")
        })
    })

    describe("buildToolXmlSchema", () => {
        it("should build XML schema for tool", () => {
            const tool = getToolDef("get_lines") as ToolDef
            const schema = buildToolXmlSchema(tool)

            expect(schema).toContain("### get_lines")
            expect(schema).toContain(tool.description)
            expect(schema).toContain('<tool_call name="get_lines">')
            expect(schema).toContain("</tool_call>")
        })

        it("should mark required params without ?", () => {
            const tool = getToolDef("get_function") as ToolDef
            const schema = buildToolXmlSchema(tool)

            expect(schema).toContain('<param name="path">')
            expect(schema).toContain('<param name="name">')
        })

        it("should mark optional params with ?", () => {
            const tool = getToolDef("get_lines") as ToolDef
            const schema = buildToolXmlSchema(tool)

            expect(schema).toContain('<param name="start?">')
            expect(schema).toContain('<param name="end?">')
        })

        it("should include param descriptions", () => {
            const tool = getToolDef("git_commit") as ToolDef
            const schema = buildToolXmlSchema(tool)

            expect(schema).toContain("Commit message")
        })
    })

    describe("buildAllToolsXmlSchema", () => {
        it("should include all categories", () => {
            const schema = buildAllToolsXmlSchema()

            expect(schema).toContain("## Reading Code")
            expect(schema).toContain("## Editing Files")
            expect(schema).toContain("## Searching")
            expect(schema).toContain("## Analysis")
            expect(schema).toContain("## Git Operations")
            expect(schema).toContain("## Running Commands")
        })

        it("should include all tools", () => {
            const schema = buildAllToolsXmlSchema()
            const names = getToolNames()

            for (const name of names) {
                expect(schema).toContain(`<tool_call name="${name}">`)
            }
        })

        it("should have proper XML format", () => {
            const schema = buildAllToolsXmlSchema()

            expect(schema).toContain("```xml")
            expect(schema).toContain("```")
        })
    })
})
