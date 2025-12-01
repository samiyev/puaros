import { describe, it, expect, vi, beforeEach } from "vitest"
import { HandleMessage } from "../../../../src/application/use-cases/HandleMessage.js"
import type { IStorage } from "../../../../src/domain/services/IStorage.js"
import type { ISessionStorage } from "../../../../src/domain/services/ISessionStorage.js"
import type { ILLMClient, LLMResponse } from "../../../../src/domain/services/ILLMClient.js"
import type { IToolRegistry } from "../../../../src/application/interfaces/IToolRegistry.js"
import type { ITool, ToolContext } from "../../../../src/domain/services/ITool.js"
import { Session } from "../../../../src/domain/entities/Session.js"
import { createSuccessResult } from "../../../../src/domain/value-objects/ToolResult.js"

describe("HandleMessage", () => {
    let useCase: HandleMessage
    let mockStorage: IStorage
    let mockSessionStorage: ISessionStorage
    let mockLLM: ILLMClient
    let mockTools: IToolRegistry
    let session: Session

    const createMockLLMResponse = (content: string, toolCalls = false): LLMResponse => ({
        content,
        toolCalls: [],
        tokens: 100,
        timeMs: 50,
        truncated: false,
        stopReason: toolCalls ? "tool_use" : "end",
    })

    beforeEach(() => {
        mockStorage = {
            getFile: vi.fn().mockResolvedValue(null),
            setFile: vi.fn().mockResolvedValue(undefined),
            deleteFile: vi.fn().mockResolvedValue(undefined),
            getAllFiles: vi.fn().mockResolvedValue(new Map()),
            getFileCount: vi.fn().mockResolvedValue(0),
            getAST: vi.fn().mockResolvedValue(null),
            setAST: vi.fn().mockResolvedValue(undefined),
            deleteAST: vi.fn().mockResolvedValue(undefined),
            getAllASTs: vi.fn().mockResolvedValue(new Map()),
            getMeta: vi.fn().mockResolvedValue(null),
            setMeta: vi.fn().mockResolvedValue(undefined),
            deleteMeta: vi.fn().mockResolvedValue(undefined),
            getAllMetas: vi.fn().mockResolvedValue(new Map()),
            getSymbolIndex: vi.fn().mockResolvedValue(new Map()),
            setSymbolIndex: vi.fn().mockResolvedValue(undefined),
            getDepsGraph: vi.fn().mockResolvedValue({ imports: new Map(), importedBy: new Map() }),
            setDepsGraph: vi.fn().mockResolvedValue(undefined),
            getProjectConfig: vi.fn().mockResolvedValue(null),
            setProjectConfig: vi.fn().mockResolvedValue(undefined),
            connect: vi.fn().mockResolvedValue(undefined),
            disconnect: vi.fn().mockResolvedValue(undefined),
            isConnected: vi.fn().mockReturnValue(true),
            clear: vi.fn().mockResolvedValue(undefined),
        }

        mockSessionStorage = {
            saveSession: vi.fn().mockResolvedValue(undefined),
            loadSession: vi.fn().mockResolvedValue(null),
            deleteSession: vi.fn().mockResolvedValue(undefined),
            listSessions: vi.fn().mockResolvedValue([]),
            getLatestSession: vi.fn().mockResolvedValue(null),
            sessionExists: vi.fn().mockResolvedValue(false),
            pushUndoEntry: vi.fn().mockResolvedValue(undefined),
            popUndoEntry: vi.fn().mockResolvedValue(null),
            getUndoStack: vi.fn().mockResolvedValue([]),
            touchSession: vi.fn().mockResolvedValue(undefined),
            clearAllSessions: vi.fn().mockResolvedValue(undefined),
        }

        mockLLM = {
            chat: vi.fn().mockResolvedValue(createMockLLMResponse("Hello!")),
            countTokens: vi.fn().mockResolvedValue(10),
            isAvailable: vi.fn().mockResolvedValue(true),
            getModelName: vi.fn().mockReturnValue("test-model"),
            getContextWindowSize: vi.fn().mockReturnValue(128_000),
            pullModel: vi.fn().mockResolvedValue(undefined),
            abort: vi.fn(),
        }

        mockTools = {
            register: vi.fn(),
            get: vi.fn().mockReturnValue(undefined),
            getAll: vi.fn().mockReturnValue([]),
            getByCategory: vi.fn().mockReturnValue([]),
            has: vi.fn().mockReturnValue(false),
            execute: vi.fn(),
            getToolDefinitions: vi.fn().mockReturnValue([]),
        }

        session = new Session("test-session", "test-project")
        useCase = new HandleMessage(mockStorage, mockSessionStorage, mockLLM, mockTools, "/project")
    })

    describe("execute", () => {
        it("should add user message to session history", async () => {
            await useCase.execute(session, "Hello, assistant!")

            expect(session.history.length).toBeGreaterThan(0)
            expect(session.history[0].role).toBe("user")
            expect(session.history[0].content).toBe("Hello, assistant!")
        })

        it("should add user input to input history", async () => {
            await useCase.execute(session, "Test command")

            expect(session.inputHistory).toContain("Test command")
        })

        it("should save session after user message", async () => {
            await useCase.execute(session, "Hello")

            expect(mockSessionStorage.saveSession).toHaveBeenCalled()
        })

        it("should send messages to LLM", async () => {
            await useCase.execute(session, "What is 2+2?")

            expect(mockLLM.chat).toHaveBeenCalled()
        })

        it("should add assistant response to history", async () => {
            vi.mocked(mockLLM.chat).mockResolvedValue(createMockLLMResponse("The answer is 4!"))

            await useCase.execute(session, "What is 2+2?")

            const assistantMessages = session.history.filter((m) => m.role === "assistant")
            expect(assistantMessages.length).toBeGreaterThan(0)
            expect(assistantMessages[0].content).toBe("The answer is 4!")
        })

        it("should not add empty user messages", async () => {
            await useCase.execute(session, "   ")

            const userMessages = session.history.filter((m) => m.role === "user")
            expect(userMessages.length).toBe(0)
        })

        it("should track token usage in message stats", async () => {
            vi.mocked(mockLLM.chat).mockResolvedValue({
                content: "Response",
                toolCalls: [],
                tokens: 150,
                timeMs: 200,
                truncated: false,
                stopReason: "end",
            })

            await useCase.execute(session, "Hello")

            const assistantMessage = session.history.find((m) => m.role === "assistant")
            expect(assistantMessage?.stats?.tokens).toBe(150)
            expect(assistantMessage?.stats?.timeMs).toBeGreaterThanOrEqual(0)
        })
    })

    describe("tool execution", () => {
        const mockTool: ITool = {
            name: "get_lines",
            description: "Get lines from file",
            parameters: [],
            requiresConfirmation: false,
            category: "read",
            validateParams: vi.fn().mockReturnValue(null),
            execute: vi.fn().mockResolvedValue(createSuccessResult("test", { lines: [] }, 10)),
        }

        beforeEach(() => {
            vi.mocked(mockTools.get).mockReturnValue(mockTool)
        })

        it("should execute tools when LLM returns tool calls", async () => {
            vi.mocked(mockLLM.chat)
                .mockResolvedValueOnce(
                    createMockLLMResponse(
                        '<tool_call name="get_lines"><path>test.ts</path></tool_call>',
                        true,
                    ),
                )
                .mockResolvedValueOnce(createMockLLMResponse("Done!"))

            await useCase.execute(session, "Show me test.ts")

            expect(mockTool.execute).toHaveBeenCalled()
        })

        it("should add tool results to session", async () => {
            vi.mocked(mockLLM.chat)
                .mockResolvedValueOnce(
                    createMockLLMResponse(
                        '<tool_call name="get_lines"><path>test.ts</path></tool_call>',
                        true,
                    ),
                )
                .mockResolvedValueOnce(createMockLLMResponse("Done!"))

            await useCase.execute(session, "Show me test.ts")

            const toolMessages = session.history.filter((m) => m.role === "tool")
            expect(toolMessages.length).toBeGreaterThan(0)
        })

        it("should return error for unregistered tools", async () => {
            vi.mocked(mockTools.get).mockReturnValue(undefined)
            vi.mocked(mockLLM.chat)
                .mockResolvedValueOnce(
                    createMockLLMResponse(
                        '<tool_call name="get_complexity"><path>src</path></tool_call>',
                        true,
                    ),
                )
                .mockResolvedValueOnce(createMockLLMResponse("Sorry, that didn't work"))

            await useCase.execute(session, "Do something")

            const toolMessages = session.history.filter((m) => m.role === "tool")
            expect(toolMessages[0].content).toContain("Unknown tool")
        })

        it("should stop after max tool calls exceeded", async () => {
            useCase.setOptions({ maxToolCalls: 2 })

            vi.mocked(mockLLM.chat).mockResolvedValue(
                createMockLLMResponse(
                    '<tool_call name="get_lines"><path>a.ts</path></tool_call>' +
                        '<tool_call name="get_lines"><path>b.ts</path></tool_call>' +
                        '<tool_call name="get_lines"><path>c.ts</path></tool_call>',
                    true,
                ),
            )

            await useCase.execute(session, "Show many files")

            const systemMessages = session.history.filter((m) => m.role === "system")
            const maxExceeded = systemMessages.some((m) => m.content.includes("Maximum tool calls"))
            expect(maxExceeded).toBe(true)
        })
    })

    describe("events", () => {
        it("should emit message events", async () => {
            const onMessage = vi.fn()
            useCase.setEvents({ onMessage })

            await useCase.execute(session, "Hello")

            expect(onMessage).toHaveBeenCalled()
        })

        it("should emit status changes", async () => {
            const onStatusChange = vi.fn()
            useCase.setEvents({ onStatusChange })

            await useCase.execute(session, "Hello")

            expect(onStatusChange).toHaveBeenCalledWith("thinking")
            expect(onStatusChange).toHaveBeenCalledWith("ready")
        })

        it("should emit tool call events", async () => {
            const onToolCall = vi.fn()
            useCase.setEvents({ onToolCall })

            const mockTool: ITool = {
                name: "get_lines",
                description: "Test",
                parameters: [],
                requiresConfirmation: false,
                category: "read",
                validateParams: vi.fn().mockReturnValue(null),
                execute: vi.fn().mockResolvedValue(createSuccessResult("test", {}, 10)),
            }
            vi.mocked(mockTools.get).mockReturnValue(mockTool)

            vi.mocked(mockLLM.chat)
                .mockResolvedValueOnce(
                    createMockLLMResponse(
                        '<tool_call name="get_lines"><path>test.ts</path></tool_call>',
                    ),
                )
                .mockResolvedValueOnce(createMockLLMResponse("Done"))

            await useCase.execute(session, "Show file")

            expect(onToolCall).toHaveBeenCalled()
        })
    })

    describe("confirmation handling", () => {
        const mockEditTool: ITool = {
            name: "edit_lines",
            description: "Edit lines",
            parameters: [],
            requiresConfirmation: true,
            category: "edit",
            validateParams: vi.fn().mockReturnValue(null),
            execute: vi
                .fn()
                .mockImplementation(async (_params: Record<string, unknown>, ctx: ToolContext) => {
                    const confirmed = await ctx.requestConfirmation("Apply edit?", {
                        filePath: "test.ts",
                        oldLines: ["old"],
                        newLines: ["new"],
                        startLine: 1,
                    })
                    if (!confirmed) {
                        return createSuccessResult("test", { cancelled: true }, 10)
                    }
                    return createSuccessResult("test", { applied: true }, 10)
                }),
        }

        beforeEach(() => {
            vi.mocked(mockTools.get).mockReturnValue(mockEditTool)
        })

        it("should auto-apply when autoApply option is true", async () => {
            useCase.setOptions({ autoApply: true })

            vi.mocked(mockLLM.chat)
                .mockResolvedValueOnce(
                    createMockLLMResponse(
                        '<tool_call name="edit_lines"><path>test.ts</path></tool_call>',
                    ),
                )
                .mockResolvedValueOnce(createMockLLMResponse("Done"))

            await useCase.execute(session, "Edit file")

            expect(mockEditTool.execute).toHaveBeenCalled()
        })

        it("should ask for confirmation via callback", async () => {
            const onConfirmation = vi.fn().mockResolvedValue(true)
            useCase.setEvents({ onConfirmation })

            vi.mocked(mockLLM.chat)
                .mockResolvedValueOnce(
                    createMockLLMResponse(
                        '<tool_call name="edit_lines"><path>test.ts</path></tool_call>',
                    ),
                )
                .mockResolvedValueOnce(createMockLLMResponse("Done"))

            await useCase.execute(session, "Edit file")

            expect(onConfirmation).toHaveBeenCalled()
        })

        it("should create undo entry on confirmation", async () => {
            const onUndoEntry = vi.fn()
            useCase.setEvents({
                onConfirmation: vi.fn().mockResolvedValue(true),
                onUndoEntry,
            })

            vi.mocked(mockLLM.chat)
                .mockResolvedValueOnce(
                    createMockLLMResponse(
                        '<tool_call name="edit_lines"><path>test.ts</path></tool_call>',
                    ),
                )
                .mockResolvedValueOnce(createMockLLMResponse("Done"))

            await useCase.execute(session, "Edit file")

            expect(onUndoEntry).toHaveBeenCalled()
            expect(mockSessionStorage.pushUndoEntry).toHaveBeenCalled()
        })
    })

    describe("abort", () => {
        it("should stop processing when aborted", async () => {
            vi.mocked(mockLLM.chat).mockImplementation(async () => {
                await new Promise((resolve) => setTimeout(resolve, 100))
                return createMockLLMResponse("Response")
            })

            const promise = useCase.execute(session, "Hello")

            setTimeout(() => useCase.abort(), 10)

            await promise

            expect(mockLLM.abort).toHaveBeenCalled()
        })
    })

    describe("error handling", () => {
        it("should handle LLM errors gracefully", async () => {
            vi.mocked(mockLLM.chat).mockRejectedValue(new Error("LLM unavailable"))

            await useCase.execute(session, "Hello")

            const systemMessages = session.history.filter((m) => m.role === "system")
            expect(systemMessages.some((m) => m.content.includes("Error"))).toBe(true)
        })

        it("should emit error status on LLM failure", async () => {
            const onStatusChange = vi.fn()
            useCase.setEvents({ onStatusChange })

            vi.mocked(mockLLM.chat).mockRejectedValue(new Error("LLM error"))

            await useCase.execute(session, "Hello")

            expect(onStatusChange).toHaveBeenCalledWith("error")
        })

        it("should allow retry on error", async () => {
            const onError = vi.fn().mockResolvedValue("retry")
            useCase.setEvents({ onError })

            vi.mocked(mockLLM.chat)
                .mockRejectedValueOnce(new Error("Temporary error"))
                .mockResolvedValueOnce(createMockLLMResponse("Success!"))

            await useCase.execute(session, "Hello")

            expect(onError).toHaveBeenCalled()
        })
    })
})
