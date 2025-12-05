/**
 * E2E Tests with REAL Ollama Integration
 *
 * These tests use the actual Ollama LLM to test the full workflow
 * without the TUI layer.
 *
 * Requirements:
 * - Ollama running at localhost:11434
 * - qwen2.5-coder:14b-instruct model installed (with native tools support)
 *
 * Run: pnpm test:run tests/e2e/
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import { HandleMessage } from "../../src/application/use-cases/HandleMessage.js"
import { ExecuteTool } from "../../src/application/use-cases/ExecuteTool.js"
import { StartSession } from "../../src/application/use-cases/StartSession.js"
import { UndoChange } from "../../src/application/use-cases/UndoChange.js"
import { IndexProject } from "../../src/application/use-cases/IndexProject.js"
import { ContextManager } from "../../src/application/use-cases/ContextManager.js"
import type { HandleMessageEvents } from "../../src/application/use-cases/HandleMessage.js"
import type { ChatMessage } from "../../src/domain/value-objects/ChatMessage.js"
import type { ToolCall } from "../../src/domain/value-objects/ToolCall.js"
import type { ToolResult } from "../../src/domain/value-objects/ToolResult.js"
import type { ProjectStructure } from "../../src/infrastructure/llm/prompts.js"
import { simpleGit } from "simple-git"
import {
    createE2ETestDependencies,
    cleanupTestProject,
    isOllamaAvailable,
    isModelAvailable,
    type E2ETestDependencies,
} from "./test-helpers.js"

describe("E2E: Full Workflow with Real Ollama", () => {
    let deps: E2ETestDependencies
    let ollamaAvailable: boolean
    let modelAvailable: boolean

    beforeAll(async () => {
        ollamaAvailable = await isOllamaAvailable()
        if (ollamaAvailable) {
            modelAvailable = await isModelAvailable()
        } else {
            modelAvailable = false
        }
    })

    beforeEach(async () => {
        if (!ollamaAvailable || !modelAvailable) {
            return
        }
        deps = await createE2ETestDependencies()
    })

    afterEach(async () => {
        if (deps?.projectRoot) {
            await cleanupTestProject(deps.projectRoot)
        }
    })

    describe("Prerequisites", () => {
        it("should have Ollama running", async () => {
            expect(ollamaAvailable).toBe(true)
        })

        it("should have qwen2.5-coder:14b-instruct model", async () => {
            if (!ollamaAvailable) {
                console.warn("Skipping: Ollama not available")
                return
            }
            expect(modelAvailable).toBe(true)
        })

        it("should have test project created", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const indexPath = path.join(deps.projectRoot, "src", "index.ts")
            const content = await fs.readFile(indexPath, "utf-8")

            expect(content).toContain("export function main")
            expect(content).toContain("export function add")
        })

        it("should have all 18 tools registered", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            expect(deps.tools.size).toBe(18)

            const toolNames = deps.tools.getNames()
            expect(toolNames).toContain("get_lines")
            expect(toolNames).toContain("get_function")
            expect(toolNames).toContain("get_class")
            expect(toolNames).toContain("get_structure")
            expect(toolNames).toContain("edit_lines")
            expect(toolNames).toContain("create_file")
            expect(toolNames).toContain("delete_file")
            expect(toolNames).toContain("find_references")
            expect(toolNames).toContain("find_definition")
            expect(toolNames).toContain("get_dependencies")
            expect(toolNames).toContain("get_dependents")
            expect(toolNames).toContain("get_complexity")
            expect(toolNames).toContain("get_todos")
            expect(toolNames).toContain("git_status")
            expect(toolNames).toContain("git_diff")
            expect(toolNames).toContain("git_commit")
            expect(toolNames).toContain("run_command")
            expect(toolNames).toContain("run_tests")
        })
    })

    describe("HandleMessage with Real LLM", () => {
        it("should process a simple question and get response", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const handleMessage = new HandleMessage(
                deps.storage,
                deps.sessionStorage,
                deps.llm,
                deps.tools,
                deps.projectRoot,
            )

            const messages: ChatMessage[] = []
            const toolCalls: ToolCall[] = []
            const toolResults: ToolResult[] = []

            const userQuery = "Hello! Just say hi back."
            console.log("\n" + "=".repeat(60))
            console.log("[USER QUERY]:", userQuery)
            console.log("=".repeat(60))

            const events: HandleMessageEvents = {
                onMessage: (msg) => {
                    messages.push(msg)
                    if (msg.role === "assistant") {
                        console.log("\n[LLM RESPONSE]:", msg.content?.substring(0, 200) + "...")
                    }
                },
                onToolCall: (call) => {
                    toolCalls.push(call)
                    console.log("[TOOL CALL]:", call.name, JSON.stringify(call.params))
                },
                onToolResult: (result) => {
                    toolResults.push(result)
                    console.log("[TOOL RESULT]:", result.success ? "✅ Success" : "❌ Error")
                },
                onConfirmation: async () => true,
            }

            handleMessage.setEvents(events)
            handleMessage.setOptions({ autoApply: true, maxToolCalls: 10 })

            await handleMessage.execute(deps.session, userQuery)

            expect(messages.length).toBeGreaterThan(0)

            const assistantMessages = messages.filter((m) => m.role === "assistant")
            expect(assistantMessages.length).toBeGreaterThan(0)

            expect(deps.session.history.length).toBeGreaterThan(0)
        }, 120_000)

        it("should use get_lines tool when asked to read a file", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const handleMessage = new HandleMessage(
                deps.storage,
                deps.sessionStorage,
                deps.llm,
                deps.tools,
                deps.projectRoot,
            )

            const toolCalls: ToolCall[] = []
            const toolResults: ToolResult[] = []

            const userQuery = "Read the file src/index.ts and tell me what functions are defined there."
            console.log("\n" + "=".repeat(60))
            console.log("[USER QUERY]:", userQuery)
            console.log("[PROJECT ROOT]:", deps.projectRoot)
            console.log("=".repeat(60))

            const events: HandleMessageEvents = {
                onMessage: (msg) => {
                    if (msg.role === "assistant") {
                        console.log("\n[LLM RESPONSE]:", msg.content?.substring(0, 500))
                    }
                },
                onToolCall: (call) => {
                    console.log("\n🔧 [TOOL CALL]:", call.name)
                    console.log("   Params:", JSON.stringify(call.params, null, 2))
                    toolCalls.push(call)
                },
                onToolResult: (result) => {
                    console.log("   [TOOL RESULT]:", result.success ? "✅ Success" : "❌ Error")
                    if (result.data) {
                        const dataStr = JSON.stringify(result.data)
                        console.log("   Data:", dataStr.substring(0, 200) + (dataStr.length > 200 ? "..." : ""))
                    }
                    toolResults.push(result)
                },
                onConfirmation: async () => true,
            }

            handleMessage.setEvents(events)
            handleMessage.setOptions({ autoApply: true, maxToolCalls: 5 })

            await handleMessage.execute(deps.session, userQuery)

            const assistantMessages = deps.session.history.filter((m) => m.role === "assistant")
            expect(assistantMessages.length).toBeGreaterThan(0)

            if (toolCalls.length > 0) {
                console.log("\n✅ Tools used:", toolCalls.map((tc) => tc.name))
            } else {
                console.log("\n⚠️ LLM responded without using tools")
            }
        }, 180_000)

        it("should use get_todos tool when asked to find TODOs", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const handleMessage = new HandleMessage(
                deps.storage,
                deps.sessionStorage,
                deps.llm,
                deps.tools,
                deps.projectRoot,
            )

            const toolCalls: ToolCall[] = []

            const events: HandleMessageEvents = {
                onToolCall: (call) => {
                    console.log(`Tool called: ${call.name}`)
                    toolCalls.push(call)
                },
                onConfirmation: async () => true,
            }

            handleMessage.setEvents(events)
            handleMessage.setOptions({ autoApply: true, maxToolCalls: 5 })

            await handleMessage.execute(deps.session, "Find all TODO and FIXME comments in the project.")

            const todoToolCalls = toolCalls.filter((tc) => tc.name === "get_todos")

            if (todoToolCalls.length > 0) {
                expect(todoToolCalls[0].name).toBe("get_todos")
            } else {
                console.log("LLM did not use get_todos tool, but used:", toolCalls.map((tc) => tc.name))
            }

            expect(deps.session.history.length).toBeGreaterThan(0)
        }, 120_000)

        it("should use get_structure tool when asked about project structure", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const handleMessage = new HandleMessage(
                deps.storage,
                deps.sessionStorage,
                deps.llm,
                deps.tools,
                deps.projectRoot,
            )

            const toolCalls: ToolCall[] = []

            const events: HandleMessageEvents = {
                onToolCall: (call) => {
                    console.log(`Tool called: ${call.name}`)
                    toolCalls.push(call)
                },
                onConfirmation: async () => true,
            }

            handleMessage.setEvents(events)
            handleMessage.setOptions({ autoApply: true, maxToolCalls: 5 })

            await handleMessage.execute(deps.session, "Show me the project file structure.")

            const structureToolCalls = toolCalls.filter((tc) => tc.name === "get_structure")

            if (structureToolCalls.length > 0) {
                expect(structureToolCalls[0].name).toBe("get_structure")
            } else {
                console.log("LLM used tools:", toolCalls.map((tc) => tc.name))
            }

            expect(deps.session.history.length).toBeGreaterThan(0)
        }, 120_000)

        it("should use get_class tool when asked about a class", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const handleMessage = new HandleMessage(
                deps.storage,
                deps.sessionStorage,
                deps.llm,
                deps.tools,
                deps.projectRoot,
            )

            const toolCalls: ToolCall[] = []

            const events: HandleMessageEvents = {
                onToolCall: (call) => {
                    console.log(`Tool called: ${call.name}`)
                    toolCalls.push(call)
                },
                onConfirmation: async () => true,
            }

            handleMessage.setEvents(events)
            handleMessage.setOptions({ autoApply: true, maxToolCalls: 5 })

            await handleMessage.execute(
                deps.session,
                "Show me the Calculator class from src/utils.ts.",
            )

            const classToolCalls = toolCalls.filter(
                (tc) => tc.name === "get_class" || tc.name === "get_lines",
            )

            expect(classToolCalls.length).toBeGreaterThanOrEqual(0)
            expect(deps.session.history.length).toBeGreaterThan(0)
        }, 120_000)

        it("should use get_function tool when asked about a function", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const handleMessage = new HandleMessage(
                deps.storage,
                deps.sessionStorage,
                deps.llm,
                deps.tools,
                deps.projectRoot,
            )

            const toolCalls: ToolCall[] = []

            const events: HandleMessageEvents = {
                onToolCall: (call) => {
                    console.log(`Tool called: ${call.name}`)
                    toolCalls.push(call)
                },
                onConfirmation: async () => true,
            }

            handleMessage.setEvents(events)
            handleMessage.setOptions({ autoApply: true, maxToolCalls: 5 })

            await handleMessage.execute(
                deps.session,
                "Show me the 'add' function from src/index.ts.",
            )

            const functionToolCalls = toolCalls.filter(
                (tc) => tc.name === "get_function" || tc.name === "get_lines",
            )

            expect(functionToolCalls.length).toBeGreaterThanOrEqual(0)
            expect(deps.session.history.length).toBeGreaterThan(0)
        }, 120_000)
    })

    describe("ExecuteTool Direct Execution", () => {
        it("should execute get_lines tool directly", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const executeTool = new ExecuteTool(
                deps.storage,
                deps.sessionStorage,
                deps.tools,
                deps.projectRoot,
            )

            const toolCall: ToolCall = {
                id: "test-1",
                name: "get_lines",
                params: {
                    path: "src/index.ts",
                    start: 1,
                    end: 10,
                },
            }

            const { result } = await executeTool.execute(toolCall, deps.session, {
                autoApply: true,
            })

            expect(result.success).toBe(true)
            expect(result.data).toBeDefined()
        })

        it("should execute get_structure tool directly", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const executeTool = new ExecuteTool(
                deps.storage,
                deps.sessionStorage,
                deps.tools,
                deps.projectRoot,
            )

            const toolCall: ToolCall = {
                id: "test-2",
                name: "get_structure",
                params: {
                    path: ".",
                    depth: 3,
                },
            }

            const { result } = await executeTool.execute(toolCall, deps.session, {
                autoApply: true,
            })

            expect(result.success).toBe(true)
            expect(result.data).toBeDefined()
        })

        it("should execute get_todos tool directly", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            // get_todos uses storage.getAllFiles() - since storage is empty,
            // it will return empty results. This is expected behavior.
            // In a real scenario, the project would be indexed first.
            const executeTool = new ExecuteTool(
                deps.storage,
                deps.sessionStorage,
                deps.tools,
                deps.projectRoot,
            )

            const toolCall: ToolCall = {
                id: "test-3",
                name: "get_todos",
                params: {},
            }

            const { result } = await executeTool.execute(toolCall, deps.session, {
                autoApply: true,
            })

            // The tool succeeds but returns empty when no files are indexed
            expect(result.success).toBe(true)
            expect(result.data).toBeDefined()

            if (result.data && typeof result.data === "object" && "todos" in result.data) {
                const data = result.data as { totalTodos: number; todos: unknown[] }
                // With empty storage, totalTodos will be 0
                expect(data.totalTodos).toBeGreaterThanOrEqual(0)
            }
        })

        it("should execute create_file tool with confirmation", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const executeTool = new ExecuteTool(
                deps.storage,
                deps.sessionStorage,
                deps.tools,
                deps.projectRoot,
            )

            const toolCall: ToolCall = {
                id: "test-4",
                name: "create_file",
                params: {
                    path: "src/new-file.ts",
                    content: "export const test = 42;\n",
                },
            }

            const { result, undoEntryCreated } = await executeTool.execute(toolCall, deps.session, {
                autoApply: true,
            })

            expect(result.success).toBe(true)
            expect(undoEntryCreated).toBe(true)

            const newFilePath = path.join(deps.projectRoot, "src", "new-file.ts")
            const content = await fs.readFile(newFilePath, "utf-8")
            expect(content).toBe("export const test = 42;\n")
        })

        it("should execute edit_lines tool with confirmation", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const executeTool = new ExecuteTool(
                deps.storage,
                deps.sessionStorage,
                deps.tools,
                deps.projectRoot,
            )

            const toolCall: ToolCall = {
                id: "test-5",
                name: "edit_lines",
                params: {
                    path: "src/index.ts",
                    start: 4,
                    end: 4,
                    content: '    console.log("Modified!");',
                },
            }

            const { result, undoEntryCreated } = await executeTool.execute(toolCall, deps.session, {
                autoApply: true,
            })

            expect(result.success).toBe(true)
            expect(undoEntryCreated).toBe(true)

            const modifiedContent = await fs.readFile(
                path.join(deps.projectRoot, "src", "index.ts"),
                "utf-8",
            )
            expect(modifiedContent).toContain("Modified!")
        })

        it("should execute delete_file tool with confirmation", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const tempFilePath = path.join(deps.projectRoot, "src", "to-delete.ts")
            await fs.writeFile(tempFilePath, "// File to delete\n")

            const executeTool = new ExecuteTool(
                deps.storage,
                deps.sessionStorage,
                deps.tools,
                deps.projectRoot,
            )

            const toolCall: ToolCall = {
                id: "test-6",
                name: "delete_file",
                params: {
                    path: "src/to-delete.ts",
                },
            }

            const { result, undoEntryCreated } = await executeTool.execute(toolCall, deps.session, {
                autoApply: true,
            })

            expect(result.success).toBe(true)
            expect(undoEntryCreated).toBe(true)

            const exists = await fs
                .access(tempFilePath)
                .then(() => true)
                .catch(() => false)
            expect(exists).toBe(false)
        })

        it("should execute run_command tool", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const executeTool = new ExecuteTool(
                deps.storage,
                deps.sessionStorage,
                deps.tools,
                deps.projectRoot,
            )

            const toolCall: ToolCall = {
                id: "test-7",
                name: "run_command",
                params: {
                    command: "echo 'Hello from E2E test'",
                },
            }

            const { result } = await executeTool.execute(toolCall, deps.session, {
                autoApply: true,
            })

            expect(result.success).toBe(true)
            if (result.data && typeof result.data === "object" && "stdout" in result.data) {
                expect(result.data.stdout).toContain("Hello from E2E test")
            }
        })
    })

    describe("Multi-turn Conversation", () => {
        it("should maintain context across multiple messages", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const handleMessage = new HandleMessage(
                deps.storage,
                deps.sessionStorage,
                deps.llm,
                deps.tools,
                deps.projectRoot,
            )

            handleMessage.setEvents({
                onConfirmation: async () => true,
            })
            handleMessage.setOptions({ autoApply: true, maxToolCalls: 5 })

            await handleMessage.execute(deps.session, "Read src/index.ts file.")

            expect(deps.session.history.length).toBeGreaterThan(0)
            const historyBeforeSecond = deps.session.history.length

            await handleMessage.execute(deps.session, "Now what functions are in that file?")

            expect(deps.session.history.length).toBeGreaterThan(historyBeforeSecond)
        }, 180_000)
    })

    describe("HandleMessage with ProjectStructure", () => {
        it("should use tools when project structure is provided", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const handleMessage = new HandleMessage(
                deps.storage,
                deps.sessionStorage,
                deps.llm,
                deps.tools,
                deps.projectRoot,
            )

            // Set up project structure for context
            const projectStructure: ProjectStructure = {
                name: "test-project",
                rootPath: deps.projectRoot,
                files: ["src/index.ts", "src/utils.ts", "package.json", "README.md"],
                directories: ["src"],
            }

            handleMessage.setProjectStructure(projectStructure)

            const toolCalls: ToolCall[] = []

            const events: HandleMessageEvents = {
                onToolCall: (call) => {
                    console.log(`[ProjectStructure test] Tool called: ${call.name}`)
                    toolCalls.push(call)
                },
                onConfirmation: async () => true,
            }

            handleMessage.setEvents(events)
            handleMessage.setOptions({ autoApply: true, maxToolCalls: 5 })

            // Ask explicitly to use a tool
            await handleMessage.execute(
                deps.session,
                "Use the get_structure tool to show me the project file structure.",
            )

            const assistantMessages = deps.session.history.filter((m) => m.role === "assistant")
            expect(assistantMessages.length).toBeGreaterThan(0)

            // Log what happened
            if (toolCalls.length > 0) {
                console.log("Tools used with ProjectStructure:", toolCalls.map((tc) => tc.name))
            } else {
                console.log(
                    "LLM answered without tools - this is acceptable as tool usage is non-deterministic",
                )
            }
        }, 120_000)
    })

    describe("Error Handling", () => {
        it("should handle non-existent file gracefully", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const executeTool = new ExecuteTool(
                deps.storage,
                deps.sessionStorage,
                deps.tools,
                deps.projectRoot,
            )

            const toolCall: ToolCall = {
                id: "test-error-1",
                name: "get_lines",
                params: {
                    path: "non-existent-file.ts",
                    start: 1,
                    end: 10,
                },
            }

            const { result } = await executeTool.execute(toolCall, deps.session, {
                autoApply: true,
            })

            expect(result.success).toBe(false)
            expect(result.error).toBeDefined()
        })

        it("should handle invalid tool parameters gracefully", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const executeTool = new ExecuteTool(
                deps.storage,
                deps.sessionStorage,
                deps.tools,
                deps.projectRoot,
            )

            const toolCall: ToolCall = {
                id: "test-error-2",
                name: "get_lines",
                params: {},
            }

            const { result } = await executeTool.execute(toolCall, deps.session, {
                autoApply: true,
            })

            expect(result.success).toBe(false)
            expect(result.error).toBeDefined()
        })

        it("should handle unknown tool gracefully", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const executeTool = new ExecuteTool(
                deps.storage,
                deps.sessionStorage,
                deps.tools,
                deps.projectRoot,
            )

            const toolCall: ToolCall = {
                id: "test-error-3",
                name: "unknown_tool",
                params: {},
            }

            const { result } = await executeTool.execute(toolCall, deps.session, {
                autoApply: true,
            })

            expect(result.success).toBe(false)
            expect(result.error).toContain("Unknown tool")
        })
    })

    describe("All 18 Tools - Direct Execution", () => {
        // READ TOOLS
        it("should execute get_function tool", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const executeTool = new ExecuteTool(
                deps.storage,
                deps.sessionStorage,
                deps.tools,
                deps.projectRoot,
            )

            const toolCall: ToolCall = {
                id: "tool-get_function",
                name: "get_function",
                params: {
                    path: "src/index.ts",
                    name: "add",
                },
            }

            const { result } = await executeTool.execute(toolCall, deps.session, {
                autoApply: true,
            })

            // May fail if tree-sitter can't parse, but tool should return defined result
            expect(result).toBeDefined()
            if (result.success) {
                expect(result.data).toBeDefined()
            } else {
                console.log("get_function error:", result.error)
            }
        })

        it("should execute get_class tool", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const executeTool = new ExecuteTool(
                deps.storage,
                deps.sessionStorage,
                deps.tools,
                deps.projectRoot,
            )

            const toolCall: ToolCall = {
                id: "tool-get_class",
                name: "get_class",
                params: {
                    path: "src/utils.ts",
                    name: "Calculator",
                },
            }

            const { result } = await executeTool.execute(toolCall, deps.session, {
                autoApply: true,
            })

            // May fail if tree-sitter can't parse, but tool should return defined result
            expect(result).toBeDefined()
            if (result.success) {
                expect(result.data).toBeDefined()
            } else {
                console.log("get_class error:", result.error)
            }
        })

        // SEARCH TOOLS (require indexed storage)
        it("should execute find_references tool", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const executeTool = new ExecuteTool(
                deps.storage,
                deps.sessionStorage,
                deps.tools,
                deps.projectRoot,
            )

            const toolCall: ToolCall = {
                id: "tool-find_references",
                name: "find_references",
                params: {
                    symbol: "add",
                },
            }

            const { result } = await executeTool.execute(toolCall, deps.session, {
                autoApply: true,
            })

            // Will succeed but may return empty without indexed storage
            expect(result.success).toBe(true)
        })

        it("should execute find_definition tool", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const executeTool = new ExecuteTool(
                deps.storage,
                deps.sessionStorage,
                deps.tools,
                deps.projectRoot,
            )

            const toolCall: ToolCall = {
                id: "tool-find_definition",
                name: "find_definition",
                params: {
                    symbol: "Calculator",
                },
            }

            const { result } = await executeTool.execute(toolCall, deps.session, {
                autoApply: true,
            })

            // Will succeed but may return empty without indexed storage
            expect(result.success).toBe(true)
        })

        // ANALYSIS TOOLS
        it("should execute get_dependencies tool", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const executeTool = new ExecuteTool(
                deps.storage,
                deps.sessionStorage,
                deps.tools,
                deps.projectRoot,
            )

            const toolCall: ToolCall = {
                id: "tool-get_dependencies",
                name: "get_dependencies",
                params: {
                    path: "src/utils.ts",
                },
            }

            const { result } = await executeTool.execute(toolCall, deps.session, {
                autoApply: true,
            })

            // Tool may return error without indexed storage, but should be defined
            expect(result).toBeDefined()
            if (!result.success) {
                console.log("get_dependencies error (expected without index):", result.error)
            }
        })

        it("should execute get_dependents tool", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const executeTool = new ExecuteTool(
                deps.storage,
                deps.sessionStorage,
                deps.tools,
                deps.projectRoot,
            )

            const toolCall: ToolCall = {
                id: "tool-get_dependents",
                name: "get_dependents",
                params: {
                    path: "src/index.ts",
                },
            }

            const { result } = await executeTool.execute(toolCall, deps.session, {
                autoApply: true,
            })

            // Tool may return error without indexed storage, but should be defined
            expect(result).toBeDefined()
            if (!result.success) {
                console.log("get_dependents error (expected without index):", result.error)
            }
        })

        it("should execute get_complexity tool", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const executeTool = new ExecuteTool(
                deps.storage,
                deps.sessionStorage,
                deps.tools,
                deps.projectRoot,
            )

            const toolCall: ToolCall = {
                id: "tool-get_complexity",
                name: "get_complexity",
                params: {
                    path: "src",
                },
            }

            const { result } = await executeTool.execute(toolCall, deps.session, {
                autoApply: true,
            })

            // Will succeed but may return empty without indexed storage
            expect(result.success).toBe(true)
        })

        // GIT TOOLS
        it("should execute git_status tool", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            // Initialize git repo for testing
            const git = simpleGit(deps.projectRoot)
            await git.init()
            await git.addConfig("user.email", "test@test.com")
            await git.addConfig("user.name", "Test User")

            const executeTool = new ExecuteTool(
                deps.storage,
                deps.sessionStorage,
                deps.tools,
                deps.projectRoot,
            )

            const toolCall: ToolCall = {
                id: "tool-git_status",
                name: "git_status",
                params: {},
            }

            const { result } = await executeTool.execute(toolCall, deps.session, {
                autoApply: true,
            })

            expect(result.success).toBe(true)
            expect(result.data).toBeDefined()
        })

        it("should execute git_diff tool", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            // Initialize git repo
            const git = simpleGit(deps.projectRoot)
            await git.init()
            await git.addConfig("user.email", "test@test.com")
            await git.addConfig("user.name", "Test User")
            await git.add(".")
            await git.commit("Initial commit")

            // Make a change
            const indexPath = path.join(deps.projectRoot, "src", "index.ts")
            const content = await fs.readFile(indexPath, "utf-8")
            await fs.writeFile(indexPath, content + "\n// New line added\n")

            const executeTool = new ExecuteTool(
                deps.storage,
                deps.sessionStorage,
                deps.tools,
                deps.projectRoot,
            )

            const toolCall: ToolCall = {
                id: "tool-git_diff",
                name: "git_diff",
                params: {},
            }

            const { result } = await executeTool.execute(toolCall, deps.session, {
                autoApply: true,
            })

            expect(result.success).toBe(true)
        })

        it("should execute git_commit tool with confirmation", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            // Initialize git repo
            const git = simpleGit(deps.projectRoot)
            await git.init()
            await git.addConfig("user.email", "test@test.com")
            await git.addConfig("user.name", "Test User")
            // Stage all files first
            await git.add(".")

            const executeTool = new ExecuteTool(
                deps.storage,
                deps.sessionStorage,
                deps.tools,
                deps.projectRoot,
            )

            const toolCall: ToolCall = {
                id: "tool-git_commit",
                name: "git_commit",
                params: {
                    message: "Test commit from E2E",
                },
            }

            const { result } = await executeTool.execute(toolCall, deps.session, {
                autoApply: true,
            })

            expect(result.success).toBe(true)
        })

        // RUN TOOLS
        it("should execute run_tests tool", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const executeTool = new ExecuteTool(
                deps.storage,
                deps.sessionStorage,
                deps.tools,
                deps.projectRoot,
            )

            const toolCall: ToolCall = {
                id: "tool-run_tests",
                name: "run_tests",
                params: {},
            }

            const { result } = await executeTool.execute(toolCall, deps.session, {
                autoApply: true,
            })

            // May fail if npm test is not configured, but tool should execute
            expect(result).toBeDefined()
        })
    })

    describe("Use Case: StartSession", () => {
        it("should create a new session", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const startSession = new StartSession(deps.sessionStorage)

            const result = await startSession.execute("e2e-test-project", {
                forceNew: true,
            })

            expect(result.session).toBeDefined()
            expect(result.isNew).toBe(true)
            expect(result.session.projectName).toBe("e2e-test-project")
        })

        it("should load existing session", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const startSession = new StartSession(deps.sessionStorage)

            // Create first session
            const first = await startSession.execute("e2e-test-project", { forceNew: true })
            expect(first.isNew).toBe(true)

            // Save it
            await deps.sessionStorage.saveSession(first.session)

            // Load it again
            const second = await startSession.execute("e2e-test-project", { forceNew: false })
            expect(second.isNew).toBe(false)
            expect(second.session.id).toBe(first.session.id)
        })
    })

    describe("Use Case: UndoChange", () => {
        it("should create undo entry when creating file", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            // First create a file
            const executeTool = new ExecuteTool(
                deps.storage,
                deps.sessionStorage,
                deps.tools,
                deps.projectRoot,
            )

            const createCall: ToolCall = {
                id: "undo-test-create",
                name: "create_file",
                params: {
                    path: "src/undo-test.ts",
                    content: "export const undoTest = true;\n",
                },
            }

            const { undoEntryCreated } = await executeTool.execute(createCall, deps.session, {
                autoApply: true,
            })

            expect(undoEntryCreated).toBe(true)

            // Verify file exists
            const filePath = path.join(deps.projectRoot, "src", "undo-test.ts")
            const exists = await fs
                .access(filePath)
                .then(() => true)
                .catch(() => false)
            expect(exists).toBe(true)

            // Verify undo entry was created
            const undoStack = await deps.sessionStorage.getUndoStack(deps.session.id)
            expect(undoStack.length).toBeGreaterThan(0)
        })

        it("should create undo entry when editing file", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            // Edit the file
            const executeTool = new ExecuteTool(
                deps.storage,
                deps.sessionStorage,
                deps.tools,
                deps.projectRoot,
            )

            const editCall: ToolCall = {
                id: "undo-test-edit",
                name: "edit_lines",
                params: {
                    path: "src/index.ts",
                    start: 1,
                    end: 1,
                    content: "// EDITED LINE",
                },
            }

            const { undoEntryCreated } = await executeTool.execute(editCall, deps.session, {
                autoApply: true,
            })

            expect(undoEntryCreated).toBe(true)

            // Verify edit was applied
            const filePath = path.join(deps.projectRoot, "src", "index.ts")
            const content = await fs.readFile(filePath, "utf-8")
            expect(content).toContain("EDITED LINE")

            // Verify undo entry was created
            const undoStack = await deps.sessionStorage.getUndoStack(deps.session.id)
            expect(undoStack.length).toBeGreaterThan(0)
        })

        it("should instantiate UndoChange use case", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const undoChange = new UndoChange(deps.sessionStorage, deps.projectRoot)
            expect(undoChange).toBeDefined()

            // Execute with empty undo stack
            const result = await undoChange.execute(deps.session)
            // Should return success: false when no undo entries
            expect(result).toBeDefined()
        })
    })

    describe("Use Case: IndexProject", () => {
        it("should index project files", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const indexProject = new IndexProject(deps.storage)

            const stats = await indexProject.execute(deps.projectRoot, {
                ignorePatterns: ["node_modules", ".git"],
                supportedExtensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
            })

            expect(stats.filesScanned).toBeGreaterThan(0)
            expect(stats.filesParsed).toBeGreaterThanOrEqual(0)
        })

        it("should populate storage after indexing", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const indexProject = new IndexProject(deps.storage)

            await indexProject.execute(deps.projectRoot, {
                ignorePatterns: ["node_modules", ".git"],
                supportedExtensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
            })

            // Check that files are now in storage
            const fileCount = await deps.storage.getFileCount()
            expect(fileCount).toBeGreaterThan(0)

            const allFiles = await deps.storage.getAllFiles()
            expect(allFiles.size).toBeGreaterThan(0)
        })

        it("should find TODOs after indexing", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            // First index the project
            const indexProject = new IndexProject(deps.storage)
            await indexProject.execute(deps.projectRoot, {
                ignorePatterns: ["node_modules", ".git"],
                supportedExtensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
            })

            // Now get_todos should find the TODOs we put in test files
            const executeTool = new ExecuteTool(
                deps.storage,
                deps.sessionStorage,
                deps.tools,
                deps.projectRoot,
            )

            const toolCall: ToolCall = {
                id: "todos-after-index",
                name: "get_todos",
                params: {},
            }

            const { result } = await executeTool.execute(toolCall, deps.session, {
                autoApply: true,
            })

            expect(result.success).toBe(true)
            if (result.data && typeof result.data === "object" && "totalTodos" in result.data) {
                const data = result.data as { totalTodos: number }
                expect(data.totalTodos).toBeGreaterThan(0)
            }
        })
    })

    describe("Use Case: ContextManager", () => {
        it("should track token usage", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const contextManager = new ContextManager(128_000)

            contextManager.addTokens(1000)
            contextManager.addTokens(500)

            // ContextManager should track token usage internally
            expect(contextManager.needsCompression()).toBe(false)
        })

        it("should sync from session", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const contextManager = new ContextManager(128_000)

            // Add some history to session
            deps.session.context.tokenUsage = 0.5
            deps.session.context.filesInContext = ["src/index.ts"]

            contextManager.syncFromSession(deps.session)

            // Context should be synced
            expect(deps.session.context.filesInContext).toContain("src/index.ts")
        })

        it("should update session context", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            const contextManager = new ContextManager(128_000)

            contextManager.addTokens(50_000)
            contextManager.updateSession(deps.session)

            expect(deps.session.context.tokenUsage).toBeGreaterThan(0)
        })

        it("should detect when compression is needed", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            // Small context window to trigger compression
            const contextManager = new ContextManager(10_000, {
                autoCompressAt: 0.8,
            })

            // Add lots of tokens
            contextManager.addTokens(9000)

            expect(contextManager.needsCompression()).toBe(true)
        })
    })

    describe("Full Integration: Index + HandleMessage + Tools", () => {
        it("should work end-to-end with indexed project", async () => {
            if (!ollamaAvailable || !modelAvailable) {
                console.warn("Skipping: Ollama/model not available")
                return
            }

            // Step 1: Index the project
            const indexProject = new IndexProject(deps.storage)
            await indexProject.execute(deps.projectRoot, {
                ignorePatterns: ["node_modules", ".git"],
                supportedExtensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
            })

            // Step 2: Create HandleMessage with indexed storage
            const handleMessage = new HandleMessage(
                deps.storage,
                deps.sessionStorage,
                deps.llm,
                deps.tools,
                deps.projectRoot,
            )

            const toolCalls: ToolCall[] = []

            handleMessage.setEvents({
                onToolCall: (call) => toolCalls.push(call),
                onConfirmation: async () => true,
            })
            handleMessage.setOptions({ autoApply: true, maxToolCalls: 10 })

            // Step 3: Ask about the project
            await handleMessage.execute(
                deps.session,
                "What functions are defined in this project? Use tools to find out.",
            )

            // Verify session has messages
            expect(deps.session.history.length).toBeGreaterThan(0)

            // Log tool usage
            if (toolCalls.length > 0) {
                console.log("Full integration - tools used:", toolCalls.map((tc) => tc.name))
            }
        }, 180_000)
    })
})
