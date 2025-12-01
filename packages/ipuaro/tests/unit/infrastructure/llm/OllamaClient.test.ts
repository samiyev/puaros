import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { LLMConfig } from "../../../../src/shared/constants/config.js"
import { IpuaroError } from "../../../../src/shared/errors/IpuaroError.js"
import { createUserMessage } from "../../../../src/domain/value-objects/ChatMessage.js"

const mockChatResponse = {
    message: {
        role: "assistant",
        content: "This is a test response.",
        tool_calls: undefined,
    },
    eval_count: 50,
    done_reason: "stop",
}

const mockListResponse = {
    models: [
        { name: "qwen2.5-coder:7b-instruct", size: 4000000000 },
        { name: "llama2:latest", size: 3500000000 },
    ],
}

const mockOllamaInstance = {
    chat: vi.fn(),
    list: vi.fn(),
    pull: vi.fn(),
}

vi.mock("ollama", () => {
    return {
        Ollama: vi.fn(() => mockOllamaInstance),
    }
})

const { OllamaClient } = await import("../../../../src/infrastructure/llm/OllamaClient.js")

describe("OllamaClient", () => {
    const defaultConfig: LLMConfig = {
        model: "qwen2.5-coder:7b-instruct",
        contextWindow: 128000,
        temperature: 0.1,
        host: "http://localhost:11434",
        timeout: 120000,
    }

    beforeEach(() => {
        vi.clearAllMocks()
        mockOllamaInstance.chat.mockResolvedValue(mockChatResponse)
        mockOllamaInstance.list.mockResolvedValue(mockListResponse)
        mockOllamaInstance.pull.mockResolvedValue({})
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe("constructor", () => {
        it("should create instance with config", () => {
            const client = new OllamaClient(defaultConfig)
            expect(client).toBeDefined()
            expect(client.getModelName()).toBe("qwen2.5-coder:7b-instruct")
            expect(client.getContextWindowSize()).toBe(128000)
        })
    })

    describe("chat", () => {
        it("should send messages and return response", async () => {
            const client = new OllamaClient(defaultConfig)
            const messages = [createUserMessage("Hello, world!")]

            const response = await client.chat(messages)

            expect(response.content).toBe("This is a test response.")
            expect(response.tokens).toBe(50)
            expect(response.stopReason).toBe("end")
            expect(response.truncated).toBe(false)
        })

        it("should convert messages to Ollama format", async () => {
            const client = new OllamaClient(defaultConfig)
            const messages = [createUserMessage("Hello")]

            await client.chat(messages)

            expect(mockOllamaInstance.chat).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: "qwen2.5-coder:7b-instruct",
                    messages: expect.arrayContaining([
                        expect.objectContaining({
                            role: "user",
                            content: "Hello",
                        }),
                    ]),
                }),
            )
        })

        it("should not pass tools parameter (tools are in system prompt)", async () => {
            const client = new OllamaClient(defaultConfig)
            const messages = [createUserMessage("Read file")]

            await client.chat(messages)

            expect(mockOllamaInstance.chat).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: "qwen2.5-coder:7b-instruct",
                    messages: expect.arrayContaining([
                        expect.objectContaining({
                            role: "user",
                            content: "Read file",
                        }),
                    ]),
                }),
            )
            expect(mockOllamaInstance.chat).toHaveBeenCalledWith(
                expect.not.objectContaining({
                    tools: expect.anything(),
                }),
            )
        })

        it("should extract tool calls from XML in response content", async () => {
            mockOllamaInstance.chat.mockResolvedValue({
                message: {
                    role: "assistant",
                    content:
                        '<tool_call name="get_lines"><path>src/index.ts</path></tool_call>',
                    tool_calls: undefined,
                },
                eval_count: 30,
            })

            const client = new OllamaClient(defaultConfig)
            const response = await client.chat([createUserMessage("Read file")])

            expect(response.toolCalls).toHaveLength(1)
            expect(response.toolCalls[0].name).toBe("get_lines")
            expect(response.toolCalls[0].params).toEqual({ path: "src/index.ts" })
            expect(response.stopReason).toBe("tool_use")
        })

        it("should handle connection errors", async () => {
            mockOllamaInstance.chat.mockRejectedValue(new Error("fetch failed"))

            const client = new OllamaClient(defaultConfig)

            await expect(client.chat([createUserMessage("Hello")])).rejects.toThrow(IpuaroError)
        })

        it("should handle model not found errors", async () => {
            mockOllamaInstance.chat.mockRejectedValue(new Error("model not found"))

            const client = new OllamaClient(defaultConfig)

            await expect(client.chat([createUserMessage("Hello")])).rejects.toThrow(/not found/)
        })
    })

    describe("countTokens", () => {
        it("should estimate tokens for text", async () => {
            const client = new OllamaClient(defaultConfig)

            const count = await client.countTokens("Hello, world!")

            expect(count).toBeGreaterThan(0)
            expect(typeof count).toBe("number")
        })
    })

    describe("isAvailable", () => {
        it("should return true when Ollama is available", async () => {
            const client = new OllamaClient(defaultConfig)

            const available = await client.isAvailable()

            expect(available).toBe(true)
        })

        it("should return false when Ollama is not available", async () => {
            mockOllamaInstance.list.mockRejectedValue(new Error("Connection refused"))

            const client = new OllamaClient(defaultConfig)

            const available = await client.isAvailable()

            expect(available).toBe(false)
        })
    })

    describe("getModelName", () => {
        it("should return configured model name", () => {
            const client = new OllamaClient(defaultConfig)

            expect(client.getModelName()).toBe("qwen2.5-coder:7b-instruct")
        })
    })

    describe("getContextWindowSize", () => {
        it("should return configured context window size", () => {
            const client = new OllamaClient(defaultConfig)

            expect(client.getContextWindowSize()).toBe(128000)
        })
    })

    describe("pullModel", () => {
        it("should pull model successfully", async () => {
            const client = new OllamaClient(defaultConfig)

            await expect(client.pullModel("llama2")).resolves.toBeUndefined()
            expect(mockOllamaInstance.pull).toHaveBeenCalledWith({
                model: "llama2",
                stream: false,
            })
        })

        it("should throw on pull failure", async () => {
            mockOllamaInstance.pull.mockRejectedValue(new Error("Network error"))

            const client = new OllamaClient(defaultConfig)

            await expect(client.pullModel("llama2")).rejects.toThrow(IpuaroError)
        })
    })

    describe("hasModel", () => {
        it("should return true for available model", async () => {
            const client = new OllamaClient(defaultConfig)

            const has = await client.hasModel("qwen2.5-coder:7b-instruct")

            expect(has).toBe(true)
        })

        it("should return true for model prefix", async () => {
            const client = new OllamaClient(defaultConfig)

            const has = await client.hasModel("llama2")

            expect(has).toBe(true)
        })

        it("should return false for missing model", async () => {
            const client = new OllamaClient(defaultConfig)

            const has = await client.hasModel("unknown-model")

            expect(has).toBe(false)
        })

        it("should return false when list fails", async () => {
            mockOllamaInstance.list.mockRejectedValue(new Error("Error"))

            const client = new OllamaClient(defaultConfig)

            const has = await client.hasModel("any-model")

            expect(has).toBe(false)
        })
    })

    describe("listModels", () => {
        it("should return list of model names", async () => {
            const client = new OllamaClient(defaultConfig)

            const models = await client.listModels()

            expect(models).toContain("qwen2.5-coder:7b-instruct")
            expect(models).toContain("llama2:latest")
        })

        it("should throw on list failure", async () => {
            mockOllamaInstance.list.mockRejectedValue(new Error("Network error"))

            const client = new OllamaClient(defaultConfig)

            await expect(client.listModels()).rejects.toThrow(IpuaroError)
        })
    })

    describe("abort", () => {
        it("should not throw when no request is in progress", () => {
            const client = new OllamaClient(defaultConfig)

            expect(() => client.abort()).not.toThrow()
        })
    })

    describe("message conversion", () => {
        it("should convert system messages", async () => {
            const client = new OllamaClient(defaultConfig)
            const messages = [
                {
                    role: "system" as const,
                    content: "You are a helpful assistant",
                    timestamp: Date.now(),
                },
            ]

            await client.chat(messages)

            expect(mockOllamaInstance.chat).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages: expect.arrayContaining([
                        expect.objectContaining({
                            role: "system",
                            content: "You are a helpful assistant",
                        }),
                    ]),
                }),
            )
        })

        it("should convert tool result messages", async () => {
            const client = new OllamaClient(defaultConfig)
            const messages = [
                {
                    role: "tool" as const,
                    content: '{"result": "success"}',
                    timestamp: Date.now(),
                    toolResults: [
                        { callId: "call_1", success: true, data: "success", executionTimeMs: 10 },
                    ],
                },
            ]

            await client.chat(messages)

            expect(mockOllamaInstance.chat).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages: expect.arrayContaining([
                        expect.objectContaining({
                            role: "tool",
                            content: '{"result": "success"}',
                        }),
                    ]),
                }),
            )
        })

        it("should convert assistant messages with tool calls", async () => {
            const client = new OllamaClient(defaultConfig)
            const messages = [
                {
                    role: "assistant" as const,
                    content: "I will read the file",
                    timestamp: Date.now(),
                    toolCalls: [{ id: "call_1", name: "get_lines", params: { path: "test.ts" } }],
                },
            ]

            await client.chat(messages)

            expect(mockOllamaInstance.chat).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages: expect.arrayContaining([
                        expect.objectContaining({
                            role: "assistant",
                            content: "I will read the file",
                            tool_calls: expect.arrayContaining([
                                expect.objectContaining({
                                    function: expect.objectContaining({
                                        name: "get_lines",
                                        arguments: { path: "test.ts" },
                                    }),
                                }),
                            ]),
                        }),
                    ]),
                }),
            )
        })
    })

    describe("response handling", () => {
        it("should estimate tokens when eval_count is undefined", async () => {
            mockOllamaInstance.chat.mockResolvedValue({
                message: {
                    role: "assistant",
                    content: "Hello world response",
                    tool_calls: undefined,
                },
                eval_count: undefined,
                done_reason: "stop",
            })

            const client = new OllamaClient(defaultConfig)
            const response = await client.chat([createUserMessage("Hello")])

            expect(response.tokens).toBeGreaterThan(0)
        })

        it("should return length stop reason", async () => {
            mockOllamaInstance.chat.mockResolvedValue({
                message: {
                    role: "assistant",
                    content: "Truncated...",
                    tool_calls: undefined,
                },
                eval_count: 100,
                done_reason: "length",
            })

            const client = new OllamaClient(defaultConfig)
            const response = await client.chat([createUserMessage("Hello")])

            expect(response.stopReason).toBe("length")
        })
    })


    describe("error handling", () => {
        it("should handle ECONNREFUSED errors", async () => {
            mockOllamaInstance.chat.mockRejectedValue(new Error("ECONNREFUSED"))

            const client = new OllamaClient(defaultConfig)

            await expect(client.chat([createUserMessage("Hello")])).rejects.toThrow(
                /Cannot connect to Ollama/,
            )
        })

        it("should handle generic errors with context", async () => {
            mockOllamaInstance.pull.mockRejectedValue(new Error("Unknown error"))

            const client = new OllamaClient(defaultConfig)

            await expect(client.pullModel("test")).rejects.toThrow(/Failed to pull model/)
        })

        it("should handle AbortError correctly", async () => {
            const abortError = new Error("aborted")
            abortError.name = "AbortError"
            mockOllamaInstance.chat.mockRejectedValue(abortError)

            const client = new OllamaClient(defaultConfig)

            await expect(client.chat([createUserMessage("Hello")])).rejects.toThrow(/Request was aborted/)
        })

        it("should handle model not found errors", async () => {
            mockOllamaInstance.chat.mockRejectedValue(new Error("model 'unknown' not found"))

            const client = new OllamaClient(defaultConfig)

            await expect(client.chat([createUserMessage("Hello")])).rejects.toThrow(/Model.*not found/)
        })
    })
})
